import type {
  FeedbackSeverity,
  FeedbackStatus,
  MaterialCategory,
  OrderStatus
} from "@/src/lib/types";

export const orderStatusLabels: Record<OrderStatus, string> = {
  in_progress: "制作中",
  waiting_feedback: "等待反馈",
  delivered: "已交付",
  archived: "已归档"
};

export const materialCategoryLabels: Record<MaterialCategory, string> = {
  thesis: "论文文件",
  program: "程序版本",
  other: "非论文文件"
};

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  new: "新反馈",
  reviewed: "已查看",
  in_progress: "处理中",
  fixed: "已修复",
  rejected: "不处理"
};

export const severityLabels: Record<FeedbackSeverity, string> = {
  low: "低",
  medium: "中",
  high: "高",
  blocker: "阻塞"
};

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function sortNewestFirst<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function makeOrderCode() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(date.getDate()).padStart(2, "0")}`;
  return `GD-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

