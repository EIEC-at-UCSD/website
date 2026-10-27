"use client";

import { useState } from "react";
import { groupProjects, safeURL, type Row } from "@/lib/data";

const filters = [["all", "All Roles"], ["biz", "Business Strategy"], ["swe", "Software Eng"], ["hw", "Hardware Eng"], ["design", "Design"], ["mkt", "Marketing"]];

export function Recruitment({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState("all");
  const projects = groupProjects(rows).map((p) => ({ ...p, roles: p.roles.filter((r) => filter === "all" || r["role type"] === filter) })).filter((p) => p.roles.length);
  return <>
    <div className="filter-bar" role="group" aria-label="Filter roles">{filters.map(([key, label]) => <button type="button" key={key} className={`filter-btn${filter === key ? " active" : ""}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    <div className="main" id="recruitment-projects" aria-live="polite">{projects.length ? projects.map((project, i) => <section key={project.name} className={`project waveform-pulse waveform-${project.color}`} data-color={project.color}>
      <div className="project-header"><div className="project-header-left"><span className="project-num">{String(i + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span><h2 className="project-name">{project.name}</h2><span className="project-tagline">{project.description}</span></div><div className="project-tags">{project.tags.map((tag) => <span key={tag} className="ptag">{tag}</span>)}</div></div>
      <div className="roles-grid">{project.roles.map((role, j) => <article key={`${role["role title"]}-${j}`} className="role-card" data-type={role["role type"]}>
        <div className="role-top"><h3 className="role-title">{role["role title"]}</h3><span className={`role-tag tag-${role["role type"]}`}>{role["role tag label"]}</span></div><p className="role-desc">{role["role description"]}</p>
        <div className="role-footer"><span className="role-time">{role.hours || "Hours vary"}</span>{safeURL(role["apply url"]) && <a href={safeURL(role["apply url"])} target="_blank" rel="noopener noreferrer" className="apply-btn" aria-label={`Apply for ${role["role title"]} at ${project.name}`}>Apply →</a>}</div>
      </article>)}</div>
    </section>) : <p className="empty-state">{filter === "all" ? "No open roles right now. Check back soon!" : "No open roles in this category. Try another filter."}</p>}</div>
  </>;
}
