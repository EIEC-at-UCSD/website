import type { Metadata } from "next";
import { Projects } from "@/components/projects";
import { Effects } from "@/components/effects";
import { discordInvite } from "@/lib/settings";
export const metadata: Metadata = { title: "EIEC | Projects", description: "EIEC's student-led venture projects at UC San Diego, in robotics, biotech, AI, and consumer products.", openGraph: { title: "EIEC | Projects", description: "EIEC's student-led venture projects at UC San Diego, in robotics, biotech, AI, and consumer products." } };
export default function Page() {
return <>

<div className="hero-wrapper">
<section className="hero hero--single-col">
<div className="hero-left">
<h1>What we've <em data-text="built.">built.</em></h1>
<p className="hero-sub">Venture teams EIEC brought together and mentored.</p>
</div>
</section>
</div>

<hr className="glow-line" />

<section className="section">
<div className="reveal">
<div className="section-title">Current projects</div>
<p className="section-desc">Six venture teams working across robotics, biotech, AI, and consumer products.</p>
</div>
<Projects />
<div className="cta-banner cta-banner--spaced reveal">
<div>
<h3>Want to get involved?</h3>
<p>Do these projects sound interesting to you? Join the Discord to hear when the next teams form.</p>
</div>
<a href={discordInvite} target="_blank" rel="noopener noreferrer" className="cta-btn">Join the Discord</a>
</div>
</section>

<Effects mode="projects" />
</>;
}
