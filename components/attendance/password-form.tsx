"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { browserSupabase } from "@/lib/supabase/client";
import { validateNewPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/attendance/validation";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      const newPassword = validateNewPassword(password, confirmation);
      const supabase = browserSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email_confirmed_at || !/^[^@\s]+@ucsd\.edu$/i.test(user.email || "")) throw new Error("Your session has timed out, so please head back to sign in and request a new reset code.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.code === "weak_password" ? "That password is a little too easy to guess, so please choose a stronger one and try again." : "We couldn’t save that password, so try a different one, or head back to sign in and request a new reset code.");
      setPassword(""); setConfirmation(""); setComplete(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong on our end, so please try again in a moment."); }
    finally { setPending(false); }
  }

  return <section className="attendance-panel attendance-check-in">{complete ? <><div className="attendance-notice attendance-notice-success" role="status">Your password is updated, and you can use it the next time you sign in.</div><Link href="/account" className="attendance-button">Continue to my account</Link></> : <form onSubmit={submit}>
    <label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} disabled={pending} aria-describedby="new-password-help" required />
    <p id="new-password-help" className="attendance-hint">Pick something at least {PASSWORD_MIN_LENGTH} characters long that you don’t use anywhere else.</p>
    <label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" name="passwordConfirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} maxLength={PASSWORD_MAX_LENGTH} disabled={pending} required />
    {message && <div className="attendance-notice attendance-notice-error" role="alert">{message}</div>}
    <button className="attendance-button" type="submit" disabled={pending}>{pending ? "Updating…" : "Save new password"}</button>
    <Link className="attendance-text-link" href="/sign-in">Return to sign in</Link>
  </form>}</section>;
}
