// Refreshes data/sheets-snapshot.json (the fallback used when the live sheet is
// unreachable) from the sheet the site is configured for.
//   npm run snapshot
// Reads GOOGLE_SHEET_PUBLISHED_URL / *_GID from .env.local when present.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const { parseCSV } = await import("../lib/data");
const { tabCsvUrl, requiredColumn, publishedURL } = await import("../lib/sheets");

const out: Record<string, unknown[]> = {};
for (const tab of ["board", "events"] as const) {
  const url = tabCsvUrl(tab);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${tab}: HTTP ${res.status} from ${url}`);
  const rows = parseCSV(await res.text());
  if (!rows.length || !(requiredColumn[tab] in rows[0])) {
    throw new Error(`${tab}: expected a "${requiredColumn[tab]}" column, got: ${Object.keys(rows[0] || {}).join(", ") || "(empty)"}`);
  }
  out[tab] = rows;
  console.log(`${tab}: ${rows.length} rows (gid ${url.searchParams.get("gid")})`);
}
writeFileSync("data/sheets-snapshot.json", JSON.stringify(out, null, 2) + "\n");
console.log(`wrote data/sheets-snapshot.json from ${publishedURL}`);
