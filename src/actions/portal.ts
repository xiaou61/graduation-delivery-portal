"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getOrderBundleByToken,
  mutateDatabase,
  newId,
  nowIso
} from "@/src/lib/db";
import { saveUploadedFile, type StoredFile } from "@/src/lib/storage";
import { feedbackSchema, formValue } from "@/src/lib/validators";

export async function submitFeedbackAction(token: string, formData: FormData) {
  const bundle = await getOrderBundleByToken(token);
  if (!bundle) {
    redirect(`/share/${token}?error=invalid`);
  }

  const parsed = feedbackSchema.parse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    severity: formValue(formData, "severity") || "medium"
  });

  const files = formData
    .getAll("attachments")
    .filter((item): item is File => item instanceof File && item.size > 0);

  const storedFiles: StoredFile[] = [];
  for (const file of files.slice(0, 5)) {
    storedFiles.push(await saveUploadedFile(file, "feedback"));
  }

  const feedbackId = newId();
  const createdAt = nowIso();

  await mutateDatabase((database) => {
    const order = database.orders.find((item) => item.id === bundle.order.id);
    if (order) order.updatedAt = createdAt;

    database.feedbackItems.unshift({
      id: feedbackId,
      orderId: bundle.order.id,
      title: parsed.title,
      description: parsed.description,
      severity: parsed.severity,
      status: "new",
      createdAt,
      updatedAt: createdAt
    });

    storedFiles.forEach((file) => {
      database.feedbackAttachments.unshift({
        id: newId(),
        feedbackId,
        originalName: file.originalName,
        storedName: file.storedName,
        mimeType: file.mimeType,
        size: file.size,
        createdAt
      });
    });
  });

  revalidatePath(`/share/${token}`);
  redirect(`/share/${token}?sent=1`);
}
