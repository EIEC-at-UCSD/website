import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/attendance/auth";
import { validateUUID } from "@/lib/attendance/validation";
import { eventDate, pageOffset } from "@/lib/attendance/format";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { Pagination } from "@/components/attendance/pagination";

export const metadata: Metadata = { title: "Member attendance | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MemberAttendancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireAdmin();
  let id: string;
  try { id = validateUUID((await params).id); } catch { notFound(); }
  const offset = pageOffset((await searchParams).page);
  const { data: member, error: profileError } = await supabase.from("member_profiles").select("id,display_name,email").eq("id", id).maybeSingle();
  if (profileError) throw new Error("This member could not be loaded.");
  if (!member) notFound();
  const { data, error, count } = await supabase.from("event_attendance").select("event_id,checked_in_at,points,event:attendance_events(title,starts_at)", { count: "exact" }).eq("member_id", id).order("checked_in_at", { ascending: false }).range(offset, offset + 24);
  const rows = (data || []) as unknown as { event_id: string; checked_in_at: string; points: number; event: { title: string; starts_at: string } | null }[];
  return <AttendanceShell eyebrow="Member attendance" title={member.display_name || "EIEC member"} description={member.email} actions={<Link href="/admin/members" className="attendance-button attendance-button-secondary">All members</Link>}>
    {error ? <AttendanceNotice tone="error">Attendance could not be loaded. Please try again.</AttendanceNotice> : <><section className="attendance-panel"><p className="attendance-eyebrow">Events attended</p><p className="attendance-metric">{count || 0}</p></section><section className="attendance-section"><h2>Attendance history</h2>{rows.length ? <div className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th scope="col">Event</th><th scope="col">Event date</th><th scope="col">Checked in</th><th scope="col">Points</th></tr></thead><tbody>{rows.map((row) => <tr key={row.event_id}><td><Link href={`/admin/events/${row.event_id}`} className="attendance-text-link">{row.event?.title || "EIEC event"}</Link></td><td>{row.event && eventDate(row.event.starts_at)}</td><td>{eventDate(row.checked_in_at)}</td><td>{row.points}</td></tr>)}</tbody></table></div> : <EmptyAttendance title="No attendance yet.">This member has not checked in to an EIEC event.</EmptyAttendance>}<Pagination path={`/admin/members/${id}`} offset={offset} total={count || 0} /></section></>}
  </AttendanceShell>;
}
