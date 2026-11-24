import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/attendance/auth";
import { eventDate, pageOffset, plural } from "@/lib/attendance/format";
import type { PointsSummary } from "@/lib/attendance/types";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { BoardVisibilityForm, ProfileForm, SignOutForm } from "@/components/attendance/forms";
import { Pagination } from "@/components/attendance/pagination";
import { setBoardVisibilityAction, signOutAction, updateNameAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "My attendance | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type HistoryRow = { event_id: string; checked_in_at: string; points: number; event: { title: string; starts_at: string } | null };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, profile, access } = await requireMember();
  const offset = pageOffset((await searchParams).page);
  const [{ data: summaryData, error: summaryError }, { data, error, count }] = await Promise.all([
    supabase.rpc("member_points_summary"),
    supabase.from("event_attendance").select("event_id,checked_in_at,points,event:attendance_events(title,starts_at)", { count: "exact" })
      .eq("member_id", profile.id).order("checked_in_at", { ascending: false }).range(offset, offset + 24),
  ]);
  const summary = summaryError ? null : summaryData as PointsSummary;
  const rows = (data || []) as unknown as HistoryRow[];

  return <AttendanceShell title={profile.display_name ? `Welcome, ${profile.display_name}.` : "Welcome to EIEC."}
    description="Here’s everything you’ve been to this year. Your history stays between you and the EIEC board, and other members only ever see your first name, last initial and totals on the points board."
    actions={<><Link href="/check-in" className="attendance-button">Check in to an event</Link><SignOutForm action={signOutAction} /></>}>
    {access.role === "admin" && (access.admin_mfa_required === null
      ? <AttendanceNotice>Your admin role is ready. The club’s admin sign-in policy still needs to be configured before the portal can open.</AttendanceNotice>
      : <p className="attendance-admin-link"><Link href="/admin" className="attendance-text-link">Open admin portal</Link></p>)}
    <div className="attendance-grid">
      <section className="attendance-panel">
        <p className="attendance-eyebrow">Points this year</p>
        <p className="attendance-metric">{summary ? summary.points : "—"}</p>
        {summary && <p>{plural(summary.events, "event")}{summary.rank ? ` · rank #${summary.rank}` : ""} · <Link href="/points" className="attendance-text-link">see the board</Link></p>}
        <p className="attendance-hint">Signed in as {profile.email}</p>
        {summary && (summary.hidden_by_admin
          ? <p className="attendance-hint">A board admin has hidden your name from the points board. Your points still count. Contact EIEC with questions.</p>
          : <BoardVisibilityForm visible={summary.show_on_leaderboard} action={setBoardVisibilityAction} />)}
      </section>
      <ProfileForm name={profile.display_name} action={updateNameAction} />
    </div>
    <section className="attendance-section">
      <h2>Your attendance history</h2>
      {error ? <AttendanceNotice tone="error">Attendance could not be loaded. Please refresh and try again.</AttendanceNotice>
        : rows.length ? <>
          <div className="attendance-table-wrap"><table className="attendance-table">
            <thead><tr><th scope="col">Event</th><th scope="col">Event date</th><th scope="col">Checked in</th><th scope="col">Points</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.event_id}>
              <td>{row.event?.title || "EIEC event"}</td><td>{row.event && eventDate(row.event.starts_at)}</td><td>{eventDate(row.checked_in_at)}</td><td>{row.points}</td>
            </tr>)}</tbody>
          </table></div>
          <p className="attendance-hint">All dates are shown in Pacific time.</p>
        </>
        : <EmptyAttendance title="Your first event is ahead.">Scan the QR code or enter the event code at your next EIEC meeting to start your attendance history.</EmptyAttendance>}
      <Pagination path="/account" offset={offset} total={count || 0} />
    </section>
  </AttendanceShell>;
}
