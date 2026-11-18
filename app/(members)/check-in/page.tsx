import type { Metadata } from "next";
import { getMember } from "@/lib/attendance/auth";
import { CheckInForm } from "@/components/attendance/check-in-form";
import { AttendanceShell } from "@/components/attendance/shell";
import { checkInAction } from "@/app/attendance-actions";

export const metadata: Metadata = { title: "Event check-in | EIEC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const member = await getMember();
  return <AttendanceShell eyebrow="Event attendance" title="Good to see you here." description="Check in at your EIEC event to add it to your attendance history."><CheckInForm action={checkInAction} signedIn={Boolean(member)} /></AttendanceShell>;
}
