import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/attendance/auth";
import { AttendanceShell } from "@/components/attendance/shell";
import { AdminMfa } from "@/components/attendance/admin-mfa";
import { safeReturnPath } from "@/lib/attendance/validation";

export const metadata: Metadata = { title: "Admin authentication | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountSecurityPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { access } = await requireMember("/account/security");
  if (access.role !== "admin" || access.admin_mfa_required !== true) redirect("/account");
  const next = safeReturnPath((await searchParams).next || "/admin");
  return <AttendanceShell title="An extra check for board access." description="Protect member information and administrative actions with an authenticator code."><AdminMfa next={next} /></AttendanceShell>;
}
