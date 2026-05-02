export type OrderStatus =
  | "in_progress"
  | "waiting_feedback"
  | "delivered"
  | "archived";

export type MaterialCategory = "thesis" | "program" | "other";

export type FeedbackStatus =
  | "new"
  | "reviewed"
  | "in_progress"
  | "fixed"
  | "rejected";

export type FeedbackSeverity = "low" | "medium" | "high" | "blocker";

export type AccessLogType = "view" | "download";

export interface Order {
  id: string;
  customerName: string;
  projectTitle: string;
  orderCode: string;
  status: OrderStatus;
  progress: number;
  dueDate: string;
  shareToken: string;
  shareEnabled: boolean;
  shareExpiresAt?: string;
  customerNote?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  orderId: string;
  category: MaterialCategory;
  title: string;
  description?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  visible: boolean;
  version?: string;
  releaseNotes?: string;
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEntry {
  id: string;
  orderId: string;
  title: string;
  content: string;
  stage: string;
  visibleToCustomer: boolean;
  createdAt: string;
}

export interface FeedbackAttachment {
  id: string;
  feedbackId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  orderId: string;
  title: string;
  description: string;
  severity: FeedbackSeverity;
  status: FeedbackStatus;
  adminReply?: string;
  fixedVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessLog {
  id: string;
  orderId: string;
  type: AccessLogType;
  materialId?: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
}

export interface Database {
  orders: Order[];
  materials: Material[];
  progressEntries: ProgressEntry[];
  feedbackItems: FeedbackItem[];
  feedbackAttachments: FeedbackAttachment[];
  accessLogs: AccessLog[];
}

export interface OrderBundle {
  order: Order;
  materials: Material[];
  progressEntries: ProgressEntry[];
  feedbackItems: FeedbackItem[];
  feedbackAttachments: FeedbackAttachment[];
  accessLogs: AccessLog[];
}

