import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AttendanceShell, AttendanceNotice } from "@/components/attendance/shell";
import { SignInForm } from "@/components/attendance/sign-in-form";
import { attendanceConfigured } from "@/lib/supabase/config";
import { getMember } from "@/lib/attendance/auth";
import { safeReturnPath } from "@/lib/attendance/validation";
import { contactEmail } from "@/lib/settings";

export const metadata: Metadata = { title: "Member sign-in | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getMember()) redirect(next);
  return <AttendanceShell title="Welcome to EIEC!" description="Sign in to check in at events and see your EIEC attendance.">
    {attendanceConfigured() ? <>{params.error && <AttendanceNotice tone="error">{params.error === "account" ? "That account could not be used. Sign in with your @ucsd.edu account." : "That email link could not be verified. Sign in below, or use Forgot password to request a new reset code."}</AttendanceNotice>}<SignInForm next={next} google={process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "1"} /></> : <AttendanceNotice>Member accounts are being set up. For now, contact <a href={`mailto:${contactEmail}`} className="attendance-text-link">{contactEmail}</a> for help with attendance.</AttendanceNotice>}
  </AttendanceShell>;
}
