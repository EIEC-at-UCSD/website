export class AttendanceInputError extends Error {}

// Ten unambiguous base-32 characters give an event code 50 bits of entropy.
export const EVENT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeEventCode(value: unknown): string {
  if (typeof value !== "string" || value.length > 40) {
    throw new AttendanceInputError("Enter the event code shown at your meeting.");
  }
  const code = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) {
    throw new AttendanceInputError("An event code has 10 letters and numbers. Check the code and try again.");
  }
  return code;
}

export function validateDisplayName(value: unknown): string {
  if (typeof value !== "string") throw new AttendanceInputError("Enter your name.");
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new AttendanceInputError("Use a name between 2 and 80 characters.");
  }
  return name;
}

/** Only allow internal attendance destinations after authentication. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/account";
  try {
    const url = new URL(value, "https://eiec.invalid");
    if (url.origin !== "https://eiec.invalid") return "/account";
    if (!["/account", "/check-in", "/admin"].some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) return "/account";
    // Codes must never be carried in redirect query strings or server logs.
    return url.pathname;
  } catch { return "/account"; }
}

export function validateEventTitle(value: unknown): string {
  if (typeof value !== "string") throw new AttendanceInputError("Enter an event name.");
  const title = value.trim();
  if (title.length < 2 || title.length > 120 || /[\u0000-\u001f\u007f]/.test(title)) {
    throw new AttendanceInputError("Use an event name between 2 and 120 characters.");
  }
  return title;
}

export function validateUUID(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new AttendanceInputError("That record could not be found.");
  }
  return value;
}

export function validateDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) || !Number.isFinite(new Date(value).getTime())) {
    throw new AttendanceInputError("Choose a valid date and time.");
  }
  return new Date(value).toISOString();
}
