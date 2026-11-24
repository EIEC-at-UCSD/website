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
  return <AttendanceShell title="Welcome to EIEC!" description="Sign in to check in at events, keep track of your points, and see how you stack up on the board.">
    {attendanceConfigured() ? <>{params.error && <AttendanceNotice tone="error">{params.error === "account" ? "We couldn’t use that account, so please sign in with your @ucsd.edu address instead." : "That email link didn’t work, so go ahead and sign in below, or use Forgot password if you need a fresh reset code."}</AttendanceNotice>}<SignInForm next={next} google={process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "1"} /></> : <AttendanceNotice>Member accounts are being set up. For now, contact <a href={`mailto:${contactEmail}`} className="attendance-text-link">{contactEmail}</a> for help with attendance.</AttendanceNotice>}
  </AttendanceShell>;
}
