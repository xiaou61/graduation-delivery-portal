import { z } from "zod";

export const orderSchema = z.object({
  customerName: z.string().trim().min(1, "客户姓名必填").max(60),
  projectTitle: z.string().trim().min(1, "项目标题必填").max(120),
  status: z
    .enum(["in_progress", "waiting_feedback", "delivered", "archived"])
    .default("in_progress"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  dueDate: z.string().trim().min(1, "交付日期必填"),
  customerNote: z.string().trim().max(1000).optional(),
  adminNote: z.string().trim().max(1000).optional(),
  shareEnabled: z.coerce.boolean().default(true),
  shareExpiresAt: z.string().trim().optional()
});

export const materialSchema = z.object({
  title: z.string().trim().min(1, "材料标题必填").max(120),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(["thesis", "program", "other"]),
  visible: z.coerce.boolean().default(true),
  version: z.string().trim().max(30).optional(),
  releaseNotes: z.string().trim().max(2000).optional(),
  isLatest: z.coerce.boolean().default(false)
});

export const progressSchema = z.object({
  title: z.string().trim().min(1, "进度标题必填").max(120),
  content: z.string().trim().min(1, "进度内容必填").max(2000),
  stage: z.string().trim().min(1, "阶段必填").max(60),
  visibleToCustomer: z.coerce.boolean().default(true)
});

export const feedbackSchema = z.object({
  title: z.string().trim().min(1, "问题标题必填").max(120),
  description: z.string().trim().min(1, "问题描述必填").max(3000),
  severity: z.enum(["low", "medium", "high", "blocker"]).default("medium")
});

export const feedbackUpdateSchema = z.object({
  status: z.enum(["new", "reviewed", "in_progress", "fixed", "rejected"]),
  adminReply: z.string().trim().max(2000).optional(),
  fixedVersion: z.string().trim().max(30).optional()
});

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export function formCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

