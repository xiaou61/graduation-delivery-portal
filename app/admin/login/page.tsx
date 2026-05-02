import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { loginAction } from "@/src/actions/admin";
import { SubmitButton } from "@/src/components/submit-button";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const showDefaultHint =
    process.env.NODE_ENV !== "production" &&
    !process.env.ADMIN_USERNAME &&
    !process.env.ADMIN_PASSWORD;

  return (
    <main className="login-shell">
      <section className="login-panel">
        <LockKeyhole size={34} />
        <h1>后台登录</h1>
        {showDefaultHint ? (
          <p className="empty-text">
            默认账号 <strong>admin</strong>，密码 <strong>change-me-admin-password</strong>。
            正式使用前可以在 <code>.env.local</code> 里调整。
          </p>
        ) : (
          <p className="empty-text">
            请使用 <code>.env.local</code> 中配置的管理员账号登录。
          </p>
        )}
        {params.error ? <p className="error-text">账号或密码不正确，请重新输入。</p> : null}
        <form action={loginAction}>
          <label>
            管理账号
            <input
              name="username"
              required
              autoComplete="username"
              autoFocus
              defaultValue={showDefaultHint ? "admin" : undefined}
            />
          </label>
          <label>
            管理密码
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <SubmitButton className="primary-button" pendingLabel="登录中...">
            登录
          </SubmitButton>
        </form>
        <p>
          <Link href="/" className="ghost-button">
            返回首页
          </Link>
        </p>
      </section>
    </main>
  );
}
