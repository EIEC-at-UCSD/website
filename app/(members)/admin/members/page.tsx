import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/attendance/auth";
import { pageOffset } from "@/lib/attendance/format";
import type { MemberProfile } from "@/lib/attendance/types";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { AdminAccessForm, BoardHiddenForm } from "@/components/attendance/forms";
import { Pagination } from "@/components/attendance/pagination";
import { changeAdminAction, setBoardHiddenAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "Members and admin access | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const search = (params.q || "").slice(0, 120);
  const offset = pageOffset(params.page);
  const { data, error } = await supabase.rpc("admin_member_attendance", { p_search: search, p_offset: offset });
  const rows = (data || []) as (MemberProfile & { attendance_count: number; total_points: number; verified: boolean; hidden_by_admin: boolean; total_rows: number })[];
  return <AttendanceShell eyebrow="Board portal" title="Members and access." description="Review attendance totals and manage board access. Member information stays private to authorized admins." actions={<Link href="/admin" className="attendance-button attendance-button-secondary">Manage events</Link>}>
    <form method="get" className="attendance-search"><label htmlFor="member-search" className="sr-only">Search members by name or email</label><input id="member-search" name="q" defaultValue={search} placeholder="Search by name or UCSD email" maxLength={120} /><button className="attendance-button" type="submit">Search members</button></form>
    {error ? <AttendanceNotice tone="error">Members could not be loaded. Please refresh and try again.</AttendanceNotice> : rows.length ? <div className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th scope="col">Member</th><th scope="col">Points</th><th scope="col">Access</th><th scope="col">Change access</th></tr></thead><tbody>{rows.map((member) => <tr key={member.id}><td><Link className="attendance-text-link" href={`/admin/members/${member.id}`}>{member.display_name || "EIEC member"}</Link><small>{member.email}{member.verified ? "" : " · email not verified"}{member.hidden_by_admin ? " · hidden from board" : ""}</small></td><td>{member.total_points} pts<small>{member.attendance_count} events</small></td><td><span className="attendance-badge">{member.role === "admin" ? "Admin" : "Member"}</span></td><td><AdminAccessForm memberId={member.id} name={member.display_name || member.email} isAdmin={member.role === "admin"} action={changeAdminAction} /><BoardHiddenForm memberId={member.id} hidden={member.hidden_by_admin} action={setBoardHiddenAction} /></td></tr>)}</tbody></table></div> : <EmptyAttendance title="No matching members.">Members appear here after creating an account.</EmptyAttendance>}
    <Pagination path="/admin/members" offset={offset} total={Number(rows[0]?.total_rows || 0)} search={search} />
  </AttendanceShell>;
}
