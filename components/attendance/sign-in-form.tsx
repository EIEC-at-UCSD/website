"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { browserSupabase } from "@/lib/supabase/client";
import { safeReturnPath, validateDisplayName } from "@/lib/attendance/validation";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [join, setJoin] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const canonicalEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@ucsd\.edu$/.test(canonicalEmail) || canonicalEmail.length > 254) {
      setMessage("Use your @ucsd.edu email address."); return;
    }
    setPending(true);
    try {
      const supabase = browserSupabase();
      if (!sent) {
        const displayName = join ? validateDisplayName(name) : undefined;
        const { error } = await supabase.auth.signInWithOtp({ email: canonicalEmail, options: {
          shouldCreateUser: join,
          ...(displayName ? { data: { display_name: displayName } } : {}),
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(next))}`,
        } });
        if (error) throw new Error("We couldn’t send a code. Check the address, wait a moment, or choose Create account if you’re new.");
        setSent(true);
      } else {
        if (!/^\d{6,10}$/.test(code.trim())) throw new Error("Enter the numeric sign-in code from your email.");
        const { data, error } = await supabase.auth.verifyOtp({ email: canonicalEmail, token: code.trim(), type: "email" });
        if (error || !data.user?.email_confirmed_at || data.user.email?.toLowerCase() !== canonicalEmail) throw new Error("That code is invalid or expired. Try again or request a new code.");
        router.replace(safeReturnPath(next));
        router.refresh();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in is temporarily unavailable. Please try again."); }
    finally { setPending(false); }
  }

  return <section className="attendance-panel attendance-check-in">
    {!sent && <div className="attendance-button-row" role="group" aria-label="Account action"><button type="button" className={`attendance-button${join ? " attendance-button-secondary" : ""}`} aria-pressed={!join} onClick={() => { setJoin(false); setMessage(""); }}>Sign in</button><button type="button" className={`attendance-button${!join ? " attendance-button-secondary" : ""}`} aria-pressed={join} onClick={() => { setJoin(true); setMessage(""); }}>Create account</button></div>}
    <h2 className="attendance-section">{sent ? "Check your UCSD email" : join ? "Join the EIEC community" : "Welcome back"}</h2>
    <p>{sent ? `Enter the sign-in code sent to ${email.trim().toLowerCase()}.` : "Use your UCSD email. We’ll send a one-time sign-in code, so there’s no password to remember."}</p>
    <form onSubmit={submit}>
      {!sent ? <>
        {join && <><label htmlFor="member-name">Your name</label><input id="member-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></>}
        <label htmlFor="member-email">UCSD email</label><input id="member-email" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@ucsd.edu" maxLength={254} required />
        {join && <label className="attendance-checkbox"><input type="checkbox" required /><span>I’ve read the <Link href="/privacy" className="attendance-text-link">account and attendance privacy notice</Link>.</span></label>}
      </> : <><label htmlFor="sign-in-code">Email sign-in code</label><input id="sign-in-code" name="token" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={10} required autoFocus /></>}
      {message && <div className="attendance-notice attendance-notice-error" role="alert">{message}</div>}
      <button type="submit" className="attendance-button" disabled={pending}>{pending ? "Please wait…" : sent ? "Verify and continue" : "Send sign-in code"}</button>
      {sent && <button type="button" className="attendance-button attendance-button-secondary" disabled={pending} onClick={() => { setSent(false); setCode(""); setMessage(""); }}>Use another email or request a new code</button>}
    </form>
  </section>;
}
