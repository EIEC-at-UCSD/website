import type { Metadata } from "next";
import { Events } from "@/components/events";
import { Effects } from "@/components/effects";
import { getSiteData } from "@/lib/sheets";
import { discordInvite } from "@/lib/settings";
export const metadata: Metadata = { title: "EIEC | Events", description: "EIEC workshops, speaker events, demo days, and networking sessions at UC San Diego.", openGraph: { title: "EIEC | Events", description: "EIEC workshops, speaker events, demo days, and networking sessions at UC San Diego." } };
export const revalidate = 300;
export default async function Page() {
const data = await getSiteData();
return <>

<div className="hero-wrapper">
<section className="hero hero--compact">
<div className="hero-left">
<h1>Learn, build,<br /><em data-text="connect.">connect.</em></h1>
<p className="hero-sub">EIEC hosts workshops, speaker events, demo days, and networking sessions throughout the quarter. Here's what's coming up and what we've done.</p>
</div>
<div className="hero-gear-wrapper">
<canvas id="calendar-canvas"></canvas>
</div>
</section>
</div>

<hr className="glow-line" />

<section className="section">
<div className="reveal">
<div className="section-title">Upcoming events</div>
<p className="section-desc">Mark your calendar. All events are open to UCSD students unless otherwise noted.</p>
</div>
<Events rows={data.events} />
</section>

<section className="section section--flush reveal">
<div className="cta-banner">
<div>
<h3>Want to get involved?</h3>
<p>Join the Discord to hear about events first and find out when venture teams are recruiting.</p>
</div>
<a href={discordInvite} target="_blank" rel="noopener noreferrer" className="cta-btn">Join the Discord</a>
</div>
</section>

<Effects mode="events" />
</>;
}
