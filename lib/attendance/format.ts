export function eventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(new Date(value));
}

export function pageOffset(value?: string) {
  const page = Number(value || "1");
  return Number.isInteger(page) && page > 0 && page <= 4000 ? (page - 1) * 25 : 0;
}

export function isCheckInOpen(opensAt: string | null, closesAt: string | null) {
  return Boolean(opensAt && closesAt && new Date(opensAt).getTime() <= Date.now() && new Date(closesAt).getTime() > Date.now());
}

export type CheckInWindow = "open" | "scheduled" | "closed";

export function checkInWindow(opensAt: string | null, closesAt: string | null): CheckInWindow {
  if (!opensAt || !closesAt || new Date(closesAt).getTime() <= Date.now()) return "closed";
  return new Date(opensAt).getTime() > Date.now() ? "scheduled" : "open";
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
