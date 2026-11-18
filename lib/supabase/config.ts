export function attendanceConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Attendance has not been configured.");
  return { url, key };
}

export function siteOrigin() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`).origin;
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://eiecatucsd.vercel.app").origin;
}
