import type { Row } from "@/lib/data";

export function Events({ rows }: { rows: Row[] }) {
  const events = rows.filter((row) => row.title);
  return <div className="timeline" id="events-timeline">{events.length ? events.map((event, i) => <article key={`${event.title}-${i}`} className={`timeline-item${event.past?.toLowerCase() === "true" ? " past" : ""}`}>
    <div className="timeline-date">{event.date}</div><div className="timeline-card waveform-pulse"><h3>{event.title}</h3><p>{event.description}</p><div className="event-meta">
      {event.location && <span>📍 {event.location}</span>}{event.time && <span>◷ {event.time}</span>}{event.audience && <span>🎟 {event.audience}</span>}
    </div></div>
  </article>) : <div className="empty-state-block"><p className="empty-state-title">No upcoming events</p><p className="empty-state">Check back soon!</p></div>}</div>;
}
