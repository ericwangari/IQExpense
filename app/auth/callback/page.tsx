"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers3 } from "lucide-react";
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from "@/lib/supabase-browser";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function CallbackLoading({ message = "Completing secure Google sign in…" }: { message?: string }) {
  return (
    <main className="loading">
      <div className="brandmark"><Layers3 /></div>
      <h1>ExpenseIQ <span>Business</span></h1>
      <p>{message}</p>
      <div className="loading-bar" />
    </main>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = useMemo(() => safeNext(params.get("next")), [params]);
  const [message, setMessage] = useState("Completing secure Google sign in…");

  useEffect(() => {
    let alive = true;

    async function finish() {
      if (!hasSupabaseBrowserConfig()) {
        setMessage("Supabase is not configured yet. Add the Vercel environment variables, then redeploy.");
        return;
      }

      const supabase = getSupabaseBrowser();
      const code = params.get("code");
      const error = params.get("error_description") || params.get("error");

      if (error) {
        setMessage(error);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (alive) setMessage(exchangeError.message);
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setMessage("Google sign in did not return a session. Please try again from the login page.");
          return;
        }
      }

      if (!alive) return;
      router.replace(next);
      router.refresh();
    }

    void finish();
    return () => {
      alive = false;
    };
  }, [next, params, router]);

  return <CallbackLoading message={message} />;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
