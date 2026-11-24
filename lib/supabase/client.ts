"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

export function browserSupabase() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
  });
}
