import { createOrderAction } from "@/src/actions/admin";
import { requireAdminSession } from "@/src/lib/auth";
import { AdminShell } from "@/src/components/admin-shell";
import { OrderFields } from "@/src/components/forms";
import { SubmitButton } from "@/src/components/submit-button";
import { FileArchive, MessageSquareWarning, PackageCheck, Send } from "lucide-react";

export default async function NewOrderPage() {
  await requireAdminSession();

  return (
    <AdminShell>
      <div className="page-title">
        <div>
          <h1>新建项目</h1>
          <p>先建立客户项目档案，进入工作区后再上传版本、资料、更新说明并开始跟进反馈。</p>
        </div>
      </div>
      <div className="setup-grid">
        <section className="panel">
          <form action={createOrderAction}>
            <OrderFields />
            <SubmitButton className="primary-button" pendingLabel="创建中...">
              创建项目并进入工作区
            </SubmitButton>
          </form>
        </section>
        <aside className="guide-panel">
          <h2>项目建立后</h2>
          <div className="guide-list">
            <div>
              <PackageCheck size={20} />
              <span>上传推荐版本和历史版本，补齐更新说明与修复内容</span>
            </div>
            <div>
              <FileArchive size={20} />
              <span>上传交付文档、部署说明、操作手册和其他资料</span>
            </div>
            <div>
              <Send size={20} />
              <span>同步阶段更新，让客户知道这次交付新增了什么、下一步做什么</span>
            </div>
            <div>
              <MessageSquareWarning size={20} />
              <span>客户提交问题后，在工作区逐条处理并关联到对应修复版本</span>
            </div>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
