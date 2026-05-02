import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "毕业设计交付后台",
  description: "毕业设计材料交付、版本更新与 Bug 反馈管理系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

