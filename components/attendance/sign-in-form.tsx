"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { browserSupabase } from "@/lib/supabase/client";
import { normalizeMemberEmail, safeReturnPath, validateDisplayName, validateNewPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/attendance/validation";

type Mode = "sign-in" | "create" | "reset";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [canResend, setCanResend] = useState(false);

  function chooseMode(value: Mode) {
    setMode(value); setSent(false); setCode(""); setPassword(""); setConfirmation(""); setMessage(""); setCanResend(false);
  }

  async function resendConfirmation() {
    setPending(true); setMessage("");
    try {
      const canonicalEmail = normalizeMemberEmail(email);
      const { error } = await browserSupabase().auth.resend({ type: "signup", email: canonicalEmail, options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(next))}`,
      } });
      if (error) throw new Error("We couldn’t request another verification email. Wait a moment and try again.");
      setMode("create"); setSent(true); setCode(""); setPassword(""); setConfirmation(""); setCanResend(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verification is temporarily unavailable."); }
    finally { setPending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setCanResend(false); setPending(true);
    try {
      const canonicalEmail = normalizeMemberEmail(email);
      const supabase = browserSupabase();
      if (sent) {
        if (!/^\d{6,10}$/.test(code.trim())) throw new Error("Enter the numeric verification code from your email.");
        const { data, error } = await supabase.auth.verifyOtp({ email: canonicalEmail, token: code.trim(), type: mode === "reset" ? "recovery" : "email" });
        if (error) throw new Error("That code is invalid or expired. Try again or request a new email.");
        if (!data.user?.email_confirmed_at || data.user.email?.toLowerCase() !== canonicalEmail) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("The email could not be verified. Return to sign in and try again.");
        }
        setCode(""); router.replace(mode === "reset" ? "/account/password" : safeReturnPath(next)); router.refresh();
      } else if (mode === "create") {
        const displayName = validateDisplayName(name);
        const newPassword = validateNewPassword(password, confirmation);
        const { data, error } = await supabase.auth.signUp({ email: canonicalEmail, password: newPassword, options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(next))}`,
        } });
        if (error) throw new Error(error.code === "weak_password" ? "Choose a stronger password and try again." : "We couldn’t create the account. Try again later, or sign in or reset your password if you already registered.");
        if (data.session) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("Registration is temporarily unavailable. Please contact EIEC.");
        }
        setPassword(""); setConfirmation(""); setSent(true);
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(canonicalEmail, { redirectTo: `${window.location.origin}/auth/callback?next=/account/password` });
        if (error) throw new Error("We couldn’t request a password reset. Wait a moment and try again.");
        // Same response for existing and unknown accounts.
        setSent(true); setPassword(""); setConfirmation("");
      } else {
        if (!password || password.length > 512) throw new Error("Enter your password.");
        const { data, error } = await supabase.auth.signInWithPassword({ email: canonicalEmail, password });
        if (error) {
          if (error.code === "email_not_confirmed") {
            setCanResend(true);
            throw new Error("Verify your UCSD email before signing in. You can request another verification email below.");
          }
          throw new Error("We couldn’t sign you in. Check your email and password, or use Forgot password.");
        }
        if (!data.user?.email_confirmed_at || data.user.email?.toLowerCase() !== canonicalEmail) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("A verified UCSD account is required. Please sign in again.");
        }
        setPassword(""); router.replace(safeReturnPath(next)); router.refresh();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Account access is temporarily unavailable. Please try again."); }
    finally { setPending(false); }
  }

  const join = mode === "create";
  const reset = mode === "reset";
  return <section className="attendance-panel attendance-check-in">
    {!sent && <div className="attendance-button-row" role="group" aria-label="Account action"><button type="button" disabled={pending} className={`attendance-button${mode !== "sign-in" ? " attendance-button-secondary" : ""}`} aria-pressed={mode === "sign-in"} onClick={() => chooseMode("sign-in")}>Sign in</button><button type="button" disabled={pending} className={`attendance-button${!join ? " attendance-button-secondary" : ""}`} aria-pressed={join} onClick={() => chooseMode("create")}>Create account</button></div>}
    <h2 className="attendance-section">{sent ? "Check your UCSD email" : join ? "Join the EIEC community" : reset ? "Reset your password" : "Welcome back"}</h2>
    <p>{sent ? reset ? "If an account exists for this address, you’ll receive a password reset code. Enter it below to choose a new password." : "If registration can continue for this address, you’ll receive an email verification code. Verify once, then use your password for future sign-ins." : join ? "Create an EIEC password and verify your UCSD email to finish registering." : reset ? "Enter your UCSD email to request a password reset code." : "Sign in with your UCSD email and EIEC password."}</p>
    <form onSubmit={submit}>
      {!sent ? <>
        {join && <><label htmlFor="member-name">Your name</label><input id="member-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} disabled={pending} required /></>}
        <label htmlFor="member-email">UCSD email</label><input id="member-email" type="email" name="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setCanResend(false); }} placeholder="you@ucsd.edu" maxLength={254} disabled={pending} required />
        {!reset && <><label htmlFor="member-password">{join ? "Create password" : "Password"}</label><input id="member-password" name="password" type="password" autoComplete={join ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={join ? PASSWORD_MIN_LENGTH : undefined} maxLength={join ? PASSWORD_MAX_LENGTH : 512} aria-describedby={join ? "password-help" : undefined} disabled={pending} required />{join && <><p id="password-help" className="attendance-hint">Use at least {PASSWORD_MIN_LENGTH} characters. A unique passphrase works well.</p><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="passwordConfirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} maxLength={PASSWORD_MAX_LENGTH} disabled={pending} required /></>}</>}
        {join && <label className="attendance-checkbox"><input type="checkbox" disabled={pending} required /><span>I’ve read the <Link href="/privacy" className="attendance-text-link">account and attendance privacy notice</Link>.</span></label>}
      </> : <><p className="attendance-hint">Email: {email.trim().toLowerCase()}</p><label htmlFor="email-verification-code">{reset ? "Password reset code" : "Email verification code"}</label><input id="email-verification-code" name="token" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={10} disabled={pending} required autoFocus /></>}
      {message && <div className="attendance-notice attendance-notice-error" role="alert">{message}</div>}
      <button type="submit" className="attendance-button" disabled={pending}>{pending ? "Please wait…" : sent ? reset ? "Verify reset code" : "Verify email and continue" : join ? "Create account" : reset ? "Send password reset code" : "Sign in"}</button>
      {canResend && <button type="button" className="attendance-button attendance-button-secondary" disabled={pending} onClick={resendConfirmation}>Resend verification code</button>}
      {!sent && !join && <button type="button" className="attendance-button attendance-button-secondary" disabled={pending} onClick={() => chooseMode(reset ? "sign-in" : "reset")}>{reset ? "Back to sign in" : "Forgot password?"}</button>}
      {sent && <button type="button" className="attendance-button attendance-button-secondary" disabled={pending} onClick={() => chooseMode("sign-in")}>Back to sign in</button>}
      {sent && <button type="button" className="attendance-button attendance-button-secondary" disabled={pending} onClick={reset ? () => { setSent(false); setCode(""); setMessage(""); } : resendConfirmation}>{reset ? "Request another reset code" : "Request another verification code"}</button>}
    </form>
  </section>;
}
