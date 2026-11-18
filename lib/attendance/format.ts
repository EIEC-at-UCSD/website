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
