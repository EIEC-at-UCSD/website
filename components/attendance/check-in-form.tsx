"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { normalizeEventCode } from "@/lib/attendance/validation";
import { initialFormState, type CheckInAction } from "@/lib/attendance/types";

const storageKey = "eiec.pending-check-in";
const pendingCodeLifetime = 10 * 60 * 1000;

export function CheckInForm({ action, signedIn }: { action: CheckInAction; signedIn: boolean }) {
  const [code, setCode] = useState("");
  const [ready, setReady] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanVersion, setScanVersion] = useState(0);

  useEffect(() => {
    function restoreCode() {
      let fromQR: string | null = null;
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const hasQR = fragment.has("code");
      if (hasQR) {
        // Reset a previous event's success state when another QR is scanned.
        setScanVersion((version) => version + 1);
        try { fromQR = normalizeEventCode(fragment.get("code")); setScanError(""); }
        catch { setScanError("This QR code could not be read. Enter the event code shown by the organizer."); }
        setCode(fromQR || "");
        window.history.replaceState(null, "", window.location.pathname);
      }
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        const savedCode = saved && typeof saved.createdAt === "number" && saved.createdAt <= Date.now() && Date.now() - saved.createdAt < pendingCodeLifetime ? normalizeEventCode(saved.code) : null;
        const nextCode = hasQR ? fromQR : savedCode;
        if (nextCode) {
          setCode(nextCode);
          sessionStorage.setItem(storageKey, JSON.stringify({ code: nextCode, createdAt: Date.now() }));
        } else { sessionStorage.removeItem(storageKey); }
      } catch {
        // Browsers may disable storage. A scanned or manual code still works.
      }
      setReady(true);
    }
    restoreCode();
    window.addEventListener("hashchange", restoreCode);
    return () => window.removeEventListener("hashchange", restoreCode);
  }, []);

  return <CheckInSubmission key={scanVersion} {...{ action, signedIn, code, setCode, ready, scanError }} />;
}

function CheckInSubmission({ action, signedIn, code, setCode, ready, scanError }: {
  action: CheckInAction; signedIn: boolean; code: string; setCode: (code: string) => void; ready: boolean; scanError: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  useEffect(() => {
    if (state.status === "success") {
      try { sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
    }
  }, [state.status]);

  function preserveCode() {
    try {
      sessionStorage.removeItem(storageKey);
      sessionStorage.setItem(storageKey, JSON.stringify({ code: normalizeEventCode(code), createdAt: Date.now() }));
    } catch { /* An invalid code can be corrected after sign-in. */ }
  }

  return <section className="attendance-panel attendance-check-in">
    <h2>Enter your event code</h2>
    <p>You’ll find the code on the slides at your event, or you can scan the QR with your phone’s camera and we’ll fill it in for you.</p>
    <form action={formAction}>
      <label htmlFor="event-code">Event code</label>
      <input id="event-code" name="code" className="attendance-code-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="ABCDE-23456" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={40} required aria-describedby="event-code-help" readOnly={state.status === "success"} />
      <p id="event-code-help" className="attendance-hint">Codes are 10 letters and numbers, and each event only counts once, so there’s no need to check in twice.</p>
      {scanError && <div className="attendance-notice attendance-notice-error" role="alert">{scanError}</div>}
      {state.message && <div className={`attendance-notice attendance-notice-${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</div>}
      {signedIn ? <button className="attendance-button" type="submit" disabled={pending || state.status === "success"}>{pending ? "Checking in…" : state.status === "success" ? "Attendance recorded" : "Check in"}</button> : <Link href="/sign-in?next=/check-in" onClick={(event) => { if (!ready) event.preventDefault(); else preserveCode(); }} className="attendance-button" aria-disabled={!ready}>Sign in to check in</Link>}
    </form>
    {!signedIn && <p className="attendance-hint">Once you’re signed in we’ll bring you right back here to finish checking in, and if the code isn’t filled in, just scan the QR again.</p>}
    {state.status === "success" && <Link href="/account" className="attendance-text-link">View my attendance</Link>}
  </section>;
}
