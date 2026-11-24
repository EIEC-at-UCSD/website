import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/attendance/auth";
import { eventDate, checkInWindow, pageOffset } from "@/lib/attendance/format";
import type { AttendanceEvent } from "@/lib/attendance/types";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { CreateEventForm, SeasonForm } from "@/components/attendance/forms";
import { Pagination } from "@/components/attendance/pagination";
import { createEventAction, setSeasonAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "Attendance admin | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const windowLabel = { open: "Open", scheduled: "Scheduled", closed: "Closed" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireAdmin();
  const offset = pageOffset((await searchParams).page);
  const [{ data, error, count }, { data: season }] = await Promise.all([
    supabase.from("attendance_events").select("id,title,starts_at,location,points,check_in_opens_at,check_in_closes_at,archived_at,created_at,event_attendance(count)", { count: "exact" }).order("starts_at", { ascending: false }).range(offset, offset + 24),
    supabase.rpc("admin_season"),
  ]);
  const events = (data || []) as (AttendanceEvent & { event_attendance: { count: number }[] })[];
  return <AttendanceShell title="Bring the club together." description="This is where you set up events, open check-in with a code and QR, and see who’s been showing up."
    actions={<><Link href="/admin/members" className="attendance-button">Members and access</Link><Link href="/points" className="attendance-button attendance-button-secondary">Points board</Link><Link href="/account" className="attendance-button attendance-button-secondary">My account</Link></>}>
    <div className="attendance-grid">
      <CreateEventForm action={createEventAction} />
      <SeasonForm seasonStart={typeof season === "string" ? season : null} action={setSeasonAction} />
    </div>
    <section className="attendance-section">
      <h2>Attendance events</h2>
      {error ? <AttendanceNotice tone="error">We couldn’t load the events just now, so please refresh and try again.</AttendanceNotice>
        : events.length ? <div className="attendance-table-wrap"><table className="attendance-table">
          <thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Points</th><th scope="col">Check-in</th><th scope="col">Attendees</th></tr></thead>
          <tbody>{events.map((event) => <tr key={event.id}>
            <td><Link href={`/admin/events/${event.id}`} className="attendance-text-link">{event.title}</Link><small>{event.location}</small></td>
            <td>{eventDate(event.starts_at)}</td>
            <td>{event.points}</td>
            <td><span className="attendance-badge">{event.archived_at ? "Archived" : windowLabel[checkInWindow(event.check_in_opens_at, event.check_in_closes_at)]}</span></td>
            <td>{event.event_attendance[0]?.count || 0}</td>
          </tr>)}</tbody>
        </table></div>
        : <EmptyAttendance title="Create your first event.">Once you add one above, it gets its own QR and code for check-in, and its attendance will show up here.</EmptyAttendance>}
      <Pagination path="/admin" offset={offset} total={count || 0} />
    </section>
  </AttendanceShell>;
}
