"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/attendance/validation";

export function AdminMfa({ next }: { next: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [qr, setQR] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    browserSupabase().auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      const factor = data?.all.find((item) => item.factor_type === "totp" && item.status === "verified");
      if (factor) setFactorId(factor.id);
      if (error) setMessage("Your authentication settings could not be loaded. Please refresh.");
      setLoading(false);
    }).catch(() => { if (active) { setMessage("Authentication is temporarily unavailable. Please refresh."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  async function enroll() {
    setPending(true); setMessage("");
    try {
      const supabase = browserSupabase();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const item of factors?.all || []) {
        if (item.factor_type === "totp" && item.status === "unverified" && item.friendly_name?.startsWith("EIEC admin")) await supabase.auth.mfa.unenroll({ factorId: item.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `EIEC admin ${Date.now()}` });
      if (error || !data) throw new Error("Authenticator setup could not be started. Please try again.");
      setFactorId(data.id);
      setQR(data.totp.qr_code.startsWith("data:image/svg+xml") ? data.totp.qr_code : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Setup failed. Please try again."); }
    finally { setPending(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code from your authenticator app.");
      const { error } = await browserSupabase().auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw new Error("That authenticator code could not be verified. Try the current code from your app.");
      router.replace(safeReturnPath(next)); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verification failed. Please try again."); }
    finally { setPending(false); }
  }

  return <section className="attendance-panel attendance-check-in"><h2>{qr ? "Add EIEC to your authenticator" : factorId ? "Verify admin access" : "Protect your admin account"}</h2><p>Use an authenticator app such as Google Authenticator or Microsoft Authenticator. This is separate from UCSD Duo.</p>
    {loading ? <p role="status">Loading authentication settings…</p> : factorId ? <>
      {qr && <><img className="attendance-mfa-qr" src={qr} width={240} height={240} alt="Scan this setup QR with your authenticator app" /><p className="attendance-hint">Keep this setup QR private. Save this account in your app before continuing. If you lose access to your authenticator, contact the EIEC project owner for recovery.</p></>}
      <form onSubmit={verify}><label htmlFor="authenticator-code">Authenticator code</label><input id="authenticator-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={6} required /><button type="submit" className="attendance-button" disabled={pending}>{pending ? "Verifying…" : "Verify admin access"}</button></form>
    </> : <button type="button" className="attendance-button" disabled={pending} onClick={enroll}>{pending ? "Starting setup…" : "Set up authenticator"}</button>}
    {message && <div className="attendance-notice attendance-notice-error" role="alert">{message}</div>}
  </section>;
}
