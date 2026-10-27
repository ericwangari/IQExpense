/**
 * ExpenseIQ Cookies Management Engine
 *
 * Provides resilient, dual-environment cookie parsing and setting for both
 * client-side (browser document.cookie) and server-side (Next.js / Vinext Request headers).
 *
 * Handles:
 * 1. Supabase auth token session persistence & cross-route verification
 * 2. Active business workspace memory across page reloads
 * 3. GDPR / ePrivacy compliant cookie consent preferences
 * 4. User interface and workflow preferences (payment method, compact view, currency)
 */

export const COOKIE_KEYS = {
  AUTH_TOKEN: 'expenseiq_auth_token',
  ACTIVE_BUSINESS: 'expenseiq_active_business',
  CONSENT: 'expenseiq_cookie_consent',
  PREFERENCES: 'expenseiq_user_prefs',
} as const;

export type CookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];

export interface CookieOptions {
  path?: string;
  maxAge?: number; // In seconds
  expires?: Date;
  domain?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  partitioned?: boolean;
}

export interface CookieConsent {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  timestamp: string;
  version: number;
}

export interface UserPreferences {
  defaultPaymentMethod?: 'mpesa' | 'card' | 'bank' | 'cash';
  compactView?: boolean;
  currency?: string;
  showAllowanceTracker?: boolean;
}

const DEFAULT_OPTIONS: CookieOptions = {
  path: '/',
  sameSite: 'lax',
};

const CONSENT_VERSION = 1;

/**
 * Determine whether running in a secure browser context (HTTPS or localhost).
 */
function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

/**
 * Parse a raw Cookie header into key-value pairs (Server & Node compatible).
 */
export function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const rawVal = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }

  return cookies;
}

/**
 * Extract a named cookie directly from a standard Request instance.
 */
export function getRequestCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  const parsed = parseCookies(header);
  return parsed[name] ?? null;
}

/**
 * Read a cookie on the client side. Returns null if missing or running on server.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${encodeURIComponent(name)}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Set a cookie on the client side with secure defaults.
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  const merged: CookieOptions = {
    ...DEFAULT_OPTIONS,
    secure: options.secure !== undefined ? options.secure : isSecureContext(),
    ...options,
  };

  let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (merged.path) cookieStr += `; Path=${merged.path}`;
  if (merged.domain) cookieStr += `; Domain=${merged.domain}`;
  if (typeof merged.maxAge === 'number') {
    cookieStr += `; Max-Age=${Math.max(0, Math.floor(merged.maxAge))}`;
  } else if (merged.expires instanceof Date) {
    cookieStr += `; Expires=${merged.expires.toUTCString()}`;
  }

  if (merged.sameSite) {
    const capitalized = merged.sameSite.charAt(0).toUpperCase() + merged.sameSite.slice(1);
    cookieStr += `; SameSite=${capitalized}`;
  }

  if (merged.secure) {
    cookieStr += '; Secure';
  }

  if (merged.partitioned) {
    cookieStr += '; Partitioned';
  }

  document.cookie = cookieStr;
}

/**
 * Delete a cookie by expiring it immediately.
 */
export function deleteCookie(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): void {
  if (typeof document === 'undefined') return;
  setCookie(name, '', {
    path: options?.path ?? '/',
    domain: options?.domain,
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Read all cookies available in the document.
 */
export function getAllCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  return parseCookies(document.cookie);
}

// ---------------------------------------------------------------------------
// High-Level Domain Helpers: Authentication Session
// ---------------------------------------------------------------------------

/**
 * Synchronize the Supabase session token into an accessible cookie.
 * Allows instant SSR rendering, server API requests, and background worker checks.
 */
export function syncAuthCookie(token: string | null | undefined, maxAgeSeconds = 60 * 60 * 24 * 7): void {
  if (!token) {
    clearAuthCookie();
    return;
  }
  // Store session token with 7 days retention by default
  setCookie(COOKIE_KEYS.AUTH_TOKEN, token, {
    maxAge: maxAgeSeconds,
    path: '/',
    sameSite: 'lax',
  });
}

export function getAuthTokenCookie(): string | null {
  return getCookie(COOKIE_KEYS.AUTH_TOKEN);
}

export function clearAuthCookie(): void {
  deleteCookie(COOKIE_KEYS.AUTH_TOKEN, { path: '/' });
}

// ---------------------------------------------------------------------------
// High-Level Domain Helpers: Active Business Workspace Persistence
// ---------------------------------------------------------------------------

/**
 * Save user's selected business workspace so page reloads immediately load
 * into the right workspace without waiting or resetting.
 */
export function setActiveBusinessCookie(businessId: string): void {
  if (!businessId) return;
  setCookie(COOKIE_KEYS.ACTIVE_BUSINESS, businessId, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
    sameSite: 'lax',
  });
}

export function getActiveBusinessCookie(): string | null {
  return getCookie(COOKIE_KEYS.ACTIVE_BUSINESS);
}

export function clearActiveBusinessCookie(): void {
  deleteCookie(COOKIE_KEYS.ACTIVE_BUSINESS, { path: '/' });
}

// ---------------------------------------------------------------------------
// High-Level Domain Helpers: Cookie Consent & GDPR / Privacy Banner
// ---------------------------------------------------------------------------

export function getCookieConsent(): CookieConsent | null {
  const raw = getCookie(COOKIE_KEYS.CONSENT);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed && typeof parsed === 'object' && parsed.essential === true) {
      return parsed;
    }
  } catch {
    // Malformed cookie, ignore
  }
  return null;
}

export function hasCookieConsent(): boolean {
  return getCookieConsent() !== null;
}

export function setCookieConsent(preferences: {
  preferences: boolean;
  analytics: boolean;
}): CookieConsent {
  const consent: CookieConsent = {
    essential: true,
    preferences: Boolean(preferences.preferences),
    analytics: Boolean(preferences.analytics),
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  setCookie(COOKIE_KEYS.CONSENT, JSON.stringify(consent), {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
    sameSite: 'lax',
  });

  // If user declined preferences, purge preference cookies
  if (!consent.preferences) {
    clearUserPreferences();
  }

  return consent;
}

export function clearCookieConsent(): void {
  deleteCookie(COOKIE_KEYS.CONSENT, { path: '/' });
}

// ---------------------------------------------------------------------------
// High-Level Domain Helpers: User Experience Preferences
// ---------------------------------------------------------------------------

export function getUserPreferences(): UserPreferences {
  const raw = getCookie(COOKIE_KEYS.PREFERENCES);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UserPreferences;
  } catch {
    return {};
  }
}

export function setUserPreferences(updates: Partial<UserPreferences>): void {
  // Only save if user hasn't explicitly disabled preference cookies
  const consent = getCookieConsent();
  if (consent && !consent.preferences) {
    return;
  }

  const current = getUserPreferences();
  const next: UserPreferences = { ...current, ...updates };

  setCookie(COOKIE_KEYS.PREFERENCES, JSON.stringify(next), {
    maxAge: 60 * 60 * 24 * 180, // 6 months
    path: '/',
    sameSite: 'lax',
  });
}

export function clearUserPreferences(): void {
  deleteCookie(COOKIE_KEYS.PREFERENCES, { path: '/' });
}
