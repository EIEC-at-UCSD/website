"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireAdmin } from "@/lib/attendance/auth";
import {
  normalizeEventCode, normalizeMemberEmail, validateDisplayName, validateEventTitle, validateDate, validateUUID,
  validatePoints, validateNote, validateLocation, AttendanceInputError,
} from "@/lib/attendance/validation";
import { generateEventCode } from "@/lib/attendance/codes";
import { eventDate } from "@/lib/attendance/format";
import type { FormState, CheckInState } from "@/lib/attendance/types";

function failure(error: unknown): FormState {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const message = error instanceof AttendanceInputError ? error.message
    : code === "42501" ? "Your access changed. Refresh the page and sign in again."
    : code === "22023" && error && typeof error === "object" && "message" in error ? String(error.message).slice(0, 160)
    : "The request could not be completed. Please try again.";
  return { status: "error", message };
}

function refreshBoard() {
  revalidatePath("/points");
  revalidatePath("/account");
}

export async function checkInAction(_previous: CheckInState, form: FormData): Promise<CheckInState> {
  const { supabase } = await requireMember("/check-in");
  try {
    const code = normalizeEventCode(form.get("code"));
    const { data, error } = await supabase.rpc("check_in_to_event", { p_code: code });
    if (error) throw error;
    const title = typeof data?.event_title === "string" ? data.event_title : "this event";
    switch (data?.status) {
      case "rate_limited":
        return { status: "error", message: "Too many attempts. Wait a few minutes before trying again." };
      case "not_open":
        return { status: "error", message: `Check-in for ${title} opens ${eventDate(data.opens_at)} Pacific time. Come back then.` };
      case "closed":
        return { status: "error", message: `Check-in for ${title} has closed. If you were there, ask a board member to add you.` };
      case "recorded":
      case "already_checked_in": {
        const alreadyCheckedIn = data.status === "already_checked_in";
        const points = Number(data.points) || 0;
        refreshBoard();
        return {
          status: "success", alreadyCheckedIn, eventTitle: title, points,
          message: alreadyCheckedIn
            ? `You’re already checked in for ${title}. This event counts once.`
            : `You’re checked in for ${title}. +${points} point${points === 1 ? "" : "s"}.`,
        };
      }
      default:
        return { status: "error", message: "That code isn’t valid. Check the code on the slide, or ask the event organizer." };
    }
  } catch (error) { return failure(error); }
}

export async function updateNameAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireMember();
  try {
    const name = validateDisplayName(form.get("name"));
    const { error } = await supabase.rpc("update_member_name", { p_name: name });
    if (error) throw error;
    refreshBoard();
    return { status: "success", message: "Your name has been updated." };
  } catch (error) { return failure(error); }
}

export async function setBoardVisibilityAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireMember();
  try {
    const visible = form.get("visible") === "true";
    const { error } = await supabase.rpc("set_leaderboard_visibility", { p_visible: visible });
    if (error) throw error;
    refreshBoard();
    return { status: "success", message: visible ? "You’re shown on the points board." : "You’re hidden from the points board. Your points still count." };
  } catch (error) { return failure(error); }
}

export async function signOutAction(_previous: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await requireMember();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { status: "error", message: "Sign-out could not be completed. Please try again." };
  redirect("/sign-in");
}

function eventFields(form: FormData) {
  return {
    p_title: validateEventTitle(form.get("title")),
    p_starts_at: validateDate(form.get("startsAt")),
    p_location: validateLocation(form.get("location")),
    p_points: validatePoints(form.get("points"), 1),
  };
}

export async function createEventAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  let eventId: string;
  try {
    const { data, error } = await supabase.rpc("create_attendance_event", eventFields(form));
    if (error) throw error;
    eventId = validateUUID(data);
  } catch (error) { return failure(error); }
  revalidatePath("/admin");
  redirect(`/admin/events/${eventId}`);
}

export async function updateEventAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    const { error } = await supabase.rpc("update_attendance_event", { p_event_id: eventId, ...eventFields(form) });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin");
    return { status: "success", message: "Event saved. Existing check-ins keep the points they were given." };
  } catch (error) { return failure(error); }
}

export async function archiveEventAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    const archive = form.get("archive") === "true";
    const { error } = await supabase.rpc("set_event_archived", { p_event_id: eventId, p_archived: archive });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin");
    return { status: "success", message: archive ? "Event archived. Check-in is closed and its records are kept." : "Event restored." };
  } catch (error) { return failure(error); }
}

