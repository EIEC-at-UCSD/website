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
export const metadata: Metadata = { title: "EIEC | Engineering Innovators & Entrepreneurs at UCSD", description: "EIEC is a student-run organization at UC San Diego that turns engineering talent into entrepreneurial builders through real venture projects.", openGraph: { title: "EIEC | Engineering Innovators & Entrepreneurs at UCSD", description: "EIEC is a student-run organization at UC San Diego that turns engineering talent into entrepreneurial builders through real venture projects." } };
export const revalidate = 300;
export default async function Page() {
const data = await getSiteData();
const stats = recruitmentStats(data.projects);
return <>


<div className="hero-wrapper">
<section className="hero">
<div className="hero-left">
<Content as="div" name="hero_eyebrow" content={data.content} fallback={"UCSD · Est. 2025"} className="hero-eyebrow" />
<Content as="h1" name="hero_heading" content={data.content} fallback={"Where Engineers<br>Become <em data-text=\"founders.\">Founders.</em>"} html />
<Content as="p" name="hero_description" content={data.content} fallback={"The Engineering Innovators and Entrepreneurs Club (EIEC) is a student-run organization at UC San Diego that turns engineering talent into entrepreneurial builders. We work with real ventures and give students the experience of building from zero to one."} className="hero-sub" />

<div className="hackathon-promo-wrap">
<canvas className="hackathon-promo-particles" aria-hidden="true"></canvas>
<Link href="/hackathon" target="_blank" rel="noopener noreferrer" className="hackathon-promo">{"2026 SoPE Hackathon"}</Link>
</div>
</div>
<div className="hero-gear-wrapper">
<canvas id="gear-canvas"></canvas>
</div>
</section>
</div>


<hr className="glow-line" />


<section className="section reveal">
<div className="section-eyebrow">{"Our Mission"}</div>
<div className="about-grid">
<div className="about-text">
<Content as="h3" name="mission_heading" content={data.content} fallback={"Turning engineers into innovators and entrepreneurs."} />
<Content as="p" name="mission_paragraph1" content={data.content} fallback={"At EIEC, we empower UC San Diego students to build ventures, solve real-world problems, and create what doesn't yet exist. We're shifting the campus focus from purely job-oriented pursuits toward innovation and entrepreneurship."} />
<Content as="p" name="mission_paragraph2" content={data.content} fallback={"We foster an environment where students develop entrepreneurial thinking, tackle real challenges, and merge technical skills with business acumen. Our members don't just gain professional skills. They build the mindset and network to imagine, lead, and create."} />
</div>
<div className="about-visual">
<div className="about-value">
<div className="about-value-icon green">{"◆"}</div>
<div>
<Content as="h4" name="value1_title" content={data.content} fallback={"Build Real Ventures"} />
<Content as="p" name="value1_desc" content={data.content} fallback={"Work on actual startups from concept to prototype. Real problems, real users, real stakes."} />
</div>
</div>
<div className="about-value">
<div className="about-value-icon blue">{"●"}</div>
<div>
<Content as="h4" name="value2_title" content={data.content} fallback={"Cross-Disciplinary Teams"} />
<Content as="p" name="value2_desc" content={data.content} fallback={"Engineers, designers, and business strategists working together, the way real startups work."} />
</div>
</div>
<div className="about-value">
<div className="about-value-icon pink">{"▲"}</div>
<div>
<Content as="h4" name="value3_title" content={data.content} fallback={"Events & Workshops"} />
<Content as="p" name="value3_desc" content={data.content} fallback={"We host workshops, speaker events, and general body meetings throughout the quarter to help you grow."} />
</div>
</div>
<div className="about-value">
<div className="about-value-icon orange">{"★"}</div>
<div>
<Content as="h4" name="value4_title" content={data.content} fallback={"Get Connected"} />
<Content as="p" name="value4_desc" content={data.content} fallback={"Join a community of builders. Whether you want to collaborate, learn, or just get inspired, we're here."} />
</div>
</div>
</div>
</div>
</section>


<hr className="glow-line" />


<section className="section">
<div className="reveal">
<div className="section-eyebrow">{"Gallery"}</div>
<div className="section-title">{"EIEC in Action"}</div>
</div>
<Gallery />
</section>


<hr className="glow-line" />


<section className="section">
<div className="reveal">
<div className="section-eyebrow">{"Leadership"}</div>
<Content as="div" name="board_section_title" content={data.content} fallback={"Meet the Board"} className="section-title" />
<Content as="p" name="board_section_desc" content={data.content} fallback={"The people running EIEC. Students who've been in the trenches and are building the org they wish existed when they started."} className="section-desc" />
</div>
<Board members={data.board} />
</section>


<hr className="glow-line" />


<section className="section reveal">
<div className="section-eyebrow">{"Get in Touch"}</div>
<Content as="div" name="contact_title" content={data.content} fallback={"Want to Reach Out?"} className="section-title" />
<Content as="p" name="contact_desc" content={data.content} fallback={"Whether you're interested in joining us, partnering, or just want to learn more, reach out."} className="section-desc" />
<div className="contact-links">
<a href={`mailto:${contactEmail}`} className="contact-item"><span className="contact-label">Email</span><span className="contact-value">{contactEmail}</span></a>
<a href="https://www.instagram.com/eiec_ucsd" target="_blank" className="contact-item" rel="noopener noreferrer">
<span className="contact-label">{"Instagram"}</span>
<span className="contact-value">{"@eiec_ucsd"}</span>
</a>
<a href="https://discord.com/invite/hBubnNJQCc" target="_blank" className="contact-item" rel="noopener noreferrer">
<span className="contact-label">{"Discord"}</span>
<span className="contact-value">{"Join our server"}</span>
</a>
<a href="https://www.linkedin.com/company/eiec-ucsd/" target="_blank" className="contact-item" rel="noopener noreferrer">
<span className="contact-label">{"LinkedIn"}</span>
<span className="contact-value">{"EIEC UCSD"}</span>
</a>
</div>
</section>


<section className="section section--flush reveal">
<div className="cta-banner">
<div>
<Content as="h3" name="cta_title" content={data.content} fallback={"Ready to Build Something Real?"} />
<Content as="p" name="cta_desc" content={data.content} fallback={"We're currently recruiting. Check out our open projects and apply."} />
</div>
<Link href="/recruitment" className="cta-btn">{"View Open Roles →"}</Link>
</div>
</section>


<Effects mode="home" />
</>;
}
