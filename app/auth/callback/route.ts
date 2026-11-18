import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { attendanceConfigured, siteOrigin } from "@/lib/supabase/config";
import { safeReturnPath } from "@/lib/attendance/validation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  if (code && attendanceConfigured()) {
    const supabase = await serverSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, siteOrigin()));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", siteOrigin()));
}
