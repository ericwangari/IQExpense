"use client";

import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, SlidersHorizontal, X, Check, Lock, Sparkles } from "lucide-react";
import { getCookieConsent, setCookieConsent } from "@/lib/cookies";

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState({
    preferences: true,
    analytics: true,
  });

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      // Delay slightly for smooth appearance
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setPreferences({
        preferences: existing.preferences,
        analytics: existing.analytics,
      });
    }, 0);

    // Global listener so users can reopen cookie settings from workspace footer/settings
    const handleOpenSettings = () => {
      const current = getCookieConsent();
      if (current) {
        setPreferences({
          preferences: current.preferences,
          analytics: current.analytics,
        });
      }
      setShowModal(true);
    };

    window.addEventListener("expenseiq-open-cookie-settings", handleOpenSettings);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("expenseiq-open-cookie-settings", handleOpenSettings);
    };
  }, []);

  if (!showBanner && !showModal) return null;

  const handleAcceptAll = () => {
    setCookieConsent({ preferences: true, analytics: true });
    setShowBanner(false);
    setShowModal(false);
  };

  const handleEssentialOnly = () => {
    setCookieConsent({ preferences: false, analytics: false });
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSaveCustom = () => {
    setCookieConsent(preferences);
    setShowBanner(false);
    setShowModal(false);
  };

  return (
    <>
      {/* Floating Bottom Cookie Consent Banner */}
      {showBanner && !showModal && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="cookie-banner-floating"
        >
          <div className="cookie-banner-content">
            <div className="cookie-icon-wrapper" aria-hidden="true">
              <Cookie size={22} />
            </div>
            <div className="cookie-banner-text">
              <strong>Cookie Preferences & Privacy</strong>
              <p>
                ExpenseIQ uses strictly necessary cookies for secure session
                authentication and workspace persistence. Optional cookies help
                remember your spend preferences and monitor system performance.
              </p>
            </div>
          </div>
          <div className="cookie-banner-actions">
            <button
              type="button"
              className="cookie-btn cookie-btn-primary"
              onClick={handleAcceptAll}
            >
              <Check size={16} /> Accept All
            </button>
            <button
              type="button"
              className="cookie-btn cookie-btn-secondary"
              onClick={handleEssentialOnly}
            >
              Essential Only
            </button>
            <button
              type="button"
              className="cookie-btn cookie-btn-ghost"
              onClick={() => setShowModal(true)}
            >
              <SlidersHorizontal size={15} /> Customize
            </button>
          </div>
        </aside>
      )}

      {/* Cookie Customization Modal */}
      {showModal && (
        <div className="cookie-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
          <div className="cookie-modal-card">
            <div className="cookie-modal-header">
              <div className="cookie-modal-title-group">
                <div className="cookie-modal-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 id="cookie-settings-title">Cookie & Privacy Settings</h2>
                  <p>Choose which cookies you allow on ExpenseIQ Business</p>
                </div>
              </div>
              <button
                type="button"
                className="cookie-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close cookie settings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cookie-modal-body">
              {/* Category 1: Strictly Necessary */}
              <div className="cookie-category-item is-required">
                <div className="cookie-category-main">
                  <div className="cookie-category-title">
                    <Lock size={16} className="text-emerald" />
                    <strong>Strictly Necessary Cookies</strong>
                    <span className="cookie-badge-required">Always Active</span>
                  </div>
                  <p>
                    Essential for secure Supabase authentication, business workspace switching,
                    and cross-site forgery defense. The platform cannot function without these cookies.
                  </p>
                  <div className="cookie-tags">
                    <code>expenseiq_auth_token</code>
                    <code>expenseiq_active_business</code>
                    <code>expenseiq_cookie_consent</code>
                  </div>
                </div>
              </div>

              {/* Category 2: Functional / User Preferences */}
              <div className="cookie-category-item">
                <div className="cookie-category-main">
                  <div className="cookie-category-title">
                    <SlidersHorizontal size={16} className="text-blue" />
                    <strong>Workspace Preferences</strong>
                    <label className="cookie-switch" aria-label="Toggle workspace preferences cookies">
                      <input
                        type="checkbox"
                        checked={preferences.preferences}
                        onChange={(e) =>
                          setPreferences((prev) => ({
                            ...prev,
                            preferences: e.target.checked,
                          }))
                        }
                      />
                      <span className="cookie-slider" />
                    </label>
                  </div>
                  <p>
                    Remembers your preferred payment methods (e.g., M-Pesa vs Card),
                    compact tables, allowance trackers, and filtered search state.
                  </p>
                  <div className="cookie-tags">
                    <code>expenseiq_user_prefs</code>
                  </div>
                </div>
              </div>

              {/* Category 3: Analytics & System Health */}
              <div className="cookie-category-item">
                <div className="cookie-category-main">
                  <div className="cookie-category-title">
                    <Sparkles size={16} className="text-purple" />
                    <strong>Performance & Health Telemetry</strong>
                    <label className="cookie-switch" aria-label="Toggle performance cookies">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) =>
                          setPreferences((prev) => ({
                            ...prev,
                            analytics: e.target.checked,
                          }))
                        }
                      />
                      <span className="cookie-slider" />
                    </label>
                  </div>
                  <p>
                    Enables live platform latency tracking, API error rate monitoring,
                    and SaaS availability diagnostics for company workspace administrators.
                  </p>
                </div>
              </div>
            </div>

            <div className="cookie-modal-footer">
              <button
                type="button"
                className="cookie-btn cookie-btn-secondary"
                onClick={handleEssentialOnly}
              >
                Essential Only
              </button>
              <div className="cookie-modal-footer-right">
                <button
                  type="button"
                  className="cookie-btn cookie-btn-ghost"
                  onClick={handleSaveCustom}
                >
                  Save My Choices
                </button>
                <button
                  type="button"
                  className="cookie-btn cookie-btn-primary"
                  onClick={handleAcceptAll}
                >
                  <Check size={16} /> Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Utility helper that any button or link can call to trigger the cookie settings dialog.
 */
export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("expenseiq-open-cookie-settings"));
  }
}
