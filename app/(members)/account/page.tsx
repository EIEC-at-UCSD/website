import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/attendance/auth";
import { eventDate, pageOffset } from "@/lib/attendance/format";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { ProfileForm, SignOutForm } from "@/components/attendance/forms";
import { Pagination } from "@/components/attendance/pagination";
import { updateNameAction, signOutAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "My attendance | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, profile, access } = await requireMember();
  const offset = pageOffset((await searchParams).page);
  const [{ count, error: countError }, { data, error }] = await Promise.all([
    supabase.from("event_attendance").select("event_id", { count: "exact", head: true }).eq("member_id", profile.id),
    supabase.from("event_attendance").select("event_id,checked_in_at,event:attendance_events(title,starts_at)").eq("member_id", profile.id).order("checked_in_at", { ascending: false }).range(offset, offset + 24),
  ]);
  const rows = (data || []) as unknown as { event_id: string; checked_in_at: string; event: { title: string; starts_at: string } | null }[];
  return <AttendanceShell eyebrow="My EIEC" title={profile.display_name ? `Welcome, ${profile.display_name}.` : "Welcome to EIEC."} description="Your attendance is private. You and authorized EIEC board admins can see it." actions={<><Link href="/check-in" className="attendance-button">Check in to an event</Link><SignOutForm action={signOutAction} /></>}>
    {access.role === "admin" && (access.admin_mfa_required === null ? <AttendanceNotice>Your admin role is ready. The club’s admin sign-in policy still needs to be configured before the portal can open.</AttendanceNotice> : <p className="attendance-admin-link"><Link href="/admin" className="attendance-text-link">Open admin portal</Link></p>)}
    <div className="attendance-grid"><section className="attendance-panel"><p className="attendance-eyebrow">Events attended</p><p className="attendance-metric">{countError ? "—" : count || 0}</p><p>Every event counts once, even if you scan its QR code more than once.</p><p className="attendance-hint">Signed in as {profile.email}</p></section><ProfileForm name={profile.display_name} action={updateNameAction} /></div>
    <section className="attendance-section"><h2>Your attendance history</h2>{error || countError ? <AttendanceNotice tone="error">Attendance could not be loaded. Please refresh and try again.</AttendanceNotice> : rows.length ? <><div className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th scope="col">Event</th><th scope="col">Event date</th><th scope="col">Checked in</th></tr></thead><tbody>{rows.map((row) => <tr key={row.event_id}><td>{row.event?.title || "EIEC event"}</td><td>{row.event && eventDate(row.event.starts_at)}</td><td>{eventDate(row.checked_in_at)}</td></tr>)}</tbody></table></div><p className="attendance-hint">All dates are shown in Pacific time.</p></> : <EmptyAttendance title="Your first event is ahead.">Scan the QR code or enter the event code at your next EIEC meeting to start your attendance history.</EmptyAttendance>}<Pagination path="/account" offset={offset} total={count || 0} /></section>
  </AttendanceShell>;
}
