import projects from "@/data/projects.json";

export function Projects() {
  return <div className="card-grid" id="projects-grid">{projects.length ? projects.map((project) => <article key={project.name} className={`card waveform-pulse waveform-${project.color}`} data-color={project.color}>
    <div className="card-body"><h2 className="card-title">{project.name}</h2><p className="card-text">{project.description}</p><div className="card-tags">{project.tags.map((tag) => <span key={tag} className={`tag tag-${project.color}`}>{tag}</span>)}</div></div>
  </article>) : <p className="empty-state">No projects yet. Check back soon!</p>}</div>;
}
