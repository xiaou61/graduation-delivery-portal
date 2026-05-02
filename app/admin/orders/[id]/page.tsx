import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ExternalLink, RotateCcw, Send, Upload } from "lucide-react";
import {
  createMaterialAction,
  createProgressAction,
  regenerateShareTokenAction,
  updateFeedbackAction,
  updateOrderAction
} from "@/src/actions/admin";
import { requireAdminSession } from "@/src/lib/auth";
import { getOrderBundle } from "@/src/lib/db";
import {
  feedbackStatusLabels,
  formatDate,
  formatDateTime,
  materialCategoryLabels,
  severityLabels
} from "@/src/lib/format";
import { AdminShell } from "@/src/components/admin-shell";
import {
  FeedbackStatusBadge,
  OrderStatusBadge,
  SeverityBadge
} from "@/src/components/badges";
import { OrderFields } from "@/src/components/forms";
import { AdminMaterialList } from "@/src/components/material-list";
import { ProgressBar } from "@/src/components/progress-bar";
import { CopyLinkButton } from "@/src/components/copy-link-button";
import { SubmitButton } from "@/src/components/submit-button";
import type { FeedbackStatus } from "@/src/lib/types";

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const bundle = await getOrderBundle(id);
  if (!bundle) notFound();

  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") || "http";
  const sharePath = `/share/${bundle.order.shareToken}`;
  const shareUrl = `${proto}://${host}${sharePath}`;
  const visibleMaterials = bundle.materials.filter((item) => item.visible);
  const programVersions = bundle.materials.filter((item) => item.category === "program");
  const latestProgram =
    programVersions.find((item) => item.isLatest) || programVersions[0];
  const openFeedbackItems = bundle.feedbackItems.filter(
    (item) => item.status !== "fixed" && item.status !== "rejected"
  );
  const visibleProgressEntries = bundle.progressEntries.filter(
    (item) => item.visibleToCustomer
  );
  const lastActivityAt = getLastActivityAt([
    bundle.order.updatedAt,
    ...bundle.materials.map((item) => item.updatedAt),
    ...bundle.progressEntries.map((item) => item.createdAt),
    ...bundle.feedbackItems.map((item) => item.updatedAt),
    ...bundle.accessLogs.map((item) => item.createdAt)
  ]);
  const shareStatus = getShareStatus(
    bundle.order.shareEnabled,
    bundle.order.shareExpiresAt
  );
  const attachmentMap = new Map(
    bundle.feedbackItems.map((feedback) => [
      feedback.id,
      bundle.feedbackAttachments.filter((item) => item.feedbackId === feedback.id)
    ])
  );

  return (
    <AdminShell>
      <div className="page-title">
        <div>
          <div className="meta-row">
            <span>{bundle.order.orderCode}</span>
            <OrderStatusBadge status={bundle.order.status} />
          </div>
          <h1>{bundle.order.projectTitle}</h1>
          <p>
            {bundle.order.customerName} · 交付日期 {bundle.order.dueDate}
          </p>
        </div>
        <Link className="secondary-button" href={sharePath} target="_blank">
          <ExternalLink size={18} />
          打开客户页
        </Link>
      </div>

      <section className="panel">
        <div className="portal-title-row">
          <h2>整体进度</h2>
          <strong>{bundle.order.progress}%</strong>
        </div>
        <ProgressBar value={bundle.order.progress} />
      </section>

      <section className="metrics compact-metrics">
        <SummaryCard
          label="最新程序"
          value={latestProgram?.version || "未上传"}
          hint={latestProgram?.title || "上传程序包后自动记录版本"}
        />
        <SummaryCard
          label="客户可见材料"
          value={visibleMaterials.length}
          hint={`共 ${bundle.materials.length} 份材料`}
        />
        <SummaryCard
          label="待处理反馈"
          value={openFeedbackItems.length}
          hint={`${bundle.feedbackItems.length} 条反馈记录`}
          tone={openFeedbackItems.length ? "danger" : "default"}
        />
        <SummaryCard
          label="客户可见进度"
          value={visibleProgressEntries.length}
          hint={lastActivityAt ? `最近 ${formatDateTime(lastActivityAt)}` : "暂无活动"}
          tone="blue"
        />
      </section>

      <div className="grid-two">
        <div>
          <section className="panel">
            <h2>项目信息</h2>
            <form action={updateOrderAction.bind(null, bundle.order.id)}>
              <OrderFields order={bundle.order} />
              <SubmitButton className="primary-button" pendingLabel="保存中...">
                保存项目
              </SubmitButton>
            </form>
          </section>

          <section className="panel">
            <div className="portal-title-row">
              <h2>材料与程序版本</h2>
              <span className="empty-text">按上传时间倒序</span>
            </div>
            <form action={createMaterialAction.bind(null, bundle.order.id)}>
              <div className="form-grid">
                <label>
                  材料标题
                  <input name="title" required placeholder="例如：程序交付包" />
                </label>
                <label>
                  分类
                  <select name="category" defaultValue="program">
                    {Object.entries(materialCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  程序版本号
                  <input name="version" placeholder="留空自动生成 v0.0.x" />
                </label>
                <label>
                  文件
                  <input name="file" type="file" required />
                </label>
              </div>
              <label>
                描述
                <textarea name="description" rows={2} placeholder="这份材料是什么。" />
              </label>
              <label>
                版本更新内容
                <textarea
                  name="releaseNotes"
                  rows={3}
                  placeholder="例如：修复登录跳转；新增导出；已知问题：..."
                />
              </label>
              <div className="button-row">
                <label className="check-row">
                  <input name="visible" type="checkbox" defaultChecked />
                  客户可见
                </label>
                <label className="check-row">
                  <input name="isLatest" type="checkbox" defaultChecked />
                  标记为最新程序版本
                </label>
              </div>
              <SubmitButton className="primary-button" pendingLabel="上传中...">
                <Upload size={18} />
                上传材料
              </SubmitButton>
            </form>
            <AdminMaterialList orderId={bundle.order.id} materials={bundle.materials} />
          </section>

          <section className="panel">
            <h2>进度更新</h2>
            <form action={createProgressAction.bind(null, bundle.order.id)}>
              <div className="form-grid">
                <label>
                  阶段
                  <input name="stage" required placeholder="例如：程序更新" />
                </label>
                <label>
                  标题
                  <input name="title" required placeholder="例如：v0.0.3 已发布" />
                </label>
              </div>
              <label>
                内容
                <textarea name="content" rows={3} required />
              </label>
              <label className="check-row">
                <input name="visibleToCustomer" type="checkbox" defaultChecked />
                客户可见
              </label>
              <SubmitButton className="primary-button" pendingLabel="发布中...">
                <Send size={18} />
                发布进度
              </SubmitButton>
            </form>
            <div className="timeline-list">
              {bundle.progressEntries.map((entry) => (
                <article className="timeline-item" key={entry.id}>
                  <div className="item-title-row">
                    <strong>{entry.title}</strong>
                    <span className="muted-pill">{entry.stage}</span>
                    {!entry.visibleToCustomer ? (
                      <span className="muted-pill">后台可见</span>
                    ) : null}
                  </div>
                  <p>{entry.content}</p>
                  <small>{formatDateTime(entry.createdAt)}</small>
                </article>
              ))}
              {!bundle.progressEntries.length ? (
                <p className="empty-text">还没有进度更新。</p>
              ) : null}
            </div>
          </section>
        </div>

        <aside>
          <section className="panel">
            <div className="portal-title-row">
              <h2>客户专属链接</h2>
              <form action={regenerateShareTokenAction.bind(null, bundle.order.id)}>
                <button
                  aria-label="重置客户专属链接"
                  className="icon-button"
                  type="submit"
                  title="重置链接"
                >
                  <RotateCcw size={17} />
                </button>
              </form>
            </div>
            <div className="share-box">
              <span>{shareUrl}</span>
              <CopyLinkButton value={shareUrl} />
            </div>
            <p className="empty-text">
              {shareStatus}。重置后旧链接会立即失效。
            </p>
          </section>

          <section className="panel">
            <h2>Bug 反馈</h2>
            <div className="feedback-list">
              {bundle.feedbackItems.map((feedback) => (
                <article className="feedback-item" key={feedback.id}>
                  <div className="item-title-row">
                    <strong>{feedback.title}</strong>
                    <FeedbackStatusBadge status={feedback.status} />
                    <SeverityBadge severity={feedback.severity} />
                  </div>
                  <p>{feedback.description}</p>
                  <small>{formatDateTime(feedback.createdAt)}</small>
                  {(attachmentMap.get(feedback.id) || []).map((attachment) => (
                    <p key={attachment.id}>
                      <Link
                        className="ghost-button"
                        href={`/api/attachments/${attachment.id}`}
                      >
                        查看附件：{attachment.originalName}
                      </Link>
                    </p>
                  ))}
                  <form
                    action={updateFeedbackAction.bind(
                      null,
                      bundle.order.id,
                      feedback.id
                    )}
                  >
                    <label>
                      状态
                      <select name="status" defaultValue={feedback.status}>
                        {Object.entries(feedbackStatusLabels).map(([value, label]) => (
                          <option key={value} value={value as FeedbackStatus}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      修复版本
                      <input
                        name="fixedVersion"
                        defaultValue={feedback.fixedVersion || ""}
                        placeholder="例如：v0.0.3"
                      />
                    </label>
                    <label>
                      回复客户
                      <textarea
                        name="adminReply"
                        rows={3}
                        defaultValue={feedback.adminReply || ""}
                      />
                    </label>
                    <SubmitButton className="secondary-button" pendingLabel="更新中...">
                      更新反馈
                    </SubmitButton>
                  </form>
                </article>
              ))}
              {!bundle.feedbackItems.length ? (
                <p className="empty-text">客户提交 Bug 后会出现在这里。</p>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <h2>访问与下载记录</h2>
            <div className="timeline-list">
              {bundle.accessLogs.slice(0, 10).map((log) => (
                <article className="timeline-item" key={log.id}>
                  <strong>{log.type === "view" ? "访问客户页" : "下载材料"}</strong>
                  <p>{formatDateTime(log.createdAt)}</p>
                </article>
              ))}
              {!bundle.accessLogs.length ? (
                <p className="empty-text">暂无访问记录。</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: number | string;
  hint: string;
  tone?: "default" | "blue" | "danger";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span className="meta-row">{label}</span>
      <strong>{value}</strong>
      <small className="metric-hint">{hint}</small>
    </article>
  );
}

function getLastActivityAt(values: string[]) {
  const timestamps = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps));
}

function getShareStatus(enabled: boolean, expiresAt?: string) {
  if (!enabled) return "链接已关闭";
  if (!expiresAt) return "链接长期有效";

  const expiresDate = new Date(`${expiresAt.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(expiresDate.getTime())) return "链接有效期未识别";
  if (expiresDate.getTime() < Date.now()) return "链接已过期";
  return `链接有效至 ${formatDate(expiresDate)}`;
}
