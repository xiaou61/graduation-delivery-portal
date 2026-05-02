import Link from "next/link";
import { headers } from "next/headers";
import { AlertCircle, Bug, Download, FileText, PackageCheck } from "lucide-react";
import { submitFeedbackAction } from "@/src/actions/portal";
import {
  getLatestProgramVersions,
  getOrderBundleByToken,
  recordAccessLog
} from "@/src/lib/db";
import {
  feedbackStatusLabels,
  formatDate,
  formatDateTime,
  formatFileSize,
  materialCategoryLabels,
  severityLabels
} from "@/src/lib/format";
import {
  FeedbackStatusBadge,
  MaterialCategoryBadge,
  OrderStatusBadge,
  SeverityBadge
} from "@/src/components/badges";
import { ProgressBar } from "@/src/components/progress-bar";
import { SubmitButton } from "@/src/components/submit-button";
import type { Material, MaterialCategory } from "@/src/lib/types";

export const dynamic = "force-dynamic";

const customerCategories: MaterialCategory[] = ["program", "thesis", "other"];

export default async function SharePortalPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const bundle = await getOrderBundleByToken(token);

  if (!bundle) {
    return (
      <main className="share-page">
        <section className="portal-shell">
          <div className="portal-header">
            <AlertCircle size={36} />
            <h1>链接不可用</h1>
            <p>这个交付链接不存在、已关闭或已过期。请联系交付人员确认最新链接。</p>
          </div>
        </section>
      </main>
    );
  }

  const headerList = await headers();
  await recordAccessLog({
    orderId: bundle.order.id,
    type: "view",
    userAgent: headerList.get("user-agent") || undefined,
    ip: headerList.get("x-forwarded-for") || undefined
  });

  const visibleMaterials = bundle.materials.filter((item) => item.visible);
  const programVersions = getLatestProgramVersions(visibleMaterials);
  const progressEntries = bundle.progressEntries.filter(
    (item) => item.visibleToCustomer
  );
  const attachmentMap = new Map(
    bundle.feedbackItems.map((feedback) => [
      feedback.id,
      bundle.feedbackAttachments.filter((item) => item.feedbackId === feedback.id)
    ])
  );

  return (
    <main className="share-page">
      <div className="portal-shell">
        {query.sent ? <div className="sent-banner">反馈已提交，我会在后台处理。</div> : null}
        <header className="portal-header">
          <div className="portal-title-row">
            <div>
              <div className="meta-row">
                <span>{bundle.order.orderCode}</span>
                <OrderStatusBadge status={bundle.order.status} />
              </div>
              <h1>{bundle.order.projectTitle}</h1>
              <p>
                {bundle.order.customerName} · 预计交付 {formatDate(bundle.order.dueDate)}
              </p>
            </div>
            <strong>{bundle.order.progress}%</strong>
          </div>
          <ProgressBar value={bundle.order.progress} />
          {bundle.order.customerNote ? <p>{bundle.order.customerNote}</p> : null}
        </header>

        <div className="portal-layout">
          <div>
            <section className="panel">
              <div className="portal-title-row">
                <h2>程序版本</h2>
                <PackageCheck size={22} />
              </div>
              <div className="item-list">
                {programVersions.map((item) => (
                  <MaterialDownloadCard key={item.id} material={item} token={token} program />
                ))}
                {!programVersions.length ? (
                  <p className="empty-text">暂无程序版本。</p>
                ) : null}
              </div>
            </section>

            {customerCategories
              .filter((category) => category !== "program")
              .map((category) => {
                const items = visibleMaterials.filter(
                  (item) => item.category === category
                );
                return (
                  <section className="panel" key={category}>
                    <div className="portal-title-row">
                      <h2>{materialCategoryLabels[category]}</h2>
                      <FileText size={22} />
                    </div>
                    <div className="item-list">
                      {items.map((item) => (
                        <MaterialDownloadCard
                          key={item.id}
                          material={item}
                          token={token}
                        />
                      ))}
                      {!items.length ? (
                        <p className="empty-text">这个分类暂时没有可下载材料。</p>
                      ) : null}
                    </div>
                  </section>
                );
              })}

            <section className="panel">
              <h2>进度时间线</h2>
              <div className="timeline-list">
                {progressEntries.map((entry) => (
                  <article className="timeline-item" key={entry.id}>
                    <div className="item-title-row">
                      <strong>{entry.title}</strong>
                      <span className="muted-pill">{entry.stage}</span>
                    </div>
                    <p>{entry.content}</p>
                    <small>{formatDateTime(entry.createdAt)}</small>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside>
            <section className="panel">
              <div className="portal-title-row">
                <h2>提交程序 Bug</h2>
                <Bug size={22} />
              </div>
              <form action={submitFeedbackAction.bind(null, token)}>
                <label>
                  问题标题
                  <input name="title" required placeholder="例如：登录后页面空白" />
                </label>
                <label>
                  严重程度
                  <select name="severity" defaultValue="medium">
                    {Object.entries(severityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  问题描述
                  <textarea
                    name="description"
                    rows={5}
                    required
                    placeholder="尽量写清楚出现步骤、期望效果、实际效果。"
                  />
                </label>
                <label>
                  图片或视频
                  <input
                    name="attachments"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                  />
                </label>
                <SubmitButton className="primary-button" pendingLabel="提交中...">
                  提交反馈
                </SubmitButton>
              </form>
            </section>

            <section className="panel">
              <h2>我的反馈记录</h2>
              <div className="feedback-list">
                {bundle.feedbackItems.map((feedback) => (
                  <article className="feedback-item" key={feedback.id}>
                    <div className="item-title-row">
                      <strong>{feedback.title}</strong>
                      <FeedbackStatusBadge status={feedback.status} />
                      <SeverityBadge severity={feedback.severity} />
                    </div>
                    <p>{feedback.description}</p>
                    {feedback.adminReply ? (
                      <p className="release-notes">回复：{feedback.adminReply}</p>
                    ) : null}
                    {feedback.fixedVersion ? (
                      <p>
                        已关联修复版本：
                        <span className="version-pill">{feedback.fixedVersion}</span>
                      </p>
                    ) : null}
                    {(attachmentMap.get(feedback.id) || []).map((attachment) => (
                      <p key={attachment.id}>
                        <Link
                          className="ghost-button"
                          href={`/api/attachments/${attachment.id}?token=${token}`}
                        >
                          附件：{attachment.originalName}
                        </Link>
                      </p>
                    ))}
                    <small>
                      {feedbackStatusLabels[feedback.status]} ·{" "}
                      {formatDateTime(feedback.updatedAt)}
                    </small>
                  </article>
                ))}
                {!bundle.feedbackItems.length ? (
                  <p className="empty-text">你提交的问题会按条显示在这里。</p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MaterialDownloadCard({
  material,
  token,
  program
}: {
  material: Material;
  token: string;
  program?: boolean;
}) {
  return (
    <article className={`list-item ${program ? "program-card" : ""}`}>
      <div>
        <div className="item-title-row">
          <strong>{material.title}</strong>
          <MaterialCategoryBadge category={material.category} />
          {material.version ? <span className="version-pill">{material.version}</span> : null}
          {material.isLatest ? <span className="latest-pill">最新版本</span> : null}
        </div>
        <p>{material.description || material.originalName}</p>
        {material.releaseNotes ? (
          <p className="release-notes">{material.releaseNotes}</p>
        ) : null}
        <small>
          {formatFileSize(material.size)} · {formatDateTime(material.createdAt)}
        </small>
      </div>
      <Link className="primary-button" href={`/api/files/${material.id}?token=${token}`}>
        <Download size={17} />
        下载
      </Link>
    </article>
  );
}
