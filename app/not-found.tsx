import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="section not-found"><div className="section-eyebrow">404 · Page not found</div><h1>Let’s get you back to building.</h1><p>This page may have moved. Explore the EIEC website below.</p><div className="hero-actions"><Link href="/" className="cta-btn">EIEC Home →</Link><Link href="/projects" className="cta-btn">Our Projects →</Link></div></main>;
}
