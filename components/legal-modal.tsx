"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  FileText,
  Lock,
  Scale,
  Printer,
  CheckCircle2,
} from "lucide-react";

export type LegalTab = "terms" | "privacy" | "kenya_compliance";

interface LegalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: LegalTab;
  showAcceptButton?: boolean;
  onAccept?: () => void;
}

export function LegalModal({
  open,
  onOpenChange,
  defaultTab = "terms",
  showAcceptButton = false,
  onAccept,
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(defaultTab);

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function handleAccept() {
    if (onAccept) onAccept();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog legal-dialog-container" style={{ maxWidth: 840, maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <DialogHeader style={{ padding: "24px 28px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "3px 10px", borderRadius: 6, marginBottom: 8, border: "1px solid #a7f3d0" }}>
                <Scale size={13} />
                <span>Republic of Kenya • Statutory Compliance & Governance</span>
              </div>
              <DialogTitle style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {activeTab === "terms" ? "Terms & Conditions of Service" : activeTab === "privacy" ? "Data Protection & Privacy Policy" : "Kenyan Legal & Regulatory Framework"}
              </DialogTitle>
              <DialogDescription style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Governed under the Laws of Kenya, Kenya Data Protection Act (2019), and CBK National Payment System Act.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#475569", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer" }}
              title="Print legal documentation"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: activeTab === "terms" ? 700 : 500,
                color: activeTab === "terms" ? "#0284c7" : "#64748b",
                background: activeTab === "terms" ? "#e0f2fe" : "transparent",
                border: activeTab === "terms" ? "1px solid #bae6fd" : "1px solid transparent",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <FileText size={15} />
              <span>Terms of Service</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: activeTab === "privacy" ? 700 : 500,
                color: activeTab === "privacy" ? "#0284c7" : "#64748b",
                background: activeTab === "privacy" ? "#e0f2fe" : "transparent",
                border: activeTab === "privacy" ? "1px solid #bae6fd" : "1px solid transparent",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Lock size={15} />
              <span>Privacy Policy (KDPA)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kenya_compliance")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: activeTab === "kenya_compliance" ? 700 : 500,
                color: activeTab === "kenya_compliance" ? "#0284c7" : "#64748b",
                background: activeTab === "kenya_compliance" ? "#e0f2fe" : "transparent",
                border: activeTab === "kenya_compliance" ? "1px solid #bae6fd" : "1px solid transparent",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <ShieldCheck size={15} />
              <span>Kenyan Laws & CBK / KRA</span>
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Document Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", color: "#334155", fontSize: 13.5, lineHeight: 1.65 }}>
          {activeTab === "terms" && <TermsOfServiceContent />}
          {activeTab === "privacy" && <PrivacyPolicyContent />}
          {activeTab === "kenya_compliance" && <KenyaComplianceContent />}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            <span>Version 2.4 · Effective November 2026 · Nairobi, Kenya</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#475569", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer" }}
            >
              Close
            </button>
            {showAcceptButton && (
              <button
                type="button"
                onClick={handleAccept}
                style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, color: "#ffffff", background: "#0284c7", border: "none", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <CheckCircle2 size={16} />
                <span>I Understand & Agree</span>
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TermsOfServiceContent() {
  return (
    <article className="legal-article" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Notice Banner */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px 18px", borderRadius: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <ShieldCheck size={20} style={{ color: "#16a34a", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "#166534", display: "block", marginBottom: 2 }}>Binding Corporate Agreement under Kenyan Law</strong>
          <span style={{ color: "#15803d", fontSize: 12.5 }}>
            By registering a business, logging in, depositing funds, or submitting expense claims on ExpenseIQ Business, you and your organization agree to be legally bound by these Terms of Service in accordance with the Laws of Kenya.
          </span>
        </div>
      </div>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>1. Parties & Eligibility</h3>
        <p>
          These Terms of Service (&quot;Terms&quot;) constitute a legally enforceable contract between <strong>ExpenseIQ Technologies Limited</strong> (&quot;ExpenseIQ&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;Platform Operator&quot;), a technology service company incorporated under the Companies Act, 2015 of Kenya, and the subscriber enterprise, sole proprietorship, partnership, or organization (&quot;Customer&quot;, &quot;Business&quot;, or &quot;You&quot;), together with all authorized administrators, managers, accountants, and employees accessing the service.
        </p>
        <p style={{ marginTop: 6 }}>
          To create an account or bind an organization, you must be a legally recognized entity in Kenya or an individual of at least 18 years of age (Age of Majority Act, Cap 33) possessing valid statutory authority to contract on behalf of the business.
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>2. Software Intermediary & Non-Bank Status (Central Bank of Kenya Disclaimer)</h3>
        <p>
          ExpenseIQ Business provides cloud-based software for corporate expense tracking, workflow approvals, budget allocations, and transparent receipt archiving.
        </p>
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "12px 16px", borderRadius: 8, margin: "10px 0" }}>
          <strong style={{ color: "#92400e", display: "block", fontSize: 13 }}>Central Bank of Kenya (CBK) Regulatory Clarification:</strong>
          <p style={{ color: "#78350f", fontSize: 12.5, margin: "4px 0 0" }}>
            ExpenseIQ is <strong>NOT</strong> a bank, microfinance bank, credit provider, or licensed deposit-taking SACCO. Internal wallet balances displayed in the application represent internal corporate expenditure allocations and budget tracking units, not bank deposits or interest-bearing instruments. All payment processing, card collections, and Safaricom M-Pesa STK push checkouts are facilitated by our licensed Payment Service Provider partner, <strong>Paystack Payments Kenya Limited</strong>, which is fully regulated and licensed by the Central Bank of Kenya under the National Payment System (NPS) Act (Cap 491C).
          </p>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>3. Company Wallet, M-Pesa STK Push & Card Deposits</h3>
        <ul style={{ paddingLeft: 20, margin: "6px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <li>
            <strong>Authorized Top-ups:</strong> Only designated Business Admins and authorized managers may initiate wallet top-ups via Paystack (M-Pesa Express STK Push, Visa/Mastercard) or corporate direct EFT.
          </li>
          <li>
            <strong>Finality of Deposits:</strong> Once an M-Pesa transaction or card charge is confirmed by Paystack/Safaricom and credited to the company wallet ledger, it is final and earmarked for organizational expense reimbursements or authorized disbursements.
          </li>
          <li>
            <strong>AML / CFT Compliance:</strong> In accordance with the <em>Proceeds of Crime and Anti-Money Laundering Act (POCAMLA), Cap 59A</em>, and the <em>Prevention of Terrorism Act (POTA), 2012</em>, the Customer warrants that all funds deposited into the wallet originate from lawful commercial activities. ExpenseIQ and Paystack reserve the right to report suspicious financial transactions to the Financial Reporting Centre (FRC) of Kenya.
          </li>
        </ul>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>4. Expense Submissions, Receipt Integrity & KRA e-TIMS Compliance</h3>
        <p>
          Employees and managers submitting expense reimbursement claims or spend requests agree to adhere strictly to truthfulness and legal receipt integrity:
        </p>
        <ul style={{ paddingLeft: 20, margin: "6px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <li>
            <strong>Authentic Receipts:</strong> All uploaded receipts, tax invoices, M-Pesa SMS confirmation codes, and payment proofs must represent bona fide business expenditures incurred in the ordinary course of company business.
          </li>
          <li>
            <strong>Kenya Revenue Authority (KRA) Tax Invoices:</strong> While ExpenseIQ assists with estimating Value Added Tax (VAT) and cost-center categorizations, the Customer is solely responsible for verifying that vendor tax invoices comply with KRA e-TIMS requirements under the <em>Tax Procedures Act, 2015</em> and <em>VAT Act, 2013</em>.
          </li>
          <li>
            <strong>Fraud Prohibition:</strong> Submitting forged receipts, altered invoices, or fraudulent M-Pesa confirmation codes constitutes fraud, civil breach of contract, and a criminal offense under the <em>Penal Code (Cap 63)</em> and the <em>Computer Misuse and Cybercrimes Act, 2018</em>.
          </li>
        </ul>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>5. Electronic Records & Audit Trails (KICA Section 83)</h3>
        <p>
          Pursuant to Section 83 of the <em>Kenya Information and Communications Act (KICA), Cap 411A</em>, all digital approvals, clicks, manager decisions, timestamps, notes, and audit ledger entries recorded in ExpenseIQ constitute legal, valid, and admissible electronic records and electronic signatures for organizational accountability and statutory audit.
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>6. Account Security & User Conduct</h3>
        <p>
          Users must safeguard their login credentials and Multi-Factor Authentication tokens. Users shall not share passwords, attempt unauthorized access to other tenant business workspaces, inject malicious scripts, or probe system vulnerabilities. Any unauthorized interference will be reported to the National Computer and Cybercrimes Coordination Committee (NC4) and law enforcement authorities under the <em>Computer Misuse and Cybercrimes Act, 2018</em>.
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>7. Limitation of Liability</h3>
        <p>
          ExpenseIQ provides the platform on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent permitted under the <em>Consumer Protection Act, 2012</em>, ExpenseIQ shall not be liable for indirect, incidental, punitive, or consequential damages, including loss of business profits, Safaricom network downtimes, bank clearing delays, or unauthorized internal embezzlement conducted by Customer&apos;s authorized staff. ExpenseIQ&apos;s aggregate liability under any claim shall not exceed the subscription fees paid by the Customer in the three (3) months preceding the incident.
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>8. Termination & Suspension</h3>
        <p>
          We reserve the right to suspend or terminate access to any business workspace that violates Kenyan anti-money laundering laws, engages in receipt fabrication, fails platform approval review, or breaches payment obligations.
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>9. Governing Law & Dispute Resolution</h3>
        <p>
          These Terms are governed by and construed in accordance with the <strong>Laws of the Republic of Kenya</strong>. Any dispute arising out of or in connection with these Terms shall first be submitted to mutual amicable resolution for thirty (30) days. Failing amicable resolution, the dispute shall be finally determined by arbitration under the <em>Arbitration Act, 1995</em> administered by the Nairobi Centre for International Arbitration (NCIA) or the competent courts of law in Nairobi, Kenya.
        </p>
      </section>
    </article>
  );
}

export function PrivacyPolicyContent() {
  return (
    <article className="legal-article" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ODPC Notice */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px 18px", borderRadius: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Lock size={20} style={{ color: "#16a34a", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "#166534", display: "block", marginBottom: 2 }}>Compliance with Kenya Data Protection Act, 2019 (KDPA)</strong>
          <span style={{ color: "#15803d", fontSize: 12.5 }}>
            ExpenseIQ processes personal, employee, and financial transaction data strictly in compliance with the Data Protection Act No. 24 of 2019 and guidelines established by the Office of the Data Protection Commissioner (ODPC) of Kenya.
          </span>
        </div>
      </div>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>1. Data Controller & Data Processor Roles</h3>
        <p>
          Under Section 2 of the KDPA:
        </p>
        <ul style={{ paddingLeft: 20, margin: "6px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <li>
            <strong>Data Controller:</strong> The Customer (your business or employer) is the primary Data Controller determining the purpose and means of collecting employee expense claims, payee details, and internal budget rules.
          </li>
          <li>
            <strong>Data Processor:</strong> ExpenseIQ acts as a designated Data Processor processing personal and financial data on behalf of and strictly under the instructions of the Customer.
          </li>
        </ul>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>2. Categories of Personal Data Collected</h3>
        <p>We collect and process only data strictly necessary to manage company expenses and wallet operations:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "10px 0" }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 8 }}>
            <strong style={{ color: "#0f172a", fontSize: 13, display: "block" }}>Personal & Professional:</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Full name, corporate email address, assigned company role (Admin, Manager, Accountant, Employee), avatar initials.</span>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 8 }}>
            <strong style={{ color: "#0f172a", fontSize: 13, display: "block" }}>Financial & Payment Details:</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Safaricom M-Pesa mobile numbers, M-Pesa transaction reference codes, masked card brand & last 4 digits (handled via PCI-DSS Paystack gateway), bank transfer references.</span>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 8 }}>
            <strong style={{ color: "#0f172a", fontSize: 13, display: "block" }}>Expense & Audit Records:</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>Merchant/payee names, expense descriptions, amounts, receipt images/attachments, chatter notes, and manager approval logs.</span>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 8 }}>
            <strong style={{ color: "#0f172a", fontSize: 13, display: "block" }}>Security & Telemetry:</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>IP addresses, session tokens, audit timestamps, and device identifiers to prevent account takeover and fraud.</span>
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>3. Lawful Basis for Processing (Section 30 of KDPA)</h3>
        <p>We process your personal information under the following statutory legal grounds:</p>
        <ul style={{ paddingLeft: 20, margin: "6px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <li><strong>Performance of Contract:</strong> Delivering corporate expense reimbursement routing, approvals, and budget ledger management.</li>
          <li><strong>Legal & Regulatory Obligations:</strong> Compliance with financial recordkeeping laws under the Kenya Tax Procedures Act, 2015 (7-year retention) and POCAMLA AML regulations.</li>
          <li><strong>Legitimate Interests:</strong> Preventing corporate expense fraud, duplicate receipt submissions, and maintaining verifiable corporate audit trails.</li>
          <li><strong>Consent:</strong> Freely given consent provided by employees and business owners when signing up or submitting receipts.</li>
        </ul>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>4. Data Sharing & Third-Party Processors</h3>
        <p>
          We do <strong>NOT</strong> sell, monetize, or rent personal data to advertisers. Data is shared exclusively with necessary infrastructure and regulated payment partners:
        </p>
        <ul style={{ paddingLeft: 20, margin: "6px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <li><strong>Paystack Payments Kenya Limited:</strong> CBK-regulated payment partner for processing M-Pesa STK push and Card checkouts under strict PCI-DSS Level 1 compliance.</li>
          <li><strong>Safaricom PLC:</strong> Telecommunications operator for M-Pesa confirmation and STK push delivery.</li>
          <li><strong>Encrypted Database & Cloud Hosting:</strong> Secure cloud infrastructure (Supabase / Vercel) with AES-256 encryption at rest and TLS 1.3 in transit.</li>
          <li><strong>Law Enforcement & Regulators:</strong> Disclosed only pursuant to lawful orders from the Courts of Kenya, KRA, or the ODPC.</li>
        </ul>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>5. Data Subject Rights (Section 26 of KDPA)</h3>
        <p>Every individual whose data is processed by ExpenseIQ possesses statutory rights under the Kenya Data Protection Act:</p>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px 18px", borderRadius: 8, margin: "8px 0" }}>
          <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <li><strong>Right to be Informed:</strong> Transparent notice of how your data is collected and used (this Policy).</li>
            <li><strong>Right of Access:</strong> Request a copy of all expense and profile records held about you.</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate, outdated, or incomplete data.</li>
            <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request deletion of personal data, subject to mandatory 7-year statutory audit retention requirements under the Tax Procedures Act.</li>
            <li><strong>Right to Data Portability:</strong> Export personal and expense records in structured CSV format.</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or direct communications.</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>6. Data Security & Breach Notification (Section 43 of KDPA)</h3>
        <p>
          We maintain rigorous physical, technical, and organizational security safeguards, including multi-factor authentication, cryptographic salting, role-based access restrictions, and tenant database isolation. In the unlikely event of a security breach compromising personal data, ExpenseIQ shall notify the Office of the Data Protection Commissioner (ODPC) within 72 hours and inform affected data subjects without undue delay in accordance with Section 43 of the KDPA.
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>7. Data Protection Officer (DPO) & Regulatory Contact</h3>
        <p>
          For privacy inquiries, data subject access requests (DSAR), or complaints, contact our designated compliance team:
        </p>
        <div style={{ background: "#f1f5f9", padding: "12px 16px", borderRadius: 8, margin: "8px 0", fontSize: 12.5 }}>
          <strong>ExpenseIQ Data Protection Officer</strong><br />
          Email: <a href="mailto:privacy@expenseiq.co.ke" style={{ color: "#0284c7" }}>privacy@expenseiq.co.ke</a> · <a href="mailto:compliance@expenseiq.co.ke" style={{ color: "#0284c7" }}>compliance@expenseiq.co.ke</a><br />
          Physical Address: The Mirage, Westlands, Nairobi, Kenya<br />
          <em>You also have the statutory right to lodge a formal complaint with the Office of the Data Protection Commissioner of Kenya at <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7" }}>www.odpc.go.ke</a> (Email: complaints@odpc.go.ke).</em>
        </div>
      </section>
    </article>
  );
}

export function KenyaComplianceContent() {
  return (
    <article className="legal-article" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px 18px", borderRadius: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Scale size={20} style={{ color: "#2563eb", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "#1e40af", display: "block", marginBottom: 2 }}>Kenyan Regulatory & Statutory Architecture</strong>
          <span style={{ color: "#1d4ed8", fontSize: 12.5 }}>
            A summary of the specific statutes, circulars, and regulatory bodies governing digital business operations, corporate treasury spend, and data protection in Kenya.
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "16px 18px", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>STATUTE 1</span>
            <strong style={{ color: "#0f172a", fontSize: 14 }}>Data Protection Act, No. 24 of 2019 (KDPA)</strong>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "#475569" }}>
            Enacted to give effect to Article 31(c) & (d) of the Constitution of Kenya. Regulates the collection, handling, storage, and cross-border transfer of employee and customer data. Regulated by the Office of the Data Protection Commissioner (ODPC).
          </p>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "16px 18px", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>STATUTE 2</span>
            <strong style={{ color: "#0f172a", fontSize: 14 }}>National Payment System Act, Cap 491C (CBK)</strong>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "#475569" }}>
            Governs payment service providers, mobile money ecosystems (Safaricom M-Pesa), electronic retail payment rails, and clearing houses in Kenya. All fiat deposits are processed via CBK-licensed PSP partner Paystack Payments Kenya Limited.
          </p>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "16px 18px", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>STATUTE 3</span>
            <strong style={{ color: "#0f172a", fontSize: 14 }}>Tax Procedures Act (2015) & VAT Act (2013) (KRA)</strong>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "#475569" }}>
            Mandates a minimum 7-year retention period for corporate financial records, expense vouchers, receipts, and VAT e-TIMS invoices. ExpenseIQ provides automated CSV exports and VAT summaries to assist Kenyan businesses with monthly KRA tax filing.
          </p>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "16px 18px", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>STATUTE 4</span>
            <strong style={{ color: "#0f172a", fontSize: 14 }}>Kenya Information and Communications Act, Cap 411A (KICA)</strong>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "#475569" }}>
            Recognizes the legal validity, integrity, and evidentiary weight of digital approvals, electronic signatures, and electronic audit trails (Section 83) in administrative and judicial proceedings across Kenyan courts.
          </p>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "16px 18px", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>STATUTE 5</span>
            <strong style={{ color: "#0f172a", fontSize: 14 }}>Computer Misuse and Cybercrimes Act, 2018</strong>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "#475569" }}>
            Criminalizes unauthorized computer system interference, cyber espionage, data tampering, falsification of electronic records, and unauthorized credential use in corporate cloud environments.
          </p>
        </div>
      </div>
    </article>
  );
}
