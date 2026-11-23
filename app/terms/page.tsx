"use client";

import Link from "next/link";
import { LockKeyhole, ArrowLeft, Printer, Scale } from "lucide-react";
import { TermsOfServiceContent, KenyaComplianceContent } from "@/components/legal-modal";

export default function TermsPage() {
  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Navbar */}
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#64748b", textDecoration: "none" }}
            >
              <ArrowLeft size={16} />
              <span>Back to App</span>
            </Link>
            <div style={{ width: 1, height: 20, background: "#cbd5e1" }} />
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#0f172a" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0284c7", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LockKeyhole size={18} />
              </div>
              <strong style={{ fontSize: 16, fontWeight: 800 }}>ExpenseIQ <span style={{ color: "#0284c7" }}>Business</span></strong>
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/privacy"
              style={{ fontSize: 13, fontWeight: 600, color: "#0284c7", textDecoration: "none", padding: "6px 12px", borderRadius: 6, background: "#f0f9ff" }}
            >
              Privacy Policy
            </Link>
            <button
              type="button"
              onClick={handlePrint}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#475569", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer" }}
            >
              <Printer size={15} />
              <span>Print Terms</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Body */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Document Header */}
        <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "36px 40px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "4px 12px", borderRadius: 6, marginBottom: 12, border: "1px solid #a7f3d0" }}>
            <Scale size={14} />
            <span>Republic of Kenya · Corporate Commercial Terms</span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Terms & Conditions of Service
          </h1>

          <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
            Comprehensive Terms of Service governing corporate subscriptions, employee expense submissions, Paystack wallet deposits, and digital audit ledgers under the Laws of Kenya.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9", fontSize: 12.5, color: "#64748b" }}>
            <span><strong>Effective Date:</strong> 23 November 2026</span>
            <span>·</span>
            <span><strong>Jurisdiction:</strong> Nairobi, Republic of Kenya</span>
            <span>·</span>
            <span><strong>Regulators:</strong> CBK (NPS Act), ODPC (KDPA), KRA (Tax Procedures Act)</span>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "40px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <TermsOfServiceContent />

          <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Kenyan Statutory Legal Framework Overview
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
              The statutory acts and regulatory guidelines underpinning ExpenseIQ Business in the Republic of Kenya.
            </p>
          </div>

          <KenyaComplianceContent />
        </div>

        {/* Footer */}
        <footer style={{ marginTop: 40, textAlign: "center", fontSize: 13, color: "#64748b" }}>
          <p>© {new Date().getFullYear()} ExpenseIQ Technologies Limited. All rights reserved. Registered in Kenya under the Companies Act, 2015.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
            <Link href="/terms" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>Terms of Service</Link>
            <span>·</span>
            <Link href="/privacy" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
            <span>·</span>
            <Link href="/login" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>Sign In</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
