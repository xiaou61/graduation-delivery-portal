import Link from "next/link";
import { LogOut, PackageCheck, Plus, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/src/actions/admin";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Link className="brand" href="/admin">
          <span className="brand-mark">GD</span>
          <span>
            <strong>交付运营台</strong>
            <small>Delivery Operations</small>
          </span>
        </Link>
        <nav className="side-nav">
          <Link href="/admin">
            <PackageCheck size={18} />
            运营看板
          </Link>
          <Link href="/admin/orders/new">
            <Plus size={18} />
            新建项目
          </Link>
        </nav>
        <form action={logoutAction} className="logout-form">
          <button className="ghost-button" type="submit">
            <LogOut size={17} />
            退出登录
          </button>
        </form>
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          这里聚合项目版本、客户反馈和访问行为，适合交付团队做日常跟进。
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
