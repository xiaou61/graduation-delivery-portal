"use server";

import { unlink } from "fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdminSession,
  verifyAdminCredentials
} from "@/src/lib/auth";
import {
  mutateDatabase,
  newId,
  newShareToken,
  nowIso
} from "@/src/lib/db";
import { clampProgress, makeOrderCode } from "@/src/lib/format";
import { getUploadPath, saveUploadedFile } from "@/src/lib/storage";
import type { Database, Material } from "@/src/lib/types";
import {
  feedbackUpdateSchema,
  formCheckbox,
  formValue,
  materialSchema,
  orderSchema,
  progressSchema
} from "@/src/lib/validators";

export async function loginAction(formData: FormData) {
  const username = formValue(formData, "username") || "";
  const password = formValue(formData, "password") || "";
  if (!verifyAdminCredentials(username, password)) {
    redirect("/admin/login?error=1");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function createOrderAction(formData: FormData) {
  await requireAdminSession();

  const parsed = orderSchema.parse({
    customerName: formValue(formData, "customerName"),
    projectTitle: formValue(formData, "projectTitle"),
    status: formValue(formData, "status") || "in_progress",
    progress: formValue(formData, "progress") || "0",
    dueDate: formValue(formData, "dueDate"),
    customerNote: formValue(formData, "customerNote"),
    adminNote: formValue(formData, "adminNote"),
    shareEnabled: formCheckbox(formData, "shareEnabled"),
    shareExpiresAt: formValue(formData, "shareExpiresAt")
  });

  const orderId = newId();
  const createdAt = nowIso();

  await mutateDatabase((database) => {
    database.orders.unshift({
      id: orderId,
      customerName: parsed.customerName,
      projectTitle: parsed.projectTitle,
      orderCode: makeOrderCode(),
      status: parsed.status,
      progress: clampProgress(parsed.progress),
      dueDate: parsed.dueDate,
      shareToken: newShareToken(),
      shareEnabled: parsed.shareEnabled,
      shareExpiresAt: parsed.shareExpiresAt || undefined,
      customerNote: parsed.customerNote,
      adminNote: parsed.adminNote,
      createdAt,
      updatedAt: createdAt
    });
  });

  revalidatePath("/admin");
  redirect(`/admin/orders/${orderId}`);
}

export async function updateOrderAction(orderId: string, formData: FormData) {
  await requireAdminSession();

  const parsed = orderSchema.parse({
    customerName: formValue(formData, "customerName"),
    projectTitle: formValue(formData, "projectTitle"),
    status: formValue(formData, "status") || "in_progress",
    progress: formValue(formData, "progress") || "0",
    dueDate: formValue(formData, "dueDate"),
    customerNote: formValue(formData, "customerNote"),
    adminNote: formValue(formData, "adminNote"),
    shareEnabled: formCheckbox(formData, "shareEnabled"),
    shareExpiresAt: formValue(formData, "shareExpiresAt")
  });

  await mutateDatabase((database) => {
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) throw new Error("项目不存在");
    order.customerName = parsed.customerName;
    order.projectTitle = parsed.projectTitle;
    order.status = parsed.status;
    order.progress = clampProgress(parsed.progress);
    order.dueDate = parsed.dueDate;
    order.customerNote = parsed.customerNote;
    order.adminNote = parsed.adminNote;
    order.shareEnabled = parsed.shareEnabled;
    order.shareExpiresAt = parsed.shareExpiresAt || undefined;
    order.updatedAt = nowIso();
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function regenerateShareTokenAction(orderId: string) {
  await requireAdminSession();

  await mutateDatabase((database) => {
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) throw new Error("项目不存在");
    order.shareToken = newShareToken();
    order.updatedAt = nowIso();
  });

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function createMaterialAction(orderId: string, formData: FormData) {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("请选择材料文件");
  }

  const parsed = materialSchema.parse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    category: formValue(formData, "category"),
    visible: formCheckbox(formData, "visible"),
    version: formValue(formData, "version"),
    releaseNotes: formValue(formData, "releaseNotes"),
    isLatest: formCheckbox(formData, "isLatest")
  });

  const stored = await saveUploadedFile(file, "material");
  const createdAt = nowIso();

  await mutateDatabase((database) => {
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) throw new Error("项目不存在");

    const version =
      parsed.category === "program"
        ? parsed.version || nextProgramVersion(database.materials, orderId)
        : parsed.version || undefined;
    const shouldBeLatest = parsed.category === "program" && parsed.isLatest;

    if (shouldBeLatest) {
      database.materials.forEach((item) => {
        if (item.orderId === orderId && item.category === "program") {
          item.isLatest = false;
        }
      });
    }

    database.materials.unshift({
      id: newId(),
      orderId,
      category: parsed.category,
      title: parsed.title,
      description: parsed.description,
      originalName: stored.originalName,
      storedName: stored.storedName,
      mimeType: stored.mimeType,
      size: stored.size,
      visible: parsed.visible,
      version,
      releaseNotes: parsed.releaseNotes,
      isLatest: shouldBeLatest,
      createdAt,
      updatedAt: createdAt
    });
    order.updatedAt = createdAt;
  });

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function toggleMaterialVisibilityAction(
  orderId: string,
  materialId: string
) {
  await requireAdminSession();

  await mutateDatabase((database) => {
    const material = database.materials.find((item) => item.id === materialId);
    if (!material || material.orderId !== orderId) throw new Error("材料不存在");
    const updatedAt = nowIso();
    material.visible = !material.visible;
    material.updatedAt = updatedAt;
    touchOrder(database, orderId, updatedAt);
  });

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function deleteMaterialAction(orderId: string, materialId: string) {
  await requireAdminSession();

  let storedName: string | undefined;
  await mutateDatabase((database) => {
    const index = database.materials.findIndex(
      (item) => item.id === materialId && item.orderId === orderId
    );
    if (index === -1) throw new Error("材料不存在");
    storedName = database.materials[index]?.storedName;
    database.materials.splice(index, 1);
    touchOrder(database, orderId);
  });

  if (storedName) {
    try {
      await unlink(getUploadPath(storedName));
    } catch {
      // The database state is more important than a missing local demo file.
    }
  }

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function createProgressAction(orderId: string, formData: FormData) {
  await requireAdminSession();

  const parsed = progressSchema.parse({
    title: formValue(formData, "title"),
    content: formValue(formData, "content"),
    stage: formValue(formData, "stage"),
    visibleToCustomer: formCheckbox(formData, "visibleToCustomer")
  });

  const createdAt = nowIso();

  await mutateDatabase((database) => {
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) throw new Error("项目不存在");
    database.progressEntries.unshift({
      id: newId(),
      orderId,
      title: parsed.title,
      content: parsed.content,
      stage: parsed.stage,
      visibleToCustomer: parsed.visibleToCustomer,
      createdAt
    });
    order.updatedAt = createdAt;
  });

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateFeedbackAction(
  orderId: string,
  feedbackId: string,
  formData: FormData
) {
  await requireAdminSession();

  const parsed = feedbackUpdateSchema.parse({
    status: formValue(formData, "status"),
    adminReply: formValue(formData, "adminReply"),
    fixedVersion: formValue(formData, "fixedVersion")
  });

  await mutateDatabase((database) => {
    const feedback = database.feedbackItems.find(
      (item) => item.id === feedbackId && item.orderId === orderId
    );
    if (!feedback) throw new Error("反馈不存在");
    const updatedAt = nowIso();
    feedback.status = parsed.status;
    feedback.adminReply = parsed.adminReply;
    feedback.fixedVersion = parsed.fixedVersion || undefined;
    feedback.updatedAt = updatedAt;
    touchOrder(database, orderId, updatedAt);
  });

  revalidatePath(`/admin/orders/${orderId}`);
}

function nextProgramVersion(materials: Material[], orderId: string) {
  const versions = materials
    .filter((item) => item.orderId === orderId && item.category === "program")
    .map((item) => item.version)
    .filter(Boolean)
    .map((version) => version?.match(/^v(\d+)\.(\d+)\.(\d+)$/))
    .filter(Boolean)
    .map((match) => Number(match?.[3] || 0));

  const nextPatch = versions.length ? Math.max(...versions) + 1 : 1;
  return `v0.0.${nextPatch}`;
}

function touchOrder(database: Database, orderId: string, updatedAt = nowIso()) {
  const order = database.orders.find((item) => item.id === orderId);
  if (order) order.updatedAt = updatedAt;
}
