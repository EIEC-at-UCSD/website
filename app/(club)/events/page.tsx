import type { Metadata } from "next";
import Link from "next/link";
import { Content } from "@/components/content";
import { Board } from "@/components/board";
import { Gallery } from "@/components/gallery";
import { Projects } from "@/components/projects";
import { Events } from "@/components/events";
import { Recruitment } from "@/components/recruitment";
import { Effects } from "@/components/effects";
import { getSiteData } from "@/lib/sheets";
import { recruitmentStats } from "@/lib/data";
import { contactEmail } from "@/lib/settings";
export const metadata: Metadata = { title: "EIEC | Events", description: "EIEC workshops, speaker events, demo days, and networking sessions at UC San Diego.", openGraph: { title: "EIEC | Events", description: "EIEC workshops, speaker events, demo days, and networking sessions at UC San Diego." } };
export const revalidate = 300;
export default async function Page() {
const data = await getSiteData();
const stats = recruitmentStats(data.projects);
return <>


<div className="hero-wrapper">
<section className="hero hero--compact">
<div className="hero-left">
<Content as="div" name="events_hero_eyebrow" content={data.content} fallback={"Events & Workshops"} className="hero-eyebrow" />
<Content as="h1" name="events_hero_heading" content={data.content} fallback={"Learn, build,<br><em data-text=\"connect.\">connect.</em>"} html />
<Content as="p" name="events_hero_desc" content={data.content} fallback={"EIEC hosts workshops, speaker events, demo days, and networking sessions throughout the quarter. Here's what's coming up and what we've done."} className="hero-sub" />
</div>
<div className="hero-gear-wrapper">
<canvas id="calendar-canvas"></canvas>
</div>
</section>
</div>


<hr className="glow-line" />


<section className="section">
<div className="reveal">
<div className="section-eyebrow">{"Upcoming"}</div>
<Content as="div" name="events_section_title" content={data.content} fallback={"Spring 2026 Events"} className="section-title" />
<Content as="p" name="events_section_desc" content={data.content} fallback={"Mark your calendar. All events are open to UCSD students unless otherwise noted."} className="section-desc" />
</div>
<Events rows={data.events} />
</section>


<section className="section section--flush reveal">
<div className="cta-banner">
<div>
<h3>{"Want to get involved?"}</h3>
<p>{"Check out our open roles and join a venture team building something real this quarter."}</p>
</div>
<Link href="/recruitment" className="cta-btn">{"View Open Roles →"}</Link>
</div>
</section>


<Effects mode="events" />
</>;
}
