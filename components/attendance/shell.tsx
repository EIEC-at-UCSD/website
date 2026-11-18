import Link from "next/link";
import type { ReactNode } from "react";

export function AttendanceShell({ eyebrow, title, description, children, actions }: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return <div className="attendance-page">
    <header className="attendance-header">
      <div><p className="attendance-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="attendance-description">{description}</p></div>
      {actions && <div className="attendance-header-actions">{actions}</div>}
    </header>
    {children}
    <p className="attendance-privacy-link"><Link href="/privacy">Attendance and account privacy</Link></p>
  </div>;
}

export function AttendanceNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <div className={`attendance-notice attendance-notice-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function EmptyAttendance({ title, children }: { title: string; children: ReactNode }) {
  return <div className="attendance-empty"><h2>{title}</h2><p>{children}</p></div>;
}
