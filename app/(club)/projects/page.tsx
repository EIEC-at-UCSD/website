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
export const metadata: Metadata = { title: "EIEC | Projects", description: "Explore EIEC's portfolio of student-led venture projects spanning robotics, biotech, AI, and consumer products.", openGraph: { title: "EIEC | Projects", description: "Explore EIEC's portfolio of student-led venture projects spanning robotics, biotech, AI, and consumer products." } };
export const revalidate = 300;
export default async function Page() {
const data = await getSiteData();
const stats = recruitmentStats(data.projects);
return <>


<div className="hero-wrapper">
<section className="hero hero--single-col">
<div className="hero-left">
<Content as="div" name="projects_hero_eyebrow" content={data.content} fallback={"Our Projects"} className="hero-eyebrow" />
<Content as="h1" name="projects_hero_heading" content={data.content} fallback={"What we've <em data-text=\"built.\">built.</em>"} html />
<Content as="p" name="projects_hero_desc" content={data.content} fallback={"Here's a look at some of the work that we have done. EIEC has helped bring together and mentor these teams."} className="hero-sub" />
</div>
</section>
</div>


<hr className="glow-line" />


<section className="section">
<div className="reveal">
<Content as="div" name="projects_section_eyebrow" content={data.content} fallback={"Current"} className="section-eyebrow" />
<Content as="div" name="projects_section_title" content={data.content} fallback={"2025 - 2026"} className="section-title" />
<Content as="p" name="projects_section_desc" content={data.content} fallback={"Six venture teams working across robotics, biotech, AI, and consumer products."} className="section-desc" />
</div>
<Projects rows={data.projects} />
<div className="cta-banner cta-banner--spaced reveal">
<div>
<h3>{"Want to get involved?"}</h3>
<p>{"Do these projects sound interesting to you? See our open roles to join a team."}</p>
</div>
<Link href="/recruitment" className="cta-btn">{"See Open Roles →"}</Link>
</div>
</section>


<Effects mode="projects" />
</>;
}
