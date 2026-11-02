import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="section not-found"><div className="section-eyebrow">404 · Page not found</div><h1>Let’s get you back to building.</h1><p>This page doesn't exist or has moved. Try one of these instead.</p><div className="hero-actions"><Link href="/" className="cta-btn">EIEC home</Link><Link href="/projects" className="cta-btn">Our projects</Link></div></main>;
}
