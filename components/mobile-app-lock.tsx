
"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';

type LockState = 'checking' | 'off' | 'setup' | 'locked' | 'unlocked';

type StoredLock = {
  salt: string;
  pinHash: string;
  biometricCredentialId?: string;
};

const LOCK_KEY = 'expenseiq-mobile-app-lock';
const LAST_UNLOCK_KEY = 'expenseiq-mobile-app-last-unlock';
const UNLOCK_TTL_MS = 2 * 60 * 1000;

const textEncoder = new TextEncoder();
const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const randomBase64 = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

function readLock(): StoredLock | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? JSON.parse(raw) as StoredLock : null;
  } catch {
    return null;
  }
}

function isInstalledMobileApp() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  return standalone && mobile;
}

async function biometricAvailable() {
  if (!('PublicKeyCredential' in window) || !navigator.credentials) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function MobileAppLock({ email }: { email: string }) {
  const [state, setState] = useState<LockState>('checking');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [lock, setLock] = useState<StoredLock | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!isInstalledMobileApp()) {
        if (live) setState('off');
        return;
      }

      const stored = readLock();
      const lastUnlock = Number(localStorage.getItem(LAST_UNLOCK_KEY) || 0);
      if (live) {
        setLock(stored);
        setCanUseBiometric(await biometricAvailable());
        if (!stored) setState('setup');
        else setState(Date.now() - lastUnlock < UNLOCK_TTL_MS ? 'unlocked' : 'locked');
      }
    })();

    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (state !== 'unlocked') return;
    const lockWhenHidden = () => {
      if (document.visibilityState === 'hidden') localStorage.setItem(LAST_UNLOCK_KEY, String(Date.now()));
      if (document.visibilityState === 'visible') {
        const lastUnlock = Number(localStorage.getItem(LAST_UNLOCK_KEY) || 0);
        if (readLock() && Date.now() - lastUnlock >= UNLOCK_TTL_MS) setState('locked');
      }
    };
    document.addEventListener('visibilitychange', lockWhenHidden);
    return () => document.removeEventListener('visibilitychange', lockWhenHidden);
  }, [state]);

  if (state === 'checking' || state === 'off' || state === 'unlocked') return null;

  async function savePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!/^\d{4,8}$/.test(pin)) {
      setMessage('Use a PIN with 4 to 8 numbers.');
      return;
    }
    if (pin !== confirmPin) {
      setMessage('The PIN confirmation does not match.');
      return;
    }

    setBusy(true);
    try {
      const salt = randomBase64(16);
      const pinHash = await sha256(`${salt}:${normalizedEmail}:${pin}`);
      const next = { salt, pinHash };
      localStorage.setItem(LOCK_KEY, JSON.stringify(next));
      localStorage.setItem(LAST_UNLOCK_KEY, String(Date.now()));
      setLock(next);
      setState('unlocked');
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!lock) return;
    setBusy(true);
    try {
      const pinHash = await sha256(`${lock.salt}:${normalizedEmail}:${pin}`);
      if (pinHash !== lock.pinHash) {
        setMessage('Incorrect PIN. Try again.');
        return;
      }
      localStorage.setItem(LAST_UNLOCK_KEY, String(Date.now()));
      setPin('');
      setState('unlocked');
    } finally {
      setBusy(false);
    }
  }

  async function setupBiometrics() {
    if (!lock || !canUseBiometric) return;
    setBusy(true);
    setMessage('');
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64ToBytes(randomBase64(32)),
          rp: { name: 'ExpenseIQ Business' },
          user: { id: textEncoder.encode(normalizedEmail).slice(0, 64), name: normalizedEmail, displayName: normalizedEmail },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
          timeout: 60000,
          attestation: 'none',
        },
      }) as PublicKeyCredential | null;
      if (!credential) return;
      const next = { ...lock, biometricCredentialId: bytesToBase64(new Uint8Array(credential.rawId)) };
      localStorage.setItem(LOCK_KEY, JSON.stringify(next));
      setLock(next);
      setMessage('Biometric unlock is now enabled on this device.');
    } catch {
      setMessage('Biometric setup was cancelled or is not available on this device.');
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithBiometrics() {
    if (!lock?.biometricCredentialId) return;
    setBusy(true);
    setMessage('');
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: base64ToBytes(randomBase64(32)),
          allowCredentials: [{ type: 'public-key', id: base64ToBytes(lock.biometricCredentialId) }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (!credential) return;
      localStorage.setItem(LAST_UNLOCK_KEY, String(Date.now()));
      setState('unlocked');
    } catch {
      setMessage('Biometric unlock was cancelled. Use your PIN instead.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mobile-lock-screen" role="dialog" aria-modal="true" aria-label="ExpenseIQ app lock">
      <section className="mobile-lock-card">
        <span className="mobile-lock-icon"><LockKeyhole size={25} /></span>
        <p className="eyebrow">INSTALLED APP SECURITY</p>
        <h1>{state === 'setup' ? 'Create your app PIN' : 'Unlock ExpenseIQ'}</h1>
        <p className="mobile-lock-copy">
          This lock only applies to the installed mobile app on this phone. Your normal browser login remains unchanged.
        </p>

        {state === 'setup' ? (
          <form className="app-form" onSubmit={savePin}>
            <label>New PIN<input value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" autoComplete="off" type="password" placeholder="4-8 digits" /></label>
            <label>Confirm PIN<input value={confirmPin} onChange={event => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" autoComplete="off" type="password" placeholder="Repeat PIN" /></label>
            {message ? <p className="form-error">{message}</p> : null}
            <button className="primary" disabled={busy} type="submit"><ShieldCheck size={17} /> Save PIN</button>
          </form>
        ) : (
          <form className="app-form" onSubmit={unlockWithPin}>
            {lock?.biometricCredentialId ? <button className="secondary" disabled={busy} type="button" onClick={() => void unlockWithBiometrics()}><Fingerprint size={18} /> Unlock with biometrics</button> : null}
            <label>PIN<input value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" autoComplete="off" type="password" placeholder="Enter PIN" /></label>
            {message ? <p className={message.includes('enabled') ? 'success-note' : 'form-error'}>{message}</p> : null}
            <button className="primary" disabled={busy} type="submit"><LockKeyhole size={17} /> Unlock app</button>
            {canUseBiometric && !lock?.biometricCredentialId ? <button className="secondary" disabled={busy} type="button" onClick={() => void setupBiometrics()}><Fingerprint size={18} /> Enable biometrics</button> : null}
          </form>
        )}
      </section>
    </div>
  );
}
