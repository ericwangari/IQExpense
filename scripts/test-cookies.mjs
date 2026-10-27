import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const out = new URL('../.sites-runtime/tests/', import.meta.url);
mkdirSync(out, { recursive: true });

// Transpile lib/cookies.ts
const code = readFileSync(new URL('../lib/cookies.ts', import.meta.url), 'utf8');
writeFileSync(
  new URL('cookies.mjs', out),
  ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText
);

const {
  COOKIE_KEYS,
  parseCookies,
  getRequestCookie,
  getCookie,
  setCookie,
  deleteCookie,
  getAllCookies,
  syncAuthCookie,
  getAuthTokenCookie,
  clearAuthCookie,
  setActiveBusinessCookie,
  getActiveBusinessCookie,
  clearActiveBusinessCookie,
  getCookieConsent,
  setCookieConsent,
  hasCookieConsent,
  clearCookieConsent,
  getUserPreferences,
  setUserPreferences,
  clearUserPreferences,
} = await import(new URL('cookies.mjs', out));

let checks = 0;

// Test 1: parseCookies
const parsed = parseCookies('foo=bar; expenseiq_auth_token=jwt123; user_pref=%7B%22theme%22%3A%22dark%22%7D');
assert.equal(parsed.foo, 'bar');
assert.equal(parsed[COOKIE_KEYS.AUTH_TOKEN], 'jwt123');
assert.equal(parsed.user_pref, '{"theme":"dark"}');
checks++;

// Test 2: parseCookies edge cases
assert.deepEqual(parseCookies(''), {});
assert.deepEqual(parseCookies(null), {});
assert.deepEqual(parseCookies('   '), {});
assert.deepEqual(parseCookies('empty=; valid=123'), { empty: '', valid: '123' });
checks++;

// Test 3: getRequestCookie
const mockReq = new Request('https://expenseiq.app/api/workspace', {
  headers: {
    cookie: 'session=xyz; expenseiq_auth_token=jwt_secure_token; expenseiq_active_business=biz_7788',
  },
});
assert.equal(getRequestCookie(mockReq, COOKIE_KEYS.AUTH_TOKEN), 'jwt_secure_token');
assert.equal(getRequestCookie(mockReq, COOKIE_KEYS.ACTIVE_BUSINESS), 'biz_7788');
assert.equal(getRequestCookie(mockReq, 'non_existent'), null);
checks++;

// Test 4: Browser document.cookie emulation
let mockCookieStorage = '';
globalThis.document = {
  get cookie() {
    return mockCookieStorage;
  },
  set cookie(val) {
    const [nameVal] = val.split(';');
    const [name, ...valParts] = nameVal.split('=');
    const value = valParts.join('=');
    const isExpired = val.includes('Max-Age=0') || val.includes('Expires=Thu, 01 Jan 1970');

    const currentMap = parseCookies(mockCookieStorage);
    if (isExpired) {
      delete currentMap[name.trim()];
    } else {
      currentMap[name.trim()] = decodeURIComponent(value.trim());
    }

    mockCookieStorage = Object.entries(currentMap)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('; ');
  },
};
globalThis.window = {
  location: { protocol: 'https:', hostname: 'app.expenseiq.com' },
};

// Test 5: setCookie, getCookie, deleteCookie
setCookie('test_cookie', 'hello world');
assert.equal(getCookie('test_cookie'), 'hello world');
deleteCookie('test_cookie');
assert.equal(getCookie('test_cookie'), null);
checks++;

// Test 6: Auth cookie management
syncAuthCookie('supabase.jwt.token.999');
assert.equal(getAuthTokenCookie(), 'supabase.jwt.token.999');
assert.equal(getRequestCookie(new Request('https://app.test', { headers: { cookie: document.cookie } }), COOKIE_KEYS.AUTH_TOKEN), 'supabase.jwt.token.999');
clearAuthCookie();
assert.equal(getAuthTokenCookie(), null);
checks++;

// Test 7: Active workspace cookie persistence
assert.equal(getActiveBusinessCookie(), null);
setActiveBusinessCookie('biz_acme_corp');
assert.equal(getActiveBusinessCookie(), 'biz_acme_corp');
clearActiveBusinessCookie();
assert.equal(getActiveBusinessCookie(), null);
checks++;

// Test 8: Cookie consent & GDPR settings
assert.equal(hasCookieConsent(), false);
const consent = setCookieConsent({ preferences: true, analytics: false });
assert.equal(hasCookieConsent(), true);
assert.equal(consent.essential, true);
assert.equal(consent.preferences, true);
assert.equal(consent.analytics, false);

const readConsent = getCookieConsent();
assert.ok(readConsent);
assert.equal(readConsent.preferences, true);
assert.equal(readConsent.analytics, false);
checks++;

// Test 9: User preferences with consent
setUserPreferences({ defaultPaymentMethod: 'mpesa', compactView: true });
let prefs = getUserPreferences();
assert.equal(prefs.defaultPaymentMethod, 'mpesa');
assert.equal(prefs.compactView, true);
checks++;

// Test 10: Revoking preferences purges saved preferences
setCookieConsent({ preferences: false, analytics: false });
prefs = getUserPreferences();
assert.deepEqual(prefs, {});
checks++;

// Test 11: getAllCookies, clearUserPreferences, clearCookieConsent
setUserPreferences({ defaultPaymentMethod: 'card' });
clearUserPreferences();
assert.deepEqual(getUserPreferences(), {});
clearCookieConsent();
assert.equal(hasCookieConsent(), false);
const all = getAllCookies();
assert.equal(typeof all, 'object');
checks++;

console.log(`${checks} cookie engine unit tests passed: parsing, Request extraction, browser sync, auth session, workspace persistence, consent, and preferences.`);
