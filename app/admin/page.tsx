import Link from "next/link";
import {
  AlertTriangle,
  Bug,
  FileArchive,
  Gauge,
  Plus,
  Users
} from "lucide-react";
import { requireAdminSession } from "@/src/lib/auth";
import { readDatabase } from "@/src/lib/db";
import { AdminShell } from "@/src/components/admin-shell";
import { OrderStatusBadge } from "@/src/components/badges";
import { ProgressBar } from "@/src/components/progress-bar";
import { formatDateTime } from "@/src/lib/format";

export default async function AdminDashboardPage() {
  await requireAdminSession();
  const database = await readDatabase();
  const activeOrders = database.orders.filter((item) => item.status !== "archived");
  const averageProgress = activeOrders.length
    ? Math.round(
        activeOrders.reduce((sum, order) => sum + order.progress, 0) /
          activeOrders.length
      )
    : 0;
  const dueRiskOrders = activeOrders.filter((order) => {
    const days = getDaysUntilDue(order.dueDate);
    return days !== null && days <= 7 && order.status !== "delivered";
  });
  const newFeedback = database.feedbackItems.filter((item) => item.status === "new");
  const openFeedback = database.feedbackItems.filter(
    (item) => item.status !== "fixed" && item.status !== "rejected"
  );
  const recentOrders = [...database.orders].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <AdminShell>
      <div className="page-title">
        <div>
          <h1>项目总览</h1>
          <p>以项目为单位管理客户、材料、程序版本、进度和反馈。</p>
        </div>
        <Link className="primary-button" href="/admin/orders/new">
          <Plus size={18} />
          新建项目
        </Link>
      </div>

      <section className="metrics">
        <Metric
          hint="未归档的交付项目"
          icon={<Users size={18} />}
          label="活跃项目"
          value={activeOrders.length}
        />
        <Metric
          hint="活跃项目平均完成度"
          icon={<Gauge size={18} />}
          label="平均进度"
          tone="blue"
          value={`${averageProgress}%`}
        />
        <Metric
          hint={`${newFeedback.length} 条新反馈`}
          icon={<Bug size={18} />}
          label="待处理反馈"
          tone={openFeedback.length ? "danger" : "default"}
          value={openFeedback.length}
        />
        <Metric
          hint="7 天内交付或已逾期"
          icon={<AlertTriangle size={18} />}
          label="交付风险"
          tone={dueRiskOrders.length ? "warning" : "default"}
          value={dueRiskOrders.length}
        />
        <Metric
          hint="全部项目材料"
          label="已上传材料"
          value={database.materials.length}
          icon={<FileArchive size={18} />}
        />
      </section>

      <div className="grid-two">
        <section className="panel">
          <h2>项目列表</h2>
          <div className="item-list">
            {recentOrders.map((order) => (
              <Link
                className="list-item"
                key={order.id}
                href={`/admin/orders/${order.id}`}
              >
                <div>
                  <div className="item-title-row">
                    <strong>{order.projectTitle}</strong>
                    <OrderStatusBadge status={order.status} />
                    <DueBadge dueDate={order.dueDate} status={order.status} />
                  </div>
                  <p>
                    {order.customerName} · {order.orderCode} · 交付 {order.dueDate}
                  </p>
                  <ProgressBar value={order.progress} />
                </div>
                <strong>{order.progress}%</strong>
              </Link>
            ))}
            {!recentOrders.length ? (
              <p className="empty-text">还没有项目，先新建一个交付项目。</p>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <h2>最近活动</h2>
          <div className="timeline-list">
            {database.accessLogs.slice(0, 8).map((log) => (
              <article className="timeline-item" key={log.id}>
                <strong>{log.type === "view" ? "客户访问了链接" : "客户下载了材料"}</strong>
                <p>{formatDateTime(log.createdAt)}</p>
              </article>
            ))}
            {!database.accessLogs.length ? (
              <p className="empty-text">客户访问或下载后，这里会出现记录。</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Metric({
  hint,
  label,
  value,
  icon,
  tone = "default"
}: {
  hint?: string;
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "default" | "blue" | "danger" | "warning";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span className="meta-row">
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
      {hint ? <small className="metric-hint">{hint}</small> : null}
    </article>
  );
}

function DueBadge({
  dueDate,
  status
}: {
  dueDate: string;
  status: "in_progress" | "waiting_feedback" | "delivered" | "archived";
}) {
  const days = getDaysUntilDue(dueDate);
  if (days === null || status === "delivered" || status === "archived") return null;

  if (days < 0) {
    return <span className="due-pill due-danger">逾期 {Math.abs(days)} 天</span>;
  }

  if (days === 0) {
    return <span className="due-pill due-warning">今天交付</span>;
  }

  if (days <= 7) {
    return <span className="due-pill due-warning">剩 {days} 天</span>;
  }

  return null;
}

function getDaysUntilDue(dueDate: string) {
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}
