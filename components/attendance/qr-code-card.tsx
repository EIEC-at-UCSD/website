"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const when = (iso: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(new Date(iso));

/** draws the qr in the browser, so the event code never goes to an image service */
export function QrCodeCard({ code, url, eventTitle, opensAt, closesAt }: {
  code: string; url: string; eventTitle: string; opensAt: string; closesAt: string;
}) {
  const [image, setImage] = useState("");
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // refresh the clock when the window changes and every few seconds after
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [opensAt, closesAt]);
  const scheduled = new Date(opensAt).getTime() > now;
  const shown = `${code.slice(0, 5)}-${code.slice(5)}`;

  useEffect(() => {
    let active = true;
    setImage("");
    setFailed(false);
    QRCode.toDataURL(url, { width: 640, margin: 3, errorCorrectionLevel: "M", color: { dark: "#050b15", light: "#ffffff" } })
      .then((value) => { if (active) setImage(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [url]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPresenting(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [presenting]);

  async function copyCode() {
    try { await navigator.clipboard.writeText(shown); setCopied(true); }
    catch { setCopied(false); }
  }

  return <section className={`attendance-panel attendance-qr-card${presenting ? " attendance-qr-present" : ""}`} aria-label={`Check-in code for ${eventTitle}`}>
    <p className="attendance-eyebrow">{scheduled ? `Check-in opens ${when(opensAt)}` : "Check-in is open"}</p>
    <h2>{eventTitle}</h2>
    {image
      ? <img src={image} width={320} height={320} alt={`QR code to check in to ${eventTitle}`} />
      : <p role="status">{failed ? "We couldn’t draw the QR code, but members can still check in by entering the code below." : "Generating QR code…"}</p>}
    <p className="attendance-hint">Members can also type this code in on the Check in page</p>
    <p className="attendance-display-code">{shown}</p>
    <div className="attendance-button-row">
      <button className="attendance-button" type="button" onClick={() => setPresenting(!presenting)}>{presenting ? "Exit (Esc)" : "Present"}</button>
      {!presenting && <button className="attendance-button attendance-button-secondary" type="button" onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button>}
      {!presenting && image && <a href={image} download="eiec-event-check-in.png" className="attendance-button attendance-button-secondary">Download QR</a>}
    </div>
    <p className="attendance-hint">Check-in closes {when(closesAt)} Pacific time, and this QR will stay right here until then, so it’s safe to reload the page.</p>
  </section>;
}
