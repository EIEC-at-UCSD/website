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
export const metadata: Metadata = { title: "EIEC | Recruitment", description: "Join an EIEC venture team. Open roles across software engineering, hardware, business strategy, design, and marketing.", openGraph: { title: "EIEC | Recruitment", description: "Join an EIEC venture team. Open roles across software engineering, hardware, business strategy, design, and marketing." } };
export const revalidate = 300;
export default async function Page() {
const data = await getSiteData();
const stats = recruitmentStats(data.projects);
return <>


<div className="hero-wrapper">
<section className="hero">
<div className="hero-left">
<Content as="div" name="recruitment_hero_eyebrow" content={data.content} fallback={"Open roles · Spring 2026"} className="hero-eyebrow" />
<Content as="h1" name="recruitment_hero_heading" content={data.content} fallback={"Build something<br><em data-text=\"real.\">real.</em>"} html />
<Content as="p" name="recruitment_hero_desc" content={data.content} fallback={"EIEC's portfolio of early-stage ventures is looking for students to join as volunteer interns. These are zero-to-one projects: scrappy, ambiguous, and genuinely exciting. You won't be shadowing anyone. You'll be doing the work."} className="hero-sub" />
</div>
<div className="hero-stats">
<div className="stat">
<span className="stat-label">{"Active Projects"}</span>
<span className="stat-number" id="stat-active-projects">{stats.projects}</span>
</div>
<div className="stat">
<span className="stat-label">{"Open Roles"}</span>
<span className="stat-number" id="stat-open-roles">{stats.roles}</span>
</div>
<div className="stat">
<span className="stat-label">{"Hrs / Week"}</span>
<span className="stat-number" id="stat-hours">{stats.hours}</span>
</div>
<div className="stat">
<span className="stat-label">{"Applications open"}</span>
<span className="stat-number">{"Now!"}</span>
</div>
</div>
</section>
</div>


<hr className="glow-line" />


<Recruitment rows={data.projects} />





<Effects mode="recruitment" />
</>;
}
