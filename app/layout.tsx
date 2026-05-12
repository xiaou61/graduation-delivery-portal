import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "客户交付协作平台",
  description: "用于版本交付、客户反馈、进度同步与交付闭环管理的企业级协作平台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
