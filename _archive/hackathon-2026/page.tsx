import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Effects } from "@/components/effects";
import { contactEmail } from "@/lib/settings";
export const metadata: Metadata = {
  title: "EIEC × SoPE Hackathon | UCSD - May 30, 2026",
  description: "A 4-hour healthcare hackathon at UC San Diego. EIEC × Society of Physician Entrepreneurs. Pair with a clinician and build a working prototype.",
};
export default function HackathonPage() {
  return <div className="hackathon-site" id="main-content" tabIndex={-1}>


<div className="bg-glow"></div>


<div className="bg-dots"></div>


<div className="grain"></div>


<Navigation hackathon />


<div className="hero-wrapper">
<canvas className="hero-particles" aria-hidden="true" />
<section className="hero">
<div className="hero-center">
<h1>{"Prototype healthcare,"}<br /><em data-text="in one morning.">{"in one morning."}</em></h1>
<p className="hero-sub">{"A 4-hour hackathon at UC San Diego with the Society of Physician Entrepreneurs, a biomedical technology entrepreneurship club. Student teams pair with a practicing clinician and use modern AI coding tools to turn real clinical problems into working prototypes before lunch."}</p>
<div className="hero-actions">
<a href="https://docs.google.com/forms/d/1QGaiU10ki5ufS47aFEy7snF__JctijDUYjaYoNR4EHI/viewform" target="_blank" rel="noopener noreferrer" className="btn-primary">{"Interested? →"}</a>
<a href="#challenge" className="btn-ghost">{"What is this?"}</a>
</div>
</div>
</section>
<div className="hero-vitals">
<div className="vital">
<span className="vital-label">{"When"}</span>
<span className="vital-value accent">{"Sat May 30"}</span>
</div>
<div className="vital">
<span className="vital-label">{"Where"}</span>
<span className="vital-value">{"DIB - UCSD"}</span>
</div>
<div className="vital">
<span className="vital-label">{"Duration"}</span>
<span className="vital-value">{"8am–12pm"}</span>
</div>
<div className="vital">
<span className="vital-label">{"Format"}</span>
<span className="vital-value">{"Teams of 3-5"}</span>
</div>
</div>
</div>


<hr className="glow-line" />


<section className="section" id="why">
<div className="reveal">
<div className="section-title">{"Clinicians, engineers, modern AI tools."}</div>
<p className="section-desc">{"A first-of-its-kind morning at UCSD: real clinical problems, brought by practicing physicians, prototyped by student teams using modern AI coding tools. The goal is to innovate healthcare through entrepreneurship and build an environment that fosters students' creativity, diversity, and unique talents."}</p>
</div>
<div className="pillar-grid reveal-stagger">
<div className="pillar">
<div className="pillar-num">{"Clinician on every team"}</div>
<div className="pillar-title">{"A real doctor, with a real problem."}</div>
<p className="pillar-text">{"Each team is paired with a clinician from SoPE who brings a healthcare problem they actually want solved. They bring the domain knowledge; you bring the code and the curiosity."}</p>
</div>
<div className="pillar">
<div className="pillar-num">{"AI-paced"}</div>
<div className="pillar-title">{"Built around modern AI tools."}</div>
<p className="pillar-text">{"Modern AI coding tools are the assumed default, compressing what used to take weeks of dev work into a single morning. You're not racing the clock so much as showing what an AI-augmented team can actually ship in a focused window."}</p>
</div>
<div className="pillar">
<div className="pillar-num">{"No medical background needed"}</div>
<div className="pillar-title">{"If you can code (or want to learn), you belong here."}</div>
<p className="pillar-text">{"Engineers, entrepreneurs, designers, and researchers are all welcome; the clinician on your team handles the medical context so you can focus on the building."}</p>
</div>
<div className="pillar">
<div className="pillar-num">{"First 20 spots free"}</div>
<div className="pillar-title">{"Limited seats. Open to all students."}</div>
<p className="pillar-text">{"There are roughly 50 total spots across about 12 teams, with the first 20 registrants free; additional spots open up as we bring on biotech and hospital sponsors. Food, mentorship, and prizes are included for everyone who participates."}</p>
</div>
</div>
</section>


<hr className="glow-line" />


<section className="section" id="challenge">
<div className="reveal">
<div className="section-title">{"Real clinical problems. "}<em>{"Working prototypes."}</em></div>
<p className="section-desc">{"The morning opens with clinicians from the Society of Physician Entrepreneurs presenting problems they actually want solved: workflows, patient-facing tools, diagnostics, anything where a working prototype could change a real day in the clinic."}</p>
</div>
<div className="challenge reveal">
<div className="challenge-copy">
<h3>{"Four hours. One clinician. Ship something that runs."}</h3>
<p>{"Teams of 3–5 students plus a professional clinician work together with modern AI coding tools to take a clinical problem from idea to a demo-able prototype before noon, with students pulled from engineering, entrepreneurship, design, and wherever else makes sense for the problem in front of them."}</p>
<p>{"The bar isn't a polished product; it's a prototype that runs, that addresses the clinician's real problem, and that your team can confidently explain end to end."}</p>
</div>
<div className="challenge-meta">
<div className="challenge-meta-row">
<span className="challenge-meta-key">{"Date"}</span>
<span className="challenge-meta-val"><span className="accent">{"Sat May 30"}</span>{" - 2026"}</span>
</div>
<div className="challenge-meta-row">
<span className="challenge-meta-key">{"Time"}</span>
<span className="challenge-meta-val">{"8:00 am – 12:00 pm"}</span>
</div>
<div className="challenge-meta-row">
<span className="challenge-meta-key">{"Location"}</span>
<span className="challenge-meta-val">{"Design & Innovation Building"}</span>
</div>
<div className="challenge-meta-row">
<span className="challenge-meta-key">{"Format"}</span>
<span className="challenge-meta-val">{"~12 teams - 3-5 people each"}</span>
</div>
</div>
</div>
</section>


<hr className="glow-line" />


<section className="section" id="schedule">
<div className="reveal">
<div className="section-title">{"How the "}<em>{"morning"}</em>{" runs."}</div>
<p className="section-desc">{"One Saturday morning, four hours, with a hard stop at noon. The rough breakdown is below; exact times will be confirmed closer to the event."}</p>
</div>
<div className="timeline reveal-stagger">
<div className="timeline-item">
<div className="timeline-label">{"8:00 am"}</div>
<div className="timeline-card">
<h3>{"Welcome & coffee"}</h3>
<p>{"Arrive at DIB, grab coffee, meet your team and clinician."}</p>
</div>
</div>
<div className="timeline-item">
<div className="timeline-label">{"8:15 am"}</div>
<div className="timeline-card">
<h3>{"Keynote: Bedirhan Keskin, MD"}</h3>
<p>{"Gold Winner of the Anthropic Claude Code Hackathon, giving a short talk that sets the tone for what AI-paced healthcare prototyping can actually look like in practice."}</p>
</div>
</div>
<div className="timeline-item">
<div className="timeline-label">{"9:00 am"}</div>
<div className="timeline-card">
<h3>{"Hackathon: “Idea to App” in two hours"}</h3>
<p>{"Teams work with modern AI coding tools to take their clinician's problem from idea to a runnable app, with mentors and faculty on the floor throughout to help unblock anyone who gets stuck."}</p>
</div>
</div>
<div className="timeline-item">
<div className="timeline-label">{"11:00 am"}</div>
<div className="timeline-card">
<h3>{"Presentations"}</h3>
<p>{"Each team demos their prototype to the judging panel."}</p>
</div>
</div>
<div className="timeline-item">
<div className="timeline-label">{"11:45 am"}</div>
<div className="timeline-card">
<h3>{"Winners announced"}</h3>
<p>{"Prizes go out on the spot, and everyone's out the door by noon."}</p>
</div>
</div>
</div>
</section>


<hr className="glow-line" />


<section className="section" id="faq">
<div className="reveal">
<div className="section-title">{"Questions?"}</div>
</div>
<div className="faq reveal">
<details className="faq-item">
<summary>{"What is the Society of Physician Entrepreneurs (SoPE)?"}</summary>
<div className="faq-answer">{"SoPE is a biomedical technology-focused entrepreneurship organization, a network of practicing physicians who build businesses, products, and technology in healthcare. They're bringing the clinical problems and the clinicians to every team, with the goal of innovating healthcare through entrepreneurship and through the connection of biomedical and healthcare workers."}</div>
</details>
<details className="faq-item">
<summary>{"Do I need a medical or healthcare background?"}</summary>
<div className="faq-answer">{"No. The clinician on your team brings the domain knowledge while you bring the building, so engineers, entrepreneurs, designers, and researchers are all welcome."}</div>
</details>
<details className="faq-item">
<summary>{"Who can register?"}</summary>
<div className="faq-answer">{"Any college student. "}</div>
</details>
<details className="faq-item">
<summary>{"What are the prizes?"}</summary>
<div className="faq-answer">{"Prizes go to the top teams, with the exact breakdown announced closer to the event. Beyond the prizes, you walk away with mentorship connections, intros to the SoPE network of physician-founders, and the credibility of having shipped real medical-tech work alongside a doctor."}</div>
</details>
<details className="faq-item">
<summary>{"What if I'm new to coding?"}</summary>
<div className="faq-answer">{"Workshops and mentorship are part of the morning, and you're not expected to be a senior engineer to participate. Bring curiosity!"}</div>
</details>
</div>
<p className="faq-contact">{"Still have questions? Contact us at "}<a href={`mailto:${contactEmail}`}>{contactEmail}</a>{"."}</p>
</section>


<section className="section section--flush" id="register">
<div className="cta-banner reveal">
<div>
<h3>{"50 spots. "}<br />{"First 20 are free."}</h3>
<p>{"Registration is the EIEC × SoPE interest form and takes a couple of minutes. Earlier sign-ups lock in the free spots and get priority team assignment."}</p>
</div>
<a href="https://docs.google.com/forms/d/1QGaiU10ki5ufS47aFEy7snF__JctijDUYjaYoNR4EHI/viewform" target="_blank" rel="noopener noreferrer" className="btn-primary">{"Interested? →"}</a>
</div>
</section>


<footer>
<span className="footer-text">{"EIEC "}<span className="accent">{"×"}</span>{" SoPE - UCSD - May 30, 2026"}</span>
<div className="footer-links">
<a href="#why">{"Why"}</a>
<a href="#challenge">{"Format"}</a>
<a href="#schedule">{"Schedule"}</a>
<a href="#faq">{"FAQ"}</a>
<a href="https://thephysicianproject.com/" target="_blank" rel="noopener noreferrer">{"SoPE ↗"}</a>
<Link href="/">{"EIEC ↗"}</Link>
</div>
</footer>





<Effects mode="hackathon" /></div>;
}
