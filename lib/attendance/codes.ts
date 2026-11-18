import { createHash, randomBytes } from "node:crypto";
import { EVENT_CODE_ALPHABET, normalizeEventCode } from "./validation";

/** Call only from the server. Keep raw codes out of persistent storage and logs. */
export function generateEventCode(): string {
  const code = [...randomBytes(10)].map((byte) => EVENT_CODE_ALPHABET[byte & 31]).join("");
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function hashEventCode(value: string): string {
  return createHash("sha256").update(normalizeEventCode(value), "utf8").digest("hex");
}

export function checkInURL(origin: string, code: string): string {
  const url = new URL("/check-in", origin);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("Check-in links require HTTPS.");
  }
  // URL fragments are not sent to the web server or in HTTP referrer headers.
  url.hash = new URLSearchParams({ code: normalizeEventCode(code) }).toString();
  return url.toString();
}
