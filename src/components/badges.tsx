import type {
  FeedbackSeverity,
  FeedbackStatus,
  MaterialCategory,
  OrderStatus
} from "@/src/lib/types";
import {
  feedbackStatusLabels,
  materialCategoryLabels,
  orderStatusLabels,
  severityLabels
} from "@/src/lib/format";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge status-${status}`}>{orderStatusLabels[status]}</span>;
}

export function MaterialCategoryBadge({
  category
}: {
  category: MaterialCategory;
}) {
  return (
    <span className={`badge category-${category}`}>
      {materialCategoryLabels[category]}
    </span>
  );
}

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span className={`badge feedback-${status}`}>
      {feedbackStatusLabels[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: FeedbackSeverity }) {
  return <span className={`badge severity-${severity}`}>{severityLabels[severity]}</span>;
}

