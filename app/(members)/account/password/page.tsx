import type { Metadata } from "next";
import { requireMember } from "@/lib/attendance/auth";
import { AttendanceShell } from "@/components/attendance/shell";
import { PasswordForm } from "@/components/attendance/password-form";

export const metadata: Metadata = { title: "Set your EIEC password | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  await requireMember("/account/password");
  return <AttendanceShell eyebrow="Account security" title="Choose your new password." description="Save a new password for your verified EIEC account."><PasswordForm /></AttendanceShell>;
}
