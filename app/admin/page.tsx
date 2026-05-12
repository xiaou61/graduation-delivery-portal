import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  Clock3,
  FileArchive,
  Gauge,
  Plus,
  Users
} from "lucide-react";
import { requireAdminSession } from "@/src/lib/auth";
import { readDatabase } from "@/src/lib/db";
import { AdminShell } from "@/src/components/admin-shell";
import { OrderStatusBadge, SeverityBadge } from "@/src/components/badges";
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
  const waitingFeedbackOrders = activeOrders.filter(
    (item) => item.status === "waiting_feedback"
  );
  const openFeedback = database.feedbackItems
    .filter((item) => item.status !== "fixed" && item.status !== "rejected")
    .sort((a, b) => {
      const severityScore = getSeverityScore(b.severity) - getSeverityScore(a.severity);
      if (severityScore !== 0) return severityScore;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  const ordersById = new Map(database.orders.map((item) => [item.id, item]));
  const recentOrders = [...database.orders].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const latestAccessByOrder = new Map<string, string>();
  for (const log of database.accessLogs) {
    if (!latestAccessByOrder.has(log.orderId)) {
      latestAccessByOrder.set(log.orderId, log.createdAt);
    }
  }

  return (
    <AdminShell>
      <div className="page-title">
        <div>
          <h1>交付运营看板</h1>
          <p>先看风险项目和待处理反馈，再进入具体项目推进版本交付与客户协作。</p>
        </div>
        <Link className="primary-button" href="/admin/orders/new">
          <Plus size={18} />
          新建项目
        </Link>
      </div>

      <section className="metrics">
        <Metric
          hint="未归档项目"
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
          hint={`${waitingFeedbackOrders.length} 个项目正在等客户确认`}
          icon={<Bug size={18} />}
          label="待闭环反馈"
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
          hint="客户仍需验证或回复"
          label="待客户确认"
          value={waitingFeedbackOrders.length}
          icon={<Clock3 size={18} />}
        />
        <Metric
          hint="全部资料与版本"
          label="已上传材料"
          value={database.materials.length}
          icon={<FileArchive size={18} />}
        />
      </section>

      <div className="grid-two dashboard-priority-grid">
        <section className="panel">
          <div className="portal-title-row">
            <div>
              <h2>优先处理的反馈</h2>
              <p className="section-copy">先处理高优先级、最近刚更新、还没有闭环的问题。</p>
            </div>
          </div>
          <div className="feedback-list">
            {openFeedback.slice(0, 6).map((feedback) => {
              const order = ordersById.get(feedback.orderId);
              if (!order) return null;

              return (
                <article className="feedback-item" key={feedback.id}>
                  <div className="item-title-row">
                    <strong>{feedback.title}</strong>
                    <SeverityBadge severity={feedback.severity} />
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p>{feedback.description}</p>
                  <div className="ops-meta-row">
                    <span>{order.projectTitle}</span>
                    <span>{feedbackStatusText(feedback.status)}</span>
                    <span>更新于 {formatDateTime(feedback.updatedAt)}</span>
                  </div>
                  <Link className="ghost-button inline-cta" href={`/admin/orders/${order.id}`}>
                    去处理这条反馈
                    <ArrowRight size={16} />
                  </Link>
                </article>
              );
            })}
            {!openFeedback.length ? (
              <p className="empty-text">当前没有待处理反馈，交付节奏不错。</p>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="portal-title-row">
            <div>
              <h2>风险与待确认项目</h2>
              <p className="section-copy">这几个项目更容易拖延，或正卡在客户确认阶段。</p>
            </div>
          </div>
          <div className="timeline-list">
            {activeOrders
              .filter((order) => {
                const days = getDaysUntilDue(order.dueDate);
                return order.status === "waiting_feedback" || (days !== null && days <= 7);
              })
              .slice(0, 6)
              .map((order) => (
                <article className="timeline-item" key={order.id}>
                  <div className="item-title-row">
                    <strong>{order.projectTitle}</strong>
                    <OrderStatusBadge status={order.status} />
                    <DueBadge dueDate={order.dueDate} status={order.status} />
                  </div>
                  <p>
                    {order.customerName} · 最近客户动作{" "}
                    {latestAccessByOrder.get(order.id)
                      ? formatDateTime(latestAccessByOrder.get(order.id)!)
                      : "暂无记录"}
                  </p>
                  <Link className="ghost-button inline-cta" href={`/admin/orders/${order.id}`}>
                    进入项目工作区
                    <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            {!activeOrders.some((order) => {
              const days = getDaysUntilDue(order.dueDate);
              return order.status === "waiting_feedback" || (days !== null && days <= 7);
            }) ? <p className="empty-text">当前没有明显风险项目。</p> : null}
          </div>
        </section>
      </div>

      <div className="grid-two">
        <section className="panel">
          <div className="portal-title-row">
            <div>
              <h2>项目列表</h2>
              <p className="section-copy">每个项目都附带一个交付建议动作，方便你快速切入。</p>
            </div>
          </div>
          <div className="item-list">
            {recentOrders.map((order) => (
              <Link
                className="list-item order-list-item"
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
                  <div className="ops-meta-row">
                    <span>{getNextActionLabel(order.status, order.progress)}</span>
                    <span>
                      最近客户动作{" "}
                      {latestAccessByOrder.get(order.id)
                        ? formatDateTime(latestAccessByOrder.get(order.id)!)
                        : "暂无"}
                    </span>
                  </div>
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
          <div className="portal-title-row">
            <div>
              <h2>最近客户动作</h2>
              <p className="section-copy">访问和下载行为能帮你判断客户是否已经开始验证。</p>
            </div>
          </div>
          <div className="timeline-list">
            {database.accessLogs.slice(0, 8).map((log) => {
              const order = ordersById.get(log.orderId);
              return (
                <article className="timeline-item" key={log.id}>
                  <strong>
                    {log.type === "view" ? "客户访问了门户" : "客户下载了交付资料"}
                  </strong>
                  <p>{order?.projectTitle || "未知项目"}</p>
                  <small>{formatDateTime(log.createdAt)}</small>
                </article>
              );
            })}
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

function getSeverityScore(severity: "low" | "medium" | "high" | "blocker") {
  switch (severity) {
    case "blocker":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function feedbackStatusText(status: "new" | "reviewed" | "in_progress" | "fixed" | "rejected") {
  switch (status) {
    case "new":
      return "等待分派";
    case "reviewed":
      return "已受理";
    case "in_progress":
      return "修复中";
    case "fixed":
      return "待客户复测";
    default:
      return "已关闭";
  }
}

function getNextActionLabel(
  status: "in_progress" | "waiting_feedback" | "delivered" | "archived",
  progress: number
) {
  if (status === "waiting_feedback") return "下一步：推动客户确认结果";
  if (status === "delivered") return "下一步：关注上线后反馈";
  if (progress >= 80) return "下一步：整理交付说明并准备验收";
  if (progress >= 40) return "下一步：补齐版本说明与验证反馈";
  return "下一步：继续推进开发与交付准备";
}
