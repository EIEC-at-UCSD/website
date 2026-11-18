import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/attendance/auth";
import { eventDate, isCheckInOpen, pageOffset } from "@/lib/attendance/format";
import type { AttendanceEvent } from "@/lib/attendance/types";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { CreateEventForm } from "@/components/attendance/forms";
import { Pagination } from "@/components/attendance/pagination";
import { createEventAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "Attendance admin | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireAdmin();
  const offset = pageOffset((await searchParams).page);
  const { data, error, count } = await supabase.from("attendance_events").select("*,event_attendance(count)", { count: "exact" }).order("starts_at", { ascending: false }).range(offset, offset + 24);
  const events = (data || []) as (AttendanceEvent & { event_attendance: { count: number }[] })[];
  return <AttendanceShell eyebrow="Board portal" title="Bring the club together." description="Create events, manage check-in codes and review member attendance." actions={<><Link href="/admin/members" className="attendance-button">Members and access</Link><Link href="/account" className="attendance-button attendance-button-secondary">My account</Link></>}>
    <CreateEventForm action={createEventAction} />
    <section className="attendance-section"><h2>Attendance events</h2>{error ? <AttendanceNotice tone="error">Events could not be loaded. Please try again.</AttendanceNotice> : events.length ? <div className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Check-in</th><th scope="col">Attendees</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><Link href={`/admin/events/${event.id}`} className="attendance-text-link">{event.title}</Link><small>{event.location}</small></td><td>{eventDate(event.starts_at)}</td><td><span className="attendance-badge">{isCheckInOpen(event.check_in_opens_at, event.check_in_closes_at) ? "Open" : "Closed"}</span></td><td>{event.event_attendance[0]?.count || 0}</td></tr>)}</tbody></table></div> : <EmptyAttendance title="Create your first event.">Each event gets its own attendance record, QR code and manual code.</EmptyAttendance>}<Pagination path="/admin" offset={offset} total={count || 0} /></section>
  </AttendanceShell>;
}
