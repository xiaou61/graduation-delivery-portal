import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = "gdp_admin_session";
const sessionMaxAge = 60 * 60 * 8;

function getSessionSecret() {
  return getRequiredSecret(
    "SESSION_SECRET",
    "dev-only-session-secret-change-before-production"
  );
}

function getAdminPassword() {
  return getRequiredSecret("ADMIN_PASSWORD", "change-me-admin-password");
}

function getAdminUsername() {
  return getRequiredSecret("ADMIN_USERNAME", "admin");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

export async function createAdminSession() {
  const issuedAt = Date.now().toString();
  const value = `${issuedAt}.${sign(issuedAt)}`;
  const cookieStore = await cookies();
  cookieStore.set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(cookieName)?.value;
  if (!raw) return false;

  const [issuedAt, signature] = raw.split(".");
  if (!issuedAt || !signature) return false;

  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age > sessionMaxAge * 1000) return false;

  const expected = sign(issuedAt);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function requireAdminSession() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
}

export function verifyAdminCredentials(username: string, password: string) {
  return (
    safeEqual(username, getAdminUsername()) &&
    safeEqual(password, getAdminPassword())
  );
}

function safeEqual(actualValue: string, expectedValue: string) {
  const expected = Buffer.from(expectedValue);
  const actual = Buffer.from(actualValue);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function getRequiredSecret(name: string, developmentFallback: string) {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be configured in production`);
  }
  return developmentFallback;
}
