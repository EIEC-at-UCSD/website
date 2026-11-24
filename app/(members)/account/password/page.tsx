import type { Metadata } from "next";
import { requireMember } from "@/lib/attendance/auth";
import { AttendanceShell } from "@/components/attendance/shell";
import { PasswordForm } from "@/components/attendance/password-form";

export const metadata: Metadata = { title: "Set your EIEC password | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  await requireMember("/account/password");
  return <AttendanceShell title="Choose your new password." description="Your email is verified, so all that’s left is to save a password that only you know."><PasswordForm /></AttendanceShell>;
}