export async function openCodeAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    if (form.get("replacing") === "true" && form.get("confirmed") !== "on") throw new AttendanceInputError("Tick the box to confirm. The current code and any slide showing it will stop working.");
    const closesAt = validateDate(form.get("closesAt"));
    const opensRaw = form.get("opensAt");
    const opensAt = typeof opensRaw === "string" && opensRaw ? validateDate(opensRaw) : null;
    if (new Date(closesAt).getTime() <= Date.now()) throw new AttendanceInputError("Choose a closing time in the future.");
    if (opensAt && new Date(closesAt).getTime() <= new Date(opensAt).getTime()) throw new AttendanceInputError("Check-in must close after it opens.");
    const code = normalizeEventCode(generateEventCode());
    const { error } = await supabase.rpc("open_event_check_in", { p_event_id: eventId, p_code: code, p_closes_at: closesAt, p_opens_at: opensAt });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin");
    return {
      status: "success",
      message: opensAt && new Date(opensAt).getTime() > Date.now()
        ? `Code ready. Check-in opens ${eventDate(opensAt)} Pacific time. Any previous code was replaced.`
        : "Check-in is open. Any previous code for this event was replaced.",
    };
  } catch (error) { return failure(error); }
}

export async function extendCodeAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    const closesAt = validateDate(form.get("newClosesAt"));
    const { error } = await supabase.rpc("extend_event_check_in", { p_event_id: eventId, p_closes_at: closesAt });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin");
    return { status: "success", message: `Check-in now closes ${eventDate(closesAt)} Pacific time. The code and QR are unchanged.` };
  } catch (error) { return failure(error); }
}

export async function setBoardHiddenAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const memberId = validateUUID(form.get("memberId"));
    const hidden = form.get("hidden") === "true";
    const { error } = await supabase.rpc("admin_set_board_hidden", { p_member_id: memberId, p_hidden: hidden });
    if (error) throw error;
    revalidatePath("/admin/members");
    refreshBoard();
    return { status: "success", message: hidden ? "Hidden from the points board." : "Shown on the points board again." };
  } catch (error) { return failure(error); }
}

export async function closeCodeAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    const { error } = await supabase.rpc("close_event_check_in", { p_event_id: eventId });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin");
    return { status: "success", message: "Check-in is closed. The code no longer works." };
  } catch (error) { return failure(error); }
}

export async function addAttendanceAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    const email = normalizeMemberEmail(String(form.get("email") || ""));
    const pointsRaw = form.get("points");
    const points = typeof pointsRaw === "string" && pointsRaw.trim() ? validatePoints(pointsRaw) : null;
    const { error } = await supabase.rpc("admin_add_attendance", { p_event_id: eventId, p_email: email, p_points: points, p_note: validateNote(form.get("note")) });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    refreshBoard();
    return { status: "success", message: `Added ${email}.` };
  } catch (error) { return failure(error); }
}

export async function removeAttendanceAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    const memberId = validateUUID(form.get("memberId"));
    if (form.get("confirmed") !== "on") throw new AttendanceInputError("Tick the box to confirm the removal.");
    const { error } = await supabase.rpc("admin_remove_attendance", { p_event_id: eventId, p_member_id: memberId });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    refreshBoard();
    return { status: "success", message: "Removed." };
  } catch (error) { return failure(error); }
}

export async function setSeasonAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const raw = form.get("seasonStart");
    const start = typeof raw === "string" && raw ? validateDate(raw) : null;
    const { error } = await supabase.rpc("admin_set_season_start", { p_start: start });
    if (error) throw error;
    revalidatePath("/admin");
    refreshBoard();
    return { status: "success", message: start ? `The board now counts events from ${eventDate(start)} Pacific time.` : "The board now counts every event." };
  } catch (error) { return failure(error); }
}

export async function changeAdminAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  try {
    const memberId = validateUUID(form.get("memberId"));
    const operation = form.get("operation");
    if (!["promote", "remove"].includes(String(operation)) || form.get("confirmed") !== "on") throw new AttendanceInputError("Confirm the access change before continuing.");
    const { error } = await supabase.rpc("set_member_admin", { p_member_id: memberId, p_make_admin: operation === "promote" });
    if (error) throw error;
    revalidatePath("/admin/members");
    revalidatePath("/account");
    return { status: "success", message: operation === "promote" ? "Admin access granted." : "Admin access removed." };
  } catch (error) { return failure(error); }
}
