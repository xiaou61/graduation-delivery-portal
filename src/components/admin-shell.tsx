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
            <strong>交付后台</strong>
            <small>Graduation Delivery</small>
          </span>
        </Link>
        <nav className="side-nav">
          <Link href="/admin">
            <PackageCheck size={18} />
            项目总览
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
          后台操作会写入本地数据文件，适合演示和早期使用。
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
