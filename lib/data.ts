export type Row = Record<string, string>;
export type Content = Record<string, string>;

/** Google Sheets CSV may contain quoted commas, line breaks and escaped quotes. */
export function parseCSV(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && c === ',') { row.push(field); field = ""; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      row.push(field); rows.push(row); row = []; field = "";
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (quoted) throw new Error("Incomplete CSV response");
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = (rows.shift() || []).map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase());
  if (!headers.length || headers.some((h) => h.includes("<"))) throw new Error("Invalid CSV response");
  return rows.filter((r) => r.some((v) => v.trim())).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()])));
}

export function safeURL(value?: string): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value.trim());
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch { /* Invalid links are displayed without a clickable action. */ }
}

export function photoURL(value?: string): string | undefined {
  if (!value) return;
  const match = value.trim().match(/\/file\/d\/([\w-]{20,})|[?&]id=([\w-]{20,})|^([\w-]{25,})$/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1] || match[2] || match[3]}=w800`;
  return safeURL(value);
}

export function groupProjects(rows: Row[]) {
  const projects = new Map<string, { name: string; description: string; color: string; tags: string[]; roles: Row[] }>();
  for (const row of rows) {
    const name = row["project name"];
    if (!name) continue;
    if (!projects.has(name)) projects.set(name, {
      name, description: row.description || "", color: row.color || "orange",
      tags: (row.tags || "").split(",").map((t) => t.trim()).filter(Boolean), roles: [],
    });
    if (row["role title"]) projects.get(name)!.roles.push(row);
  }
  return [...projects.values()];
}

export function recruitmentStats(rows: Row[]) {
  const projects = groupProjects(rows);
  const roles = projects.flatMap((p) => p.roles);
  const hours = roles.map((r) => (r.hours || "").match(/(\d+)\s*[-–]\s*(\d+)/)).filter((m) => m !== null);
  const average = (i: number) => Math.floor(hours.reduce((n, m) => n + Number(m[i]), 0) / hours.length);
  return { projects: projects.length, roles: roles.length, hours: hours.length ? `${average(1)}–${average(2)}` : "Varies" };
}
