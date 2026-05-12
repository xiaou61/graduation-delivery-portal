import Link from "next/link";
import {
  ArrowRight,
  Bug,
  FileText,
  LayoutDashboard,
  LinkIcon,
  PackageCheck
} from "lucide-react";
import { readDatabase } from "@/src/lib/db";
import { ProgressBar } from "@/src/components/progress-bar";
import { OrderStatusBadge } from "@/src/components/badges";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const database = await readDatabase();
  const sampleOrder = database.orders[0];

  return (
    <main className="home-shell">
      <div className="home-panel">
        <section className="home-hero">
          <div>
            <p className="meta-row home-kicker">客户交付门户 · 版本管理 · 反馈闭环</p>
            <h1>把版本交付、客户沟通和问题跟进放到同一个工作台里</h1>
            <p>
              为每个项目生成一个专属客户门户，集中展示推荐版本、交付资料、变更说明、
              处理进度和反馈记录。后台面向交付团队，客户页面向验收与协作。
            </p>
            <div className="home-feature-grid" aria-label="核心能力">
              <span>
                <PackageCheck size={17} />
                推荐版本
              </span>
              <span>
                <FileText size={17} />
                交付资料
              </span>
              <span>
                <Bug size={17} />
                处理闭环
              </span>
            </div>
            <div className="hero-actions">
              <Link className="primary-button" href="/admin">
                <LayoutDashboard size={18} />
                进入后台
              </Link>
              {sampleOrder ? (
                <Link className="secondary-button" href={`/share/${sampleOrder.shareToken}`}>
                  <LinkIcon size={18} />
                  查看示例客户链接
                </Link>
              ) : null}
            </div>
          </div>
          {sampleOrder ? (
            <div className="panel home-preview-card">
              <p className="meta-row home-preview-label">示例客户页</p>
              <div className="portal-title-row">
                <div>
                  <strong>{sampleOrder.orderCode}</strong>
                  <h2>{sampleOrder.projectTitle}</h2>
                </div>
                <OrderStatusBadge status={sampleOrder.status} />
              </div>
              <ProgressBar value={sampleOrder.progress} />
              <div className="home-preview-meta">
                <span>客户：{sampleOrder.customerName}</span>
                <span>交付节点：{sampleOrder.dueDate}</span>
                <span>当前完成度：{sampleOrder.progress}%</span>
              </div>
              <Link className="ghost-button" href={`/admin/orders/${sampleOrder.id}`}>
                打开项目工作区
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
