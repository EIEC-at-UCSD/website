"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireAdmin } from "@/lib/attendance/auth";
import { normalizeEventCode, validateDisplayName, validateEventTitle, validateDate, validateUUID, AttendanceInputError } from "@/lib/attendance/validation";
import { generateEventCode, hashEventCode, checkInURL } from "@/lib/attendance/codes";
import { siteOrigin } from "@/lib/supabase/config";
import type { FormState, CheckInState } from "@/lib/attendance/types";

function failure(error: unknown): FormState {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const message = error instanceof AttendanceInputError ? error.message
    : code === "42501" ? "Your access changed. Refresh the page and sign in again."
    : code === "22023" && error && typeof error === "object" && "message" in error ? String(error.message).slice(0, 160)
    : "The request could not be completed. Please try again.";
  return { status: "error", message };
}

export async function checkInAction(_previous: CheckInState, form: FormData): Promise<CheckInState> {
  const { supabase } = await requireMember("/check-in");
  try {
    const code = normalizeEventCode(form.get("code"));
    const { data, error } = await supabase.rpc("check_in_to_event", { p_code: code });
    if (error) throw error;
    if (data?.status === "rate_limited") return { status: "error", message: "Too many attempts. Wait a few minutes before trying again." };
    if (!["recorded", "already_checked_in"].includes(data?.status)) return { status: "error", message: "That code is invalid, closed or expired. Check with the event organizer." };
    revalidatePath("/account");
    const alreadyCheckedIn = data.status === "already_checked_in";
    return { status: "success", alreadyCheckedIn, eventTitle: data.event_title,
      message: alreadyCheckedIn ? `You’re already checked in for ${data.event_title}. This event counts once.` : `You’re checked in for ${data.event_title}. Your attendance has been recorded.` };
  } catch (error) { return failure(error); }
}

export async function updateNameAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireMember();
  try {
    const name = validateDisplayName(form.get("name"));
    const { error } = await supabase.rpc("update_member_name", { p_name: name });
    if (error) throw error;
    revalidatePath("/account");
    return { status: "success", message: "Your name has been updated." };
  } catch (error) { return failure(error); }
}

export async function signOutAction(_previous: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await requireMember();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { status: "error", message: "Sign-out could not be completed. Please try again." };
  redirect("/sign-in");
}

export async function createEventAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  let eventId: string;
  try {
    const title = validateEventTitle(form.get("title"));
    const date = validateDate(form.get("startsAt"));
    const location = String(form.get("location") || "").trim();
    if (location.length > 160 || /[\u0000-\u001f\u007f]/.test(location)) throw new AttendanceInputError("Use a location of 160 characters or fewer.");
    const { data, error } = await supabase.rpc("create_attendance_event", { p_title: title, p_starts_at: date, p_location: location });
    if (error) throw error;
    eventId = validateUUID(data);
  } catch (error) { return failure(error); }
  revalidatePath("/admin");
  redirect(`/admin/events/${eventId}`);
}

export type CodeState = FormState & { code?: string; url?: string; closesAt?: string };

export async function openCodeAction(_previous: CodeState, form: FormData): Promise<CodeState> {
  const { supabase } = await requireAdmin();
  try {
    const eventId = validateUUID(form.get("eventId"));
    const closesAt = validateDate(form.get("closesAt"));
    if (new Date(closesAt).getTime() <= Date.now()) throw new AttendanceInputError("Choose a closing time in the future.");
    const code = generateEventCode();
    const { error } = await supabase.rpc("open_event_check_in", { p_event_id: eventId, p_code_hash: hashEventCode(code), p_closes_at: closesAt });
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin");
    return { status: "success", message: "Check-in is open. Any previous code for this event has been replaced.", code, url: checkInURL(siteOrigin(), code), closesAt };
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
    return { status: "success", message: "Check-in is closed. The previous code no longer works." };
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
