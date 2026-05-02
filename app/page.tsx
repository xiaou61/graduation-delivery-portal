import Link from "next/link";
import { ArrowRight, LayoutDashboard, LinkIcon } from "lucide-react";
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
            <p className="meta-row">毕业设计交付 · 材料下载 · 程序版本 · Bug 反馈</p>
            <h1>把每个客户的交付材料放进一个专属链接。</h1>
            <p>
              后台先新建项目，再上传论文、程序版本和其他资料；客户用链接查看进度、下载文件、
              按条提交程序问题。程序材料支持 v0.0.1、v0.0.2 这样的版本更新记录。
            </p>
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
            <div className="panel">
              <div className="portal-title-row">
                <div>
                  <strong>{sampleOrder.orderCode}</strong>
                  <h2>{sampleOrder.projectTitle}</h2>
                </div>
                <OrderStatusBadge status={sampleOrder.status} />
              </div>
              <ProgressBar value={sampleOrder.progress} />
              <p>示例客户：{sampleOrder.customerName}</p>
              <p>交付日期：{sampleOrder.dueDate}</p>
              <Link className="ghost-button" href={`/admin/orders/${sampleOrder.id}`}>
                打开这个项目
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
