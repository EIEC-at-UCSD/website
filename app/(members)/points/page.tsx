import type { Metadata } from "next";
import Link from "next/link";
import { AttendanceShell, AttendanceNotice, EmptyAttendance } from "@/components/attendance/shell";
import { requireMember } from "@/lib/attendance/auth";
import type { LeaderboardRow } from "@/lib/attendance/types";

export const metadata: Metadata = { title: "Points | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PointsPage() {
  // members only. the database function refuses signed-out callers too
  const { supabase } = await requireMember("/points");
  const { data, error } = await supabase.rpc("points_leaderboard", { p_limit: 100 });
  const rows = error ? null : (data || []) as LeaderboardRow[];
  return <AttendanceShell title="Points board." description="Check in at EIEC events to earn points. Only signed-in members can see this board, and names show as first name and last initial."
    actions={<><Link href="/check-in" className="attendance-button">Check in</Link><Link href="/account" className="attendance-button attendance-button-secondary">My points</Link></>}>
    {rows === null ? <AttendanceNotice tone="error">The board could not be loaded. Refresh in a moment.</AttendanceNotice>
      : rows.length === 0 ? <EmptyAttendance title="No check-ins yet.">Be the first name on the board at the next event.</EmptyAttendance>
      : <>
        <p className="attendance-hint attendance-board-totals">{rows[0].total_members} members · {rows[0].total_check_ins} check-ins this year</p>
        <div className="attendance-table-wrap"><table className="attendance-table attendance-board">
          <thead><tr><th scope="col">Rank</th><th scope="col">Member</th><th scope="col">Events</th><th scope="col">Points</th></tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i} className={row.rank <= 3 ? "attendance-board-top" : undefined}>
            <td>{row.rank}</td><td>{row.name}</td><td>{row.events}</td><td className="attendance-board-points">{row.points}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="attendance-hint">Ties share a rank. You can hide yourself from this board on your account page.</p>
      </>}
  </AttendanceShell>;
}
