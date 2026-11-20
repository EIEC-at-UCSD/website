import type { Metadata } from "next";
import { AttendanceShell } from "@/components/attendance/shell";
import { contactEmail } from "@/lib/settings";

export const metadata: Metadata = { title: "Account and attendance privacy | EIEC" };

export default function PrivacyPage() {
  return <AttendanceShell eyebrow="Your information" title="Account and attendance privacy." description="How EIEC uses information from the member account and event check-in system."><article className="attendance-copy">
    <h2>What the account system stores</h2><p>Your name, verified UCSD email, account creation date, member or admin role, and the EIEC events you check in to, including the check-in time. The system also records administrative changes and uses short-lived counters to limit repeated check-in attempts.</p>
    <h2>Who can see it</h2><p>You can see your own account and attendance history. Authorized EIEC board admins can see member names, email addresses and attendance to manage the club’s events. The points board is visible only to signed-in EIEC members. It shows your first name, last initial, point total and number of events. It never shows your email or which events you attended, and you can hide yourself from it on your account page. There is no public member directory.</p>
    <h2>Why EIEC uses it</h2><p>To give you a member account, record one check-in per event, show your points and attendance, run the points board, and help board members manage attendance and account access.</p>
    <h2>How check-in works</h2><p>Scanning an event QR opens the check-in page. Attendance is recorded only after you sign in and submit the event code. A pending event code may be kept in the current tab’s session storage for up to ten minutes so you can complete sign-in, and is removed after a successful check-in.</p>
    <h2>Authentication and storage</h2><p>Supabase provides account authentication and private database storage. You verify your UCSD email during registration, then sign in with your EIEC password. Supabase stores a salted password hash; passwords are not included in member profiles or attendance reports. Verification and password recovery emails are sent through the club’s Gmail account. Vercel hosts the website. Session cookies keep you signed in. Authentication, email and hosting providers may maintain security logs as part of operating their services. The attendance system does not request your student ID number, phone number or physical location.</p>
    <h2>Corrections, access and deletion</h2><p>You can update your name from your account page. To request an attendance correction, a copy of your records or account deletion, contact <a href={`mailto:${contactEmail}`} className="attendance-text-link">{contactEmail}</a> from your registered UCSD address. Deleting the account removes its profile and individual attendance records. Administrative audit entries may remain with the deleted account’s identifying reference removed.</p>
    <h2>Questions</h2><p>Contact EIEC at <a href={`mailto:${contactEmail}`} className="attendance-text-link">{contactEmail}</a> before registering if you have questions about how the club uses attendance information.</p>
  </article></AttendanceShell>;
}
