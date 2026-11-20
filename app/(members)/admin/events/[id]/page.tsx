import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/attendance/auth";
import { validateUUID } from "@/lib/attendance/validation";
import { checkInURL } from "@/lib/attendance/codes";
import { siteOrigin } from "@/lib/supabase/config";
import { eventDate, pageOffset, plural } from "@/lib/attendance/format";
import type { AttendanceEvent, EventCode } from "@/lib/attendance/types";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { AddAttendanceForm, ArchiveEventForm, EditEventForm, EventCodeControls, RemoveAttendanceForm } from "@/components/attendance/forms";
import { Pagination } from "@/components/attendance/pagination";
import { addAttendanceAction, archiveEventAction, closeCodeAction, extendCodeAction, openCodeAction, removeAttendanceAction, updateEventAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "Manage attendance event | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Attendee = { member_id: string; display_name: string; email: string; checked_in_at: string; points: number; source: string; note: string; total_rows: number };

export default async function EventAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireAdmin();
  let id: string;
  try { id = validateUUID((await params).id); } catch { notFound(); }
  const offset = pageOffset((await searchParams).page);
  const { data: found, error: eventError } = await supabase.from("attendance_events").select("id,title,starts_at,location,points,check_in_opens_at,check_in_closes_at,archived_at,created_at").eq("id", id).maybeSingle();
  if (eventError) throw new Error("This event could not be loaded.");
  if (!found) notFound();
  const event = found as AttendanceEvent;
  const [{ data, error }, { data: codes }] = await Promise.all([
    supabase.rpc("admin_event_attendees", { p_event_id: id, p_offset: offset, p_limit: 25 }),
    supabase.rpc("admin_event_code", { p_event_id: id }),
  ]);
  const rows = (data || []) as Attendee[];
  const stored = (codes || [])[0] as { code: string | null; opens_at: string; closes_at: string } | undefined;
  const current: EventCode | null = stored?.code
    ? { code: stored.code, url: checkInURL(siteOrigin(), stored.code), opensAt: stored.opens_at, closesAt: stored.closes_at }
    : null;
  const total = Number(rows[0]?.total_rows || 0);

  return <AttendanceShell eyebrow="Event management" title={event.title}
    description={`${eventDate(event.starts_at)} Pacific time${event.location ? ` · ${event.location}` : ""} · ${plural(event.points, "point")}`}
    actions={<><Link href="/admin" className="attendance-button attendance-button-secondary">All events</Link><ArchiveEventForm eventId={id} archived={Boolean(event.archived_at)} action={archiveEventAction} /></>}>
    <EventCodeControls eventId={id} title={event.title} current={current} archived={Boolean(event.archived_at)} openAction={openCodeAction} closeAction={closeCodeAction} extendAction={extendCodeAction} />
    <section className="attendance-section">
      <div className="attendance-section-head">
        <h2>Event attendees{total ? ` (${total})` : ""}</h2>
        <a href={`/admin/events/${id}/export`} className="attendance-button attendance-button-secondary">Download CSV</a>
      </div>
      {error ? <AttendanceNotice tone="error">Attendees could not be loaded. Please refresh.</AttendanceNotice>
        : rows.length ? <div className="attendance-table-wrap"><table className="attendance-table">
          <thead><tr><th scope="col">Member</th><th scope="col">Checked in</th><th scope="col">Points</th><th scope="col">Remove</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.member_id}>
            <td>{row.display_name || "EIEC member"}<small>{row.email}</small></td>
            <td>{eventDate(row.checked_in_at)}{row.source === "admin" && <small>Added by a board member{row.note ? ` · ${row.note}` : ""}</small>}</td>
            <td>{row.points}</td>
            <td><RemoveAttendanceForm eventId={id} memberId={row.member_id} name={row.display_name || row.email} action={removeAttendanceAction} /></td>
          </tr>)}</tbody>
        </table></div>
        : <EmptyAttendance title="No check-ins yet.">Display the QR code or share the event code at your meeting.</EmptyAttendance>}
      <Pagination path={`/admin/events/${id}`} offset={offset} total={total} />
    </section>
    <div className="attendance-grid attendance-section">
      <AddAttendanceForm eventId={id} eventPoints={event.points} action={addAttendanceAction} />
      <EditEventForm event={event} action={updateEventAction} />
    </div>
  </AttendanceShell>;
}
