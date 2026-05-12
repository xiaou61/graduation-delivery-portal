import Link from "next/link";
import { headers } from "next/headers";
import {
  AlertCircle,
  ArrowRight,
  Bug,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  FolderKanban,
  PackageCheck
} from "lucide-react";
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
  materialCategoryLabels
} from "@/src/lib/format";
import {
  FeedbackStatusBadge,
  MaterialCategoryBadge,
  OrderStatusBadge,
  SeverityBadge
} from "@/src/components/badges";
import { FeedbackAttachmentCard } from "@/src/components/feedback-attachment-card";
import { FeedbackFormPanel } from "@/src/components/feedback-form-panel";
import { ProgressBar } from "@/src/components/progress-bar";
import type {
  FeedbackItem,
  Material,
  MaterialCategory,
  OrderStatus
} from "@/src/lib/types";

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
            <p>这个客户门户不存在、已关闭或已过期。请联系交付人员获取最新链接。</p>
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
  const latestProgram = programVersions[0];
  const progressEntries = bundle.progressEntries.filter(
    (item) => item.visibleToCustomer
  );
  const openFeedbackItems = bundle.feedbackItems.filter(
    (item) => item.status !== "fixed" && item.status !== "rejected"
  );
  const latestVisibleUpdate = progressEntries[0];
  const latestCustomerTouch = bundle.accessLogs[0];
  const attachmentMap = new Map(
    bundle.feedbackItems.map((feedback) => [
      feedback.id,
      bundle.feedbackAttachments.filter((item) => item.feedbackId === feedback.id)
    ])
  );
  const fixedInLatest = latestProgram?.version
    ? bundle.feedbackItems.filter((item) => item.fixedVersion === latestProgram.version).length
    : 0;
  const customerActions = buildCustomerActions({
    latestProgramVersion: latestProgram?.version,
    latestUpdateTitle: latestVisibleUpdate?.title,
    openFeedbackCount: openFeedbackItems.length,
    status: bundle.order.status
  });

  return (
    <main className="share-page">
      <div className="portal-shell">
        {query.sent ? <div className="sent-banner">反馈已提交，交付团队会继续跟进。</div> : null}
        <header className="portal-header portal-hero">
          <div className="portal-hero-grid">
            <div>
              <p className="portal-kicker">客户交付工作台</p>
              <div className="meta-row">
                <span>{bundle.order.orderCode}</span>
                <OrderStatusBadge status={bundle.order.status} />
              </div>
              <h1>{bundle.order.projectTitle}</h1>
              <p>
                {bundle.order.customerName} · 当前交付节点 {formatDate(bundle.order.dueDate)}
              </p>
            </div>
            <div className="portal-progress-summary">
              <span>当前完成度</span>
              <strong>{bundle.order.progress}%</strong>
            </div>
          </div>
          <ProgressBar value={bundle.order.progress} />
          <div className="portal-stats" aria-label="交付概览">
            <span>
              当前推荐版本
              <strong>{latestProgram?.version || "待上传"}</strong>
            </span>
            <span>
              最新更新
              <strong>{latestVisibleUpdate ? formatDate(latestVisibleUpdate.createdAt) : "暂无"}</strong>
            </span>
            <span>
              待处理问题
              <strong>{openFeedbackItems.length}</strong>
            </span>
            <span>
              可下载资料
              <strong>{visibleMaterials.length}</strong>
            </span>
          </div>
          {bundle.order.customerNote ? (
            <p className="customer-note">{bundle.order.customerNote}</p>
          ) : null}
        </header>

        <section className="panel portal-section delivery-focus-panel">
          <div className="delivery-focus-grid">
            <div className="delivery-hero-card">
              <div className="section-heading">
                <div>
                  <span>推荐交付</span>
                  <h2>当前建议你优先查看这个版本</h2>
                </div>
                <PackageCheck size={22} />
              </div>
              {latestProgram ? (
                <>
                  <div className="delivery-version-row">
                    <div>
                      <strong className="delivery-version">{latestProgram.version || "未命名版本"}</strong>
                      <p className="delivery-version-copy">
                        {latestProgram.description || "当前推荐下载版本。"}
                      </p>
                    </div>
                    <Link
                      className="primary-button"
                      href={`/api/files/${latestProgram.id}?token=${token}`}
                    >
                      <Download size={17} />
                      下载推荐版本
                    </Link>
                  </div>
                  {latestProgram.releaseNotes ? (
                    <div className="release-spotlight">
                      <span>本次更新内容</span>
                      <p>{latestProgram.releaseNotes}</p>
                    </div>
                  ) : null}
                  <div className="focus-meta-grid">
                    <span>
                      发布时间
                      <strong>{formatDateTime(latestProgram.createdAt)}</strong>
                    </span>
                    <span>
                      文件大小
                      <strong>{formatFileSize(latestProgram.size)}</strong>
                    </span>
                    <span>
                      关联修复
                      <strong>{fixedInLatest} 项</strong>
                    </span>
                  </div>
                </>
              ) : (
                <p className="empty-text">交付团队还没有上传推荐版本。</p>
              )}
            </div>

            <div className="delivery-actions-card">
              <div className="section-heading">
                <div>
                  <span>你现在可以做什么</span>
                  <h2>下一步动作</h2>
                </div>
                <CheckCircle2 size={22} />
              </div>
              <div className="action-list">
                {customerActions.map((action) => (
                  <article className="action-item" key={action.title}>
                    <strong>{action.title}</strong>
                    <p>{action.description}</p>
                  </article>
                ))}
              </div>
              <div className="focus-meta-grid slim">
                <span>
                  最新动态
                  <strong>{latestVisibleUpdate?.title || "暂无更新"}</strong>
                </span>
                <span>
                  最近记录
                  <strong>
                    {latestCustomerTouch ? formatDateTime(latestCustomerTouch.createdAt) : "首次访问"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="portal-layout">
          <div>
            <section className="panel portal-section">
              <div className="section-heading">
                <div>
                  <span>交付资料</span>
                  <h2>版本与附件</h2>
                </div>
                <FolderKanban size={22} />
              </div>
              <div className="item-list">
                {programVersions.map((item) => (
                  <MaterialDownloadCard key={item.id} material={item} token={token} program />
                ))}
                {!programVersions.length ? (
                  <p className="empty-text">暂无可下载版本。</p>
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
                  <section className="panel portal-section" key={category}>
                    <div className="section-heading">
                      <div>
                        <span>补充资料</span>
                        <h2>{materialCategoryLabels[category]}</h2>
                      </div>
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
                        <p className="empty-text">这个分类暂时没有资料。</p>
                      ) : null}
                    </div>
                  </section>
                );
              })}

            <section className="panel portal-section">
              <div className="section-heading">
                <div>
                  <span>交付动态</span>
                  <h2>最近更新与推进</h2>
                </div>
                <Clock3 size={22} />
              </div>
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
                {!progressEntries.length ? (
                  <p className="empty-text">暂无可见更新。</p>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="portal-sidebar">
            <section className="panel portal-section">
              <div className="section-heading">
                <div>
                  <span>问题协作</span>
                  <h2>提交问题或验收反馈</h2>
                </div>
                <Bug size={22} />
              </div>
              <FeedbackFormPanel
                action={submitFeedbackAction.bind(null, token)}
                hasError={Boolean(query.error)}
              />
            </section>

            <section className="panel portal-section">
              <div className="section-heading">
                <div>
                  <span>处理记录</span>
                  <h2>反馈跟进状态</h2>
                </div>
              </div>
              <div className="feedback-list">
                {bundle.feedbackItems.map((feedback) => {
                  const statusCopy = getCustomerFeedbackCopy(feedback);
                  const attachments = attachmentMap.get(feedback.id) || [];

                  return (
                    <article className="feedback-item" key={feedback.id}>
                      <div className="item-title-row">
                        <strong>{feedback.title}</strong>
                        <FeedbackStatusBadge status={feedback.status} />
                        <SeverityBadge severity={feedback.severity} />
                      </div>
                      <p>{feedback.description}</p>
                      <div className="feedback-callout">
                        <span>{statusCopy.title}</span>
                        <p>{statusCopy.description}</p>
                      </div>
                      {feedback.adminReply ? (
                        <p className="release-notes">交付团队回复：{feedback.adminReply}</p>
                      ) : null}
                      {feedback.fixedVersion ? (
                        <p>
                          已关联修复版本：
                          <span className="version-pill">{feedback.fixedVersion}</span>
                        </p>
                      ) : null}
                      {attachments.length ? (
                        <div className="attachment-history-grid">
                          {attachments.map((attachment) => (
                            <FeedbackAttachmentCard
                              attachment={attachment}
                              href={`/api/attachments/${attachment.id}?token=${token}`}
                              key={attachment.id}
                            />
                          ))}
                        </div>
                      ) : null}
                      <small>
                        {feedbackStatusLabels[feedback.status]} · 最后更新 {formatDateTime(feedback.updatedAt)}
                      </small>
                    </article>
                  );
                })}
                {!bundle.feedbackItems.length ? (
                  <p className="empty-text">还没有反馈记录。</p>
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
    <article className={`list-item download-card ${program ? "program-card" : ""}`}>
      <div className="download-card-body">
        <div className="item-title-row">
          <strong>{material.title}</strong>
          <MaterialCategoryBadge category={material.category} />
          {material.version ? <span className="version-pill">{material.version}</span> : null}
          {material.isLatest ? <span className="latest-pill">推荐版本</span> : null}
        </div>
        <p>{material.description || material.originalName}</p>
        {material.releaseNotes ? (
          <p className="release-notes">{material.releaseNotes}</p>
        ) : null}
        <div className="material-meta">
          <span>{formatFileSize(material.size)}</span>
          <span>{formatDateTime(material.createdAt)}</span>
        </div>
      </div>
      <Link
        className="primary-button download-button"
        href={`/api/files/${material.id}?token=${token}`}
      >
        <Download size={17} />
        下载
      </Link>
    </article>
  );
}

function buildCustomerActions({
  latestProgramVersion,
  latestUpdateTitle,
  openFeedbackCount,
  status
}: {
  latestProgramVersion?: string;
  latestUpdateTitle?: string;
  openFeedbackCount: number;
  status: OrderStatus;
}) {
  const actions = [];

  if (latestProgramVersion) {
    actions.push({
      title: `优先体验 ${latestProgramVersion}`,
      description: "先下载当前推荐版本，按照业务流程走一遍核心操作。"
    });
  }

  actions.push({
    title: openFeedbackCount
      ? `继续关注 ${openFeedbackCount} 条待确认问题`
      : "当前没有待处理问题",
    description: openFeedbackCount
      ? "已提交的问题会持续在右侧状态区更新，验证完成后可以补充确认结果。"
      : "如果这次交付已满足验收，可以把新的体验问题直接提交给交付团队。"
  });

  actions.push({
    title: latestUpdateTitle ? `查看“${latestUpdateTitle}”` : "留意后续交付动态",
    description:
      status === "waiting_feedback"
        ? "交付团队正在等你确认结果，建议优先反馈本次版本是否通过。"
        : "更新区会记录每次变更内容、修复情况和下一步安排。"
  });

  return actions;
}

function getCustomerFeedbackCopy(feedback: FeedbackItem) {
  switch (feedback.status) {
    case "new":
      return {
        title: "已收到",
        description: "交付团队已看到这条反馈，通常会先确认复现路径和影响范围。"
      };
    case "reviewed":
      return {
        title: "已受理",
        description: "问题已经进入跟进队列，后续会继续同步处理进展。"
      };
    case "in_progress":
      return {
        title: "处理中",
        description: "交付团队正在修复或排查中，完成后会关联到对应版本。"
      };
    case "fixed":
      return {
        title: "待你确认",
        description: "修复版本已经准备好，建议下载关联版本再次验证并确认结果。"
      };
    default:
      return {
        title: "已关闭",
        description: "这条反馈暂不继续处理，如有新情况可以补充新的问题描述。"
      };
  }
}
