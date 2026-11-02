import type { Metadata } from "next";
import { Board } from "@/components/board";
import { Gallery } from "@/components/gallery";
import { Effects } from "@/components/effects";
import { getSiteData } from "@/lib/sheets";
import { contactEmail, discordInvite } from "@/lib/settings";
export const metadata: Metadata = { title: "EIEC | Engineering Innovators & Entrepreneurs at UCSD", description: "EIEC is a student-run organization at UC San Diego where engineering students start and build real ventures.", openGraph: { title: "EIEC | Engineering Innovators & Entrepreneurs at UCSD", description: "EIEC is a student-run organization at UC San Diego where engineering students start and build real ventures." } };
export const revalidate = 300;
export default async function Page() {
const data = await getSiteData();
return <>

<div className="hero-wrapper">
<section className="hero hero--home">
<div className="hero-left">
<h1>Where Engineers<br />Become <em data-text="Founders.">Founders.</em></h1>
<p className="hero-sub">The Engineering Innovators and Entrepreneurs Club (EIEC) is a student-run organization at UC San Diego that turns engineering talent into entrepreneurial builders. We work with real ventures and give students the experience of building from zero to one.</p>
</div>
<div className="hero-gear-wrapper">
<canvas id="gear-canvas"></canvas>
</div>
</section>
</div>

<hr className="glow-line" />

<section className="section reveal">
<h3 className="about-heading">Turning engineers into innovators and entrepreneurs.</h3>
<div className="about-text">
<p>EIEC helps UC San Diego students start ventures and work on real problems. Most of campus is pointed at landing a job. We want more people building things instead.</p>
<p>Members learn to think like founders and pick up the business side alongside the engineering. They leave with professional skills, and with the habits and network to start something of their own.</p>
</div>
<div className="about-visual">
<div className="about-value"><div><h4>Build real ventures</h4><p>Work on actual startups from concept to prototype. Real problems, real users, real stakes.</p></div></div>
<div className="about-value"><div><h4>Cross-disciplinary teams</h4><p>Engineers, designers, and business strategists working together, the way real startups work.</p></div></div>
<div className="about-value"><div><h4>Events and workshops</h4><p>Workshops, speaker events, and general body meetings every quarter.</p></div></div>
<div className="about-value"><div><h4>Get connected</h4><p>A community of people who build things. Come to collaborate, to learn, or just to see what others are working on.</p></div></div>
</div>
</section>

<hr className="glow-line" />

<section className="section">
<div className="reveal"><div className="section-title">EIEC in action</div></div>
<Gallery />
</section>

<hr className="glow-line" />

<section className="section">
<div className="reveal">
<div className="section-title">Meet the board</div>
<p className="section-desc">The students running EIEC, building the org they wish they'd had.</p>
</div>
<Board members={data.board} />
</section>

<hr className="glow-line" />

<section className="section reveal">
<div className="section-title">Want to reach out?</div>
<p className="section-desc">Want to join, partner with us, or just ask a question? Reach out.</p>
<div className="contact-links">
<a href={`mailto:${contactEmail}`} className="contact-item"><span className="contact-label">Email</span><span className="contact-value">{contactEmail}</span></a>
<a href="https://www.instagram.com/eiec_ucsd" target="_blank" className="contact-item" rel="noopener noreferrer"><span className="contact-label">Instagram</span><span className="contact-value">@eiec_ucsd</span></a>
<a href={discordInvite} target="_blank" className="contact-item" rel="noopener noreferrer"><span className="contact-label">Discord</span><span className="contact-value">Join our server</span></a>
<a href="https://www.linkedin.com/company/eiec-ucsd/" target="_blank" className="contact-item" rel="noopener noreferrer"><span className="contact-label">LinkedIn</span><span className="contact-value">EIEC UCSD</span></a>
</div>
</section>

<section className="section section--flush reveal">
<div className="cta-banner">
<div>
<h3>Ready to build something real?</h3>
<p>Join the Discord to hear about events, workshops, and the next round of venture teams.</p>
</div>
<a href={discordInvite} target="_blank" rel="noopener noreferrer" className="cta-btn">Join the Discord</a>
</div>
</section>

<Effects mode="home" />
</>;
}
