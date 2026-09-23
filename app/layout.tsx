import type { Metadata } from "next";
import "./globals.css";
import "./business.css";

export const metadata: Metadata = {
  title: "ExpenseIQ Business — Company Expense Management",
  description: "Manage business expenses, approvals, teams and internal budget wallets.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
