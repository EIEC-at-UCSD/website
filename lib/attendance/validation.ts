export class AttendanceInputError extends Error {}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export function normalizeMemberEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^@\s+]+@ucsd\.edu$/.test(email)) throw new AttendanceInputError("Please use your own @ucsd.edu email address, without a + alias.");
  return email;
}

export function validateNewPassword(value: string, confirmation: string): string {
  if ([...value].length < PASSWORD_MIN_LENGTH) throw new AttendanceInputError(`Your password needs at least ${PASSWORD_MIN_LENGTH} characters, so try a longer one.`);
  // Supabase uses bcrypt. Reject oversized UTF-8 inputs rather than allowing
  // different passwords to share a truncated prefix.
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_LENGTH || value.includes("\u0000")) throw new AttendanceInputError("That password is too long or has a character we can’t accept, so please try a shorter one.");
  if (value !== confirmation) throw new AttendanceInputError("Those two passwords don’t match, so please type them again.");
  return value;
}

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
  if (name.length < 2 || name.length > 80 || !/^\p{L}[\p{L}\p{M} .'-]*$/u.test(name)) {
    throw new AttendanceInputError("Please enter your name using letters, spaces, apostrophes and hyphens, between 2 and 80 characters.");
  }
  return name;
}

/** Only allow internal attendance destinations after authentication. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/account";
  try {
    const url = new URL(value, "https://eiec.invalid");
    if (url.origin !== "https://eiec.invalid") return "/account";
    if (!["/account", "/check-in", "/admin", "/points"].some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) return "/account";
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

export function validatePoints(value: unknown, fallback?: number): number {
  if ((value === null || value === undefined || value === "") && fallback !== undefined) return fallback;
  const points = typeof value === "string" && /^\d{1,4}$/.test(value.trim()) ? Number(value.trim()) : NaN;
  if (!Number.isInteger(points) || points < 0 || points > 1000) throw new AttendanceInputError("Points must be a whole number from 0 to 1000.");
  return points;
}

export function validateNote(value: unknown): string {
  const note = typeof value === "string" ? value.trim() : "";
  if (note.length > 200 || /[\u0000-\u001f\u007f]/.test(note)) throw new AttendanceInputError("Use a note of 200 characters or fewer.");
  return note;
}

export function validateLocation(value: unknown): string {
  const location = typeof value === "string" ? value.trim() : "";
  if (location.length > 160 || /[\u0000-\u001f\u007f]/.test(location)) throw new AttendanceInputError("Use a location of 160 characters or fewer.");
  return location;
}

/** spreadsheet apps run cells that start with = + - @ as formulas, so those get a leading quote */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
