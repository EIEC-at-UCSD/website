import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/attendance/auth";
import { validateUUID } from "@/lib/attendance/validation";
import { eventDate, isCheckInOpen, pageOffset } from "@/lib/attendance/format";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { EventCodeControls } from "@/components/attendance/forms";
import { Pagination } from "@/components/attendance/pagination";
import { openCodeAction, closeCodeAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "Manage attendance event | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EventAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireAdmin();
  let id: string;
  try { id = validateUUID((await params).id); } catch { notFound(); }
  const offset = pageOffset((await searchParams).page);
  const { data: event, error: eventError } = await supabase.from("attendance_events").select("*").eq("id", id).maybeSingle();
  if (eventError) throw new Error("This event could not be loaded.");
  if (!event) notFound();
  const { data, error } = await supabase.rpc("admin_event_attendees", { p_event_id: id, p_offset: offset });
  const rows = (data || []) as { member_id: string; display_name: string; email: string; checked_in_at: string; total_rows: number }[];
  return <AttendanceShell eyebrow="Event management" title={event.title} description={`${eventDate(event.starts_at)} Pacific time${event.location ? ` · ${event.location}` : ""}`} actions={<Link href="/admin" className="attendance-button attendance-button-secondary">All events</Link>}>
    <EventCodeControls eventId={id} title={event.title} open={isCheckInOpen(event.check_in_opens_at, event.check_in_closes_at)} openAction={openCodeAction} closeAction={closeCodeAction} />
    <section className="attendance-section"><h2>Event attendees</h2>{error ? <AttendanceNotice tone="error">Attendees could not be loaded. Please refresh.</AttendanceNotice> : rows.length ? <div className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th scope="col">Member</th><th scope="col">Checked in</th></tr></thead><tbody>{rows.map((row) => <tr key={row.member_id}><td>{row.display_name || "EIEC member"}<small>{row.email}</small></td><td>{eventDate(row.checked_in_at)} Pacific time</td></tr>)}</tbody></table></div> : <EmptyAttendance title="No check-ins yet.">Display the QR code or share the event code at your meeting.</EmptyAttendance>}<Pagination path={`/admin/events/${id}`} offset={offset} total={Number(rows[0]?.total_rows || 0)} /></section>
  </AttendanceShell>;
}
