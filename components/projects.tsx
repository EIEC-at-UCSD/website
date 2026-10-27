import { groupProjects, type Row } from "@/lib/data";

export function Projects({ rows }: { rows: Row[] }) {
  const projects = groupProjects(rows);
  return <div className="card-grid" id="projects-grid">{projects.length ? projects.map((project, i) => <article key={project.name} className={`card waveform-pulse waveform-${project.color}`} data-color={project.color}>
    <div className="card-body"><div className="card-label">Project {String(i + 1).padStart(2, "0")}</div><h2 className="card-title">{project.name}</h2><p className="card-text">{project.description}</p><div className="card-tags">{project.tags.map((tag) => <span key={tag} className={`tag tag-${project.color}`}>{tag}</span>)}</div></div>
  </article>) : <p className="empty-state">No projects yet. Check back soon!</p>}</div>;
}
