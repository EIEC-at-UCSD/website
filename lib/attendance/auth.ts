import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase/server";
import { attendanceConfigured } from "@/lib/supabase/config";
import type { MemberProfile } from "./types";
import { safeReturnPath } from "./validation";

type Access = { role: "member" | "admin"; admin_mfa_required: boolean | null; admin_access: boolean };

export const getMember = cache(async () => {
  if (!attendanceConfigured()) return null;
  const supabase = await serverSupabase();
  // getSession() is not an identity check. getUser() validates with Auth.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at || !/^[^@\s]+@ucsd\.edu$/i.test(user.email || "")) return null;
  const [{ data: profile, error: profileError }, { data: access, error: accessError }] = await Promise.all([
    supabase.from("member_profiles").select("id,display_name,email,created_at").eq("id", user.id).single(),
    supabase.rpc("get_member_access"),
  ]);
  if (profileError || accessError || !profile || !access) throw new Error("Your account could not be loaded. Please try again or contact EIEC.");
  return { supabase, user, profile: { ...profile, role: (access as Access).role } as MemberProfile, access: access as Access };
});

export async function requireMember(next = "/account") {
  const member = await getMember();
  if (!member) redirect(`/sign-in?next=${encodeURIComponent(safeReturnPath(next))}`);
  return member;
}

export async function requireAdmin() {
  const member = await requireMember("/admin");
  if (member.access.role !== "admin" || member.access.admin_mfa_required === null) redirect("/account");
  if (!member.access.admin_access) redirect("/account/security?next=/admin");
  return member;
}
