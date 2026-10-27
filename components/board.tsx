"use client";

import { useEffect, useRef, useState } from "react";
import { photoURL, type Row } from "@/lib/data";

function Avatar({ member }: { member: Row }) {
  const src = photoURL(member["photo url"]);
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={member.name || "Board member"} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} /> : <>{(member.name || "EIEC").split(" ").map((word) => word[0]).join("").slice(0, 2)}</>;
}

export function Board({ members }: { members: Row[] }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selected) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [selected]);
  if (!members.length) return <p className="empty-state">Board members coming soon.</p>;
  return <>
    <div className="team-grid" id="board-grid">{members.filter((m) => m.name).map((member, i) => <button type="button" key={`${member.name}-${i}`} className="team-card waveform-pulse" onClick={() => setSelected(member)}>
      <div className="team-avatar"><Avatar member={member} /></div><div className="team-name">{member.name}</div><div className="team-role">{member.role}</div>
    </button>)}</div>
    {selected && <dialog ref={dialog} className="board-dialog" aria-labelledby="board-modal-name" onCancel={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <div className="board-modal-card"><button type="button" className="board-modal-close" aria-label="Close profile" onClick={() => setSelected(null)}>×</button>
        <div className="board-modal-avatar"><Avatar member={selected} /></div><h2 className="board-modal-name" id="board-modal-name">{selected.name}</h2><div className="board-modal-role">{selected.role}</div>
        {selected.experience && <div className="board-modal-block"><div className="board-modal-label">Experience</div><p className="board-modal-text">{selected.experience}</p></div>}
        {selected["fun fact"] && <div className="board-modal-block"><div className="board-modal-label">Fun Fact</div><p className="board-modal-text">{selected["fun fact"]}</p></div>}
      </div>
    </dialog>}
  </>;
}
