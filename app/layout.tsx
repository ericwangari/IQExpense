import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./business.css";
import { PwaInstaller } from "./pwa";

export const metadata: Metadata = {
  title: "ExpenseIQ Business — Company Expense Management",
  description: "Manage business expenses, approvals, teams and internal budget wallets.",
  applicationName: "ExpenseIQ Business",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ExpenseIQ",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}<PwaInstaller /></body>
    </html>
  );
}
