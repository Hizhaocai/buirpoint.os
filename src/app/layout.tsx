import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "焦点 Buir Point · Studio OS",
  description: "摄像工作室订单与档期管理系统",
  icons: {
    icon: [
      {
        url: "/brand/buir-point-mark.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* THESIS: 摄像工作室的协调信息以安静、可扫描的工作台呈现，拒绝堆叠式 ERP 卡片。 OWN-WORLD: 冷石色画布、森林绿行动色、细边框与克制的 12px 圆角。 STORY: 用户登录后快速辨认当前位置、权限与下一步模块。 FIRST VIEWPORT: 桌面端侧栏锚定工作区，主内容从清晰标题和一组可进入的工作区域开始。 FORM: operate workspace, seed visual calibration. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}
        {children}
      </body>
    </html>
  );
}
