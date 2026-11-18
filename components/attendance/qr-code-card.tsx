"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCodeCard({ code, url, eventTitle, closesAt }: {
  code: string;
  url: string;
  eventTitle: string;
  closesAt: string;
}) {
  const [image, setImage] = useState("");
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setImage("");
    setFailed(false);
    QRCode.toDataURL(url, { width: 400, margin: 3, errorCorrectionLevel: "M", color: { dark: "#050b15", light: "#ffffff" } }).then((value) => { if (active) setImage(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [url]);

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setCopied(false); }
  }

  return <section className="attendance-panel attendance-qr-card" aria-label={`Check-in code for ${eventTitle}`}>
    <p className="attendance-eyebrow">Check-in is open</p><h2>{eventTitle}</h2>
    {image ? <img src={image} width={320} height={320} alt={`QR code to check in to ${eventTitle}`} /> : <p role="status">{failed ? "The QR could not be generated. Members can enter the code below." : "Generating QR code…"}</p>}
    <p className="attendance-hint">Or enter this code on the check-in page</p>
    <p className="attendance-display-code">{code}</p>
    <div className="attendance-button-row"><button className="attendance-button attendance-button-secondary" type="button" onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button>{image && <a href={image} download="eiec-event-check-in.png" className="attendance-button attendance-button-secondary">Download QR</a>}</div>
    <p className="attendance-hint">Closes {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(new Date(closesAt))} Pacific time.</p>
    <p className="attendance-hint">This code is shown only here. Generate a replacement if you leave this page. A replacement invalidates the previous code.</p>
  </section>;
}
