export type MemberRole = "member" | "admin";

export type MemberProfile = {
  id: string;
  display_name: string;
  email: string;
  role: MemberRole;
  created_at: string;
};

export type AttendanceEvent = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  points: number;
  archived_at: string | null;
  created_at: string;
  check_in_opens_at: string | null;
  check_in_closes_at: string | null;
};

export type AttendanceEntry = {
  event_id: string;
  event_title: string;
  event_starts_at: string;
  checked_in_at: string;
};

export type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type CheckInState = FormState & {
  eventTitle?: string;
  alreadyCheckedIn?: boolean;
  points?: number;
};

export type EventCode = { code: string; url: string; opensAt: string; closesAt: string };

export type PointsSummary = { points: number; events: number; rank: number | null; show_on_leaderboard: boolean; hidden_by_admin: boolean };

export type LeaderboardRow = { rank: number; name: string; points: number; events: number; total_members: number; total_check_ins: number };

export type CheckInAction = (previous: CheckInState, form: FormData) => Promise<CheckInState>;

export const initialFormState: FormState = { status: "idle", message: "" };
