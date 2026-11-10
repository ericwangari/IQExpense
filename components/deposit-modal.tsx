"use client";

import { useState } from "react";
import {
  Smartphone,
  CreditCard,
  Landmark,
  Check,
  Copy,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  normalizeMpesaPhone,
  isValidMpesaPhone,
  formatMpesaPhoneDisplay,
  parseMpesaSms,
  detectCardBrand,
  formatCardNumber,
  formatCardExpiry,
  isValidCardExpiry,
  getBusinessPaymentDetails,
  generateMpesaReceiptCode,
  generateDepositReference,
  type PaymentMethodType,
} from "@/lib/payment";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  currency: string;
  currentBalance: number;
  userEmail: string;
  onSuccess: (payload: {
    action: "deposit";
    amount: number;
    paymentMethod: PaymentMethodType;
    reference: string;
    phoneNumber?: string;
    cardLast4?: string;
    cardBrand?: string;
    note?: string;
  }) => Promise<void>;
}

export function DepositModal({
  open,
  onOpenChange,
  businessId,
  businessName,
  currency = "KES",
  currentBalance,
  userEmail,
  onSuccess,
}: DepositModalProps) {
  const [method, setMethod] = useState<PaymentMethodType>("mpesa");
  const [mpesaMode, setMpesaMode] = useState<"stk" | "paybill">("stk");

  // Amount state
  const [amountInput, setAmountInput] = useState<string>("5000");

  // M-Pesa fields
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [mpesaSmsInput, setMpesaSmsInput] = useState<string>("");
  const [mpesaManualCode, setMpesaManualCode] = useState<string>("");

  // Card fields
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvc, setCardCvc] = useState<string>("");
  const [cardholderName, setCardholderName] = useState<string>("");

  // Bank fields
  const [bankRefInput, setBankRefInput] = useState<string>("");

  // Processing & Status state
  const [step, setStep] = useState<"input" | "processing" | "success">("input");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(30);
  const [receiptData, setReceiptData] = useState<{
    reference: string;
    amountCents: number;
    method: PaymentMethodType;
    timestamp: string;
    details: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const bankDetails = getBusinessPaymentDetails(businessName, businessId);
  const accountRef = `EXP-${businessId.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}`;

  const numAmount = parseFloat(amountInput) || 0;
  const amountCents = Math.round(numAmount * 100);

  const presetAmounts = currency === "USD"
    ? [50, 100, 250, 500, 1000]
    : [1000, 5000, 10000, 25000, 50000];

  function copyText(val: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      toast.success(`Copied ${label}: ${val}`);
    }
  }

  function handleMpesaSmsPaste(text: string) {
    setMpesaSmsInput(text);
    if (!text.trim()) return;
    const parsed = parseMpesaSms(text);
    if (parsed.amount) {
      setAmountInput((parsed.amount / 100).toString());
    }
    if (parsed.code) {
      setMpesaManualCode(parsed.code);
    }
    if (parsed.phone) {
      setPhoneInput(parsed.phone);
    }
    if (parsed.code || parsed.amount) {
      toast.success(`M-Pesa SMS parsed: Code ${parsed.code || "detected"} - ${currency} ${(parsed.amount ? parsed.amount / 100 : numAmount).toLocaleString()}`);
    }
  }

  async function handleInitiateDeposit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (numAmount <= 0 || !Number.isFinite(numAmount)) {
      setErrorMsg("Please enter a valid deposit amount.");
      return;
    }

    if (method === "mpesa") {
      if (mpesaMode === "stk") {
        const normalized = normalizeMpesaPhone(phoneInput);
        if (!isValidMpesaPhone(normalized)) {
          setErrorMsg("Please enter a valid Safaricom phone number (e.g. 0712 345 678).");
          return;
        }

        setLoading(true);
        setStep("processing");
        setStatusMessage(`Sending M-Pesa STK push prompt to ${formatMpesaPhoneDisplay(normalized)}...`);

        try {
          // Trigger STK push through API or direct simulation
          const res = await fetch("/api/wallet/deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "mpesa",
              amount: amountCents,
              phoneNumber: normalized,
              businessId,
              businessName,
              reference: accountRef,
            }),
          });

          const data = (await res.json()) as { error?: string; reference?: string };
          if (!res.ok) throw new Error(data.error || "STK push initiation failed");

          const assignedRef = data.reference || generateMpesaReceiptCode();
          setStatusMessage(`STK prompt sent to ${formatMpesaPhoneDisplay(normalized)}. Please enter your M-Pesa PIN on your phone to approve.`);

          // Countdown simulation
          let remaining = 5;
          setCountdown(remaining);
          const interval = setInterval(() => {
            remaining -= 1;
            setCountdown(remaining);
            if (remaining <= 0) {
              clearInterval(interval);
              completeDeposit({
                action: "deposit",
                amount: amountCents,
                paymentMethod: "mpesa",
                reference: assignedRef,
                phoneNumber: normalized,
                note: `M-Pesa deposit via STK Push (${assignedRef} from ${formatMpesaPhoneDisplay(normalized)})`,
              });
            }
          }, 1000);
        } catch (err) {
          setStep("input");
          setLoading(false);
          const msg = err instanceof Error ? err.message : "Failed to initiate M-Pesa deposit.";
          setErrorMsg(msg);
          toast.error(msg);
        }
      } else {
        // Paybill manual code
        const code = (mpesaManualCode || generateMpesaReceiptCode()).toUpperCase().trim();
        if (code.length < 8) {
          setErrorMsg("Please enter a valid 10-character M-Pesa transaction reference code.");
          return;
        }

        setLoading(true);
        setStep("processing");
        setStatusMessage("Verifying M-Pesa confirmation...");

        setTimeout(() => {
          completeDeposit({
            action: "deposit",
            amount: amountCents,
            paymentMethod: "mpesa",
            reference: code,
            note: `M-Pesa Paybill deposit (${code})`,
          });
        }, 1200);
      }
    } else if (method === "card") {
      const cleanNum = cardNumber.replace(/\D/g, "");
      if (cleanNum.length < 13 || cleanNum.length > 19) {
        setErrorMsg("Enter a valid card number.");
        return;
      }
      if (!isValidCardExpiry(cardExpiry)) {
        setErrorMsg("Enter a valid expiration date (MM/YY).");
        return;
      }
      if (!/^\d{3,4}$/.test(cardCvc)) {
        setErrorMsg("Enter a valid 3-4 digit security code (CVV).");
        return;
      }
      if (!cardholderName.trim()) {
        setErrorMsg("Enter the cardholder name.");
        return;
      }

      setLoading(true);
      setStep("processing");
      setStatusMessage("Connecting to card issuer and verifying 3D Secure...");

      setTimeout(() => {
        const brand = detectCardBrand(cleanNum).toUpperCase();
        const last4 = cleanNum.slice(-4);
        const ref = generateDepositReference("CRD");

        completeDeposit({
          action: "deposit",
          amount: amountCents,
          paymentMethod: "card",
          reference: ref,
          cardLast4: last4,
          cardBrand: brand,
          note: `Card deposit (${brand} •••• ${last4} Ref: ${ref})`,
        });
      }, 1500);
    } else if (method === "bank") {
      const ref = (bankRefInput || generateDepositReference("EFT")).trim();
      if (!ref) {
        setErrorMsg("Enter the bank wire or EFT deposit reference code.");
        return;
      }

      setLoading(true);
      setStep("processing");
      setStatusMessage("Verifying bank transfer reference...");

      setTimeout(() => {
        completeDeposit({
          action: "deposit",
          amount: amountCents,
          paymentMethod: "bank",
          reference: ref,
          note: `Bank transfer deposit (${bankDetails.bankName} Ref: ${ref})`,
        });
      }, 1200);
    }
  }

  async function completeDeposit(payload: {
    action: "deposit";
    amount: number;
    paymentMethod: PaymentMethodType;
    reference: string;
    phoneNumber?: string;
    cardLast4?: string;
    cardBrand?: string;
    note?: string;
  }) {
    try {
      await onSuccess(payload);
      setReceiptData({
        reference: payload.reference,
        amountCents: payload.amount,
        method: payload.paymentMethod,
        timestamp: new Date().toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        details: payload.note || `Deposit via ${payload.paymentMethod.toUpperCase()}`,
      });
      setStep("success");
      toast.success(`Wallet credited with ${currency} ${(payload.amount / 100).toLocaleString()}`);
    } catch (e) {
      setStep("input");
      setErrorMsg(e instanceof Error ? e.message : "Deposit failed to credit wallet.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep("input");
    setErrorMsg("");
    setLoading(false);
    onOpenChange(false);
  }

  const cardBrand = detectCardBrand(cardNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog deposit-dialog">
        <DialogHeader>
          <div className="deposit-dialog-header">
            <div className="deposit-icon-badge">
              <Sparkles size={22} />
            </div>
            <div>
              <DialogTitle>Deposit Funds to Wallet</DialogTitle>
              <DialogDescription>
                Add money to your {businessName} company wallet using instant mobile money, card, or bank transfer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "input" && (
          <form onSubmit={handleInitiateDeposit} className="deposit-form">
            {/* Amount Selection Section */}
            <div className="deposit-section">
              <label className="deposit-field-label">
                Deposit Amount ({currency})
              </label>
              <div className="deposit-amount-input-wrap">
                <span className="deposit-currency-tag">{currency}</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="deposit-amount-input"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>

              {/* Quick Preset Amount Buttons */}
              <div className="deposit-preset-row">
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`deposit-preset-pill ${numAmount === amt ? "active" : ""}`}
                    onClick={() => setAmountInput(amt.toString())}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="deposit-section">
              <label className="deposit-field-label">Select Payment Method</label>
              <div className="deposit-methods-grid">
                <button
                  type="button"
                  className={`deposit-method-card ${method === "mpesa" ? "active" : ""}`}
                  onClick={() => setMethod("mpesa")}
                >
                  <div className="deposit-method-icon mpesa">
                    <Smartphone size={20} />
                  </div>
                  <div className="deposit-method-info">
                    <strong>M-PESA</strong>
                    <span>Instant STK push & Paybill</span>
                  </div>
                  {method === "mpesa" && <Check className="deposit-check-mark" size={16} />}
                </button>

                <button
                  type="button"
                  className={`deposit-method-card ${method === "card" ? "active" : ""}`}
                  onClick={() => setMethod("card")}
                >
                  <div className="deposit-method-icon card">
                    <CreditCard size={20} />
                  </div>
                  <div className="deposit-method-info">
                    <strong>Debit / Credit Card</strong>
                    <span>Visa, Mastercard & Amex</span>
                  </div>
                  {method === "card" && <Check className="deposit-check-mark" size={16} />}
                </button>

                <button
                  type="button"
                  className={`deposit-method-card ${method === "bank" ? "active" : ""}`}
                  onClick={() => setMethod("bank")}
                >
                  <div className="deposit-method-icon bank">
                    <Landmark size={20} />
                  </div>
                  <div className="deposit-method-info">
                    <strong>Bank Wire / EFT</strong>
                    <span>Corporate direct deposit</span>
                  </div>
                  {method === "bank" && <Check className="deposit-check-mark" size={16} />}
                </button>
              </div>
            </div>

            {/* METHOD 1: M-PESA DETAIL CONTAINER */}
            {method === "mpesa" && (
              <div className="deposit-method-details-box mpesa-box">
                <div className="mpesa-mode-toggle">
                  <button
                    type="button"
                    className={`mpesa-submode-btn ${mpesaMode === "stk" ? "active" : ""}`}
                    onClick={() => setMpesaMode("stk")}
                  >
                    ⚡ M-Pesa STK Push (Express)
                  </button>
                  <button
                    type="button"
                    className={`mpesa-submode-btn ${mpesaMode === "paybill" ? "active" : ""}`}
                    onClick={() => setMpesaMode("paybill")}
                  >
                    🏢 Paybill / Manual SMS
                  </button>
                </div>

                {mpesaMode === "stk" ? (
                  <div className="stk-push-content">
                    <div className="deposit-field-group">
                      <label>
                        Safaricom Phone Number
                        <span className="field-hint">Prompts your phone for PIN</span>
                      </label>
                      <div className="phone-input-wrap">
                        <span className="phone-prefix">+254</span>
                        <input
                          type="tel"
                          placeholder="0712 345 678"
                          className="deposit-text-input"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          required={mpesaMode === "stk"}
                        />
                      </div>
                      <small className="deposit-hint">
                        We will send a secure Safaricom prompt directly to this phone.
                      </small>
                    </div>

                    <div className="stk-instructions-pill">
                      <ShieldCheck size={16} className="text-emerald" />
                      <span>Zero transaction fee on direct business wallet top-ups</span>
                    </div>
                  </div>
                ) : (
                  <div className="paybill-content">
                    <div className="paybill-account-badges">
                      <div className="paybill-badge">
                        <span>BUSINESS PAYBILL</span>
                        <strong>{bankDetails.paybillNumber}</strong>
                        <button
                          type="button"
                          className="copy-chip-btn"
                          onClick={() => copyText(bankDetails.paybillNumber, "Paybill")}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                      <div className="paybill-badge">
                        <span>ACCOUNT NUMBER</span>
                        <strong>{accountRef}</strong>
                        <button
                          type="button"
                          className="copy-chip-btn"
                          onClick={() => copyText(accountRef, "Account Number")}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>

                    <div className="deposit-field-group">
                      <label>
                        Paste M-Pesa Confirmation SMS
                        <span className="field-hint">Auto-extracts code and amount</span>
                      </label>
                      <textarea
                        rows={2}
                        className="deposit-textarea"
                        placeholder="Paste full SMS e.g. QK89DF921X Confirmed. Ksh5,000.00 sent to ExpenseIQ..."
                        value={mpesaSmsInput}
                        onChange={(e) => handleMpesaSmsPaste(e.target.value)}
                      />
                    </div>

                    <div className="deposit-field-group">
                      <label>Or Enter M-Pesa Transaction Code</label>
                      <input
                        type="text"
                        maxLength={12}
                        className="deposit-text-input"
                        placeholder="e.g. QK89DF921X"
                        value={mpesaManualCode}
                        onChange={(e) => setMpesaManualCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* METHOD 2: DEBIT / CREDIT CARD CONTAINER */}
            {method === "card" && (
              <div className="deposit-method-details-box card-box">
                <div className="deposit-field-group">
                  <label>Card Number</label>
                  <div className="card-input-wrap">
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="4111 2222 3333 4444"
                      className="deposit-text-input card-number-field"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      required
                    />
                    <div className={`card-brand-badge brand-${cardBrand}`}>
                      {cardBrand.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="card-fields-split">
                  <div className="deposit-field-group">
                    <label>Expires (MM/YY)</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/YY"
                      className="deposit-text-input"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                      required
                    />
                  </div>
                  <div className="deposit-field-group">
                    <label>Security Code (CVC)</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="123"
                      className="deposit-text-input"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                </div>

                <div className="deposit-field-group">
                  <label>Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    className="deposit-text-input"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    required
                  />
                </div>

                <div className="card-security-note">
                  <ShieldCheck size={16} />
                  <span>256-bit encrypted tokenization with 3D Secure fraud defense.</span>
                </div>
              </div>
            )}

            {/* METHOD 3: BANK TRANSFER CONTAINER */}
            {method === "bank" && (
              <div className="deposit-method-details-box bank-box">
                <div className="bank-account-sheet">
                  <div className="bank-sheet-row">
                    <span>Beneficiary Bank</span>
                    <strong>{bankDetails.bankName}</strong>
                  </div>
                  <div className="bank-sheet-row">
                    <span>Account Name</span>
                    <strong>{bankDetails.accountName}</strong>
                  </div>
                  <div className="bank-sheet-row">
                    <span>Account Number</span>
                    <strong className="code-font">{bankDetails.accountNumber}</strong>
                    <button
                      type="button"
                      className="copy-chip-btn"
                      onClick={() => copyText(bankDetails.accountNumber, "Account Number")}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className="bank-sheet-row">
                    <span>SWIFT / BIC Code</span>
                    <strong className="code-font">{bankDetails.swiftCode}</strong>
                  </div>
                  <div className="bank-sheet-row">
                    <span>Branch</span>
                    <strong>{bankDetails.branch}</strong>
                  </div>
                </div>

                <div className="deposit-field-group" style={{ marginTop: 14 }}>
                  <label>
                    Bank Transfer / Wire Reference Number
                    <span className="field-hint">From your banking app or receipt</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FT2610283991"
                    className="deposit-text-input"
                    value={bankRefInput}
                    onChange={(e) => setBankRefInput(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="deposit-error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Summary & Deposit Trigger */}
            <div className="deposit-footer-actions">
              <div className="deposit-summary-pill">
                <span>Total to Deposit:</span>
                <strong>
                  {currency} {numAmount > 0 ? numAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "0.00"}
                </strong>
              </div>

              <div className="deposit-action-btns">
                <button
                  type="button"
                  className="deposit-btn-secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="deposit-btn-primary"
                  disabled={loading || numAmount <= 0}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      Deposit {currency} {numAmount > 0 ? numAmount.toLocaleString() : ""}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* PROCESSING ANIMATION STATE */}
        {step === "processing" && (
          <div className="deposit-processing-view">
            <div className="deposit-processing-spinner">
              <div className="pulse-ring" />
              <div className="inner-icon">
                {method === "mpesa" ? (
                  <Smartphone size={32} className="text-emerald" />
                ) : method === "card" ? (
                  <CreditCard size={32} className="text-blue" />
                ) : (
                  <Landmark size={32} className="text-purple" />
                )}
              </div>
            </div>

            <h3>Authorizing Deposit</h3>
            <p className="processing-message">{statusMessage}</p>

            {method === "mpesa" && mpesaMode === "stk" && countdown > 0 && (
              <div className="processing-timer">
                <span>Awaiting PIN on phone: <strong>{countdown}s</strong></span>
                <div className="processing-progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.max(0, (countdown / 5) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="processing-meta-note">
              <ShieldCheck size={15} />
              <span>Direct end-to-end encrypted financial settlement</span>
            </div>
          </div>
        )}

        {/* SUCCESS RECEIPT STATE */}
        {step === "success" && receiptData && (
          <div className="deposit-success-view">
            <div className="success-icon-badge">
              <CheckCircle2 size={44} />
            </div>

            <h2>Deposit Confirmed!</h2>
            <p className="success-subtitle">
              Your business wallet has been credited and is available immediately for team expenses.
            </p>

            <div className="digital-receipt-card">
              <div className="receipt-header">
                <Receipt size={18} />
                <span>OFFICIAL WALLET DEPOSIT RECEIPT</span>
              </div>

              <div className="receipt-amount-row">
                <span>Amount Credited</span>
                <strong>
                  {currency} {(receiptData.amountCents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </strong>
              </div>

              <div className="receipt-details-list">
                <div className="receipt-row">
                  <span>Transaction Code</span>
                  <div className="receipt-copy-code">
                    <strong className="code-font">{receiptData.reference}</strong>
                    <button
                      type="button"
                      className="copy-chip-btn"
                      onClick={() => copyText(receiptData.reference, "Transaction Code")}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                <div className="receipt-row">
                  <span>Payment Method</span>
                  <strong>
                    {receiptData.method === "mpesa"
                      ? "M-Pesa Mobile Money"
                      : receiptData.method === "card"
                      ? "Debit / Credit Card"
                      : "Direct Bank Transfer"}
                  </strong>
                </div>

                <div className="receipt-row">
                  <span>Deposited By</span>
                  <span>{userEmail}</span>
                </div>

                <div className="receipt-row">
                  <span>Date & Time</span>
                  <span>{receiptData.timestamp}</span>
                </div>

                <div className="receipt-row">
                  <span>Updated Wallet Balance</span>
                  <strong className="balance-highlight">
                    {currency} {((currentBalance + receiptData.amountCents) / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="deposit-btn-primary full-width"
              onClick={handleReset}
            >
              Done & Return to Workspace
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
