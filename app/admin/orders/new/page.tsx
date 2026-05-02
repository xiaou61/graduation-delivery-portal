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
          <p>先建立项目档案，进入项目详情后再上传论文、程序版本和其他资料。</p>
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
              <span>上传程序版本，填写 v0.0.1、v0.0.2 和更新说明</span>
            </div>
            <div>
              <FileArchive size={20} />
              <span>上传论文文件、非论文资料、部署说明等附件</span>
            </div>
            <div>
              <Send size={20} />
              <span>发布阶段进度，客户在专属链接里按时间查看</span>
            </div>
            <div>
              <MessageSquareWarning size={20} />
              <span>客户提交 Bug 后，在项目详情里逐条处理并关联修复版本</span>
            </div>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
