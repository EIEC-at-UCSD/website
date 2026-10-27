"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [["/", "Home"], ["/projects", "Projects"], ["/recruitment", "Recruitment"], ["/events", "Events"]];

export function Navigation({ hackathon = false }: { hackathon?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <nav aria-label="Main navigation">
    <Link href={hackathon ? "/hackathon" : "/"} className="nav-logo" onClick={() => setOpen(false)}>
      <img src="/EIEC%20Logo.png" alt="EIEC logo" className={hackathon ? "eiec-logo" : undefined} width={44} height={44} />
      {hackathon ? <><span className="x">×</span><img src="/hackathon/SOPE.png" alt="SoPE logo" className="mark" /></> : <>EIEC <span>✦</span></>}
    </Link>
    {!hackathon && <Link href="/hackathon" className="nav-announce"><span className="nav-announce-text">2026 · SoPE Hackathon</span><span className="nav-announce-arrow">→</span></Link>}
    <div id={hackathon ? "hackathon-navigation" : "site-navigation"} className={`nav-links${open ? " open" : ""}`}>
      {hackathon ? <>
        {["Why", "Format", "Schedule", "FAQ"].map((label, i) => <a key={label} href={`#${["why", "challenge", "schedule", "faq"][i]}`} onClick={() => setOpen(false)}>{label}</a>)}
        <Link href="/" className="nav-link-home" onClick={() => setOpen(false)}>EIEC Home</Link>
      </> : links.map(([href, label]) => <Link key={href} href={href} className={pathname === href ? "active" : undefined} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
    </div>
    {hackathon && <a href="https://docs.google.com/forms/d/1QGaiU10ki5ufS47aFEy7snF__JctijDUYjaYoNR4EHI/viewform" target="_blank" rel="noopener noreferrer" className="nav-cta">Interested? →</a>}
    <button type="button" className="nav-mobile-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls={hackathon ? "hackathon-navigation" : "site-navigation"} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}><span /><span /><span /></button>
  </nav>;
}

export function Footer() {
  return <footer><span className="footer-text">EIEC · Engineering Innovators &amp; Entrepreneurs · <span>UCSD</span></span><div className="footer-links">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</div></footer>;
}
