"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main-content" className="section not-found"><h1>Something went wrong.</h1><p>Please try loading the page again.</p><button type="button" className="cta-btn" onClick={reset}>Try again</button><Link href="/">Return home</Link></main>;
}
