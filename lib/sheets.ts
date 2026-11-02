import { cache } from "react";
import { parseCSV, type Row } from "./data";
import snapshot from "@/data/sheets-snapshot.json";

// only the board roster and the events calendar come from the sheet. page copy
// lives in the page files and the project list in data/projects.json.
// to point at a new sheet set GOOGLE_SHEET_PUBLISHED_URL and the two tab ids
// (the gid= number in the sheet's url) in vercel, see README
export const publishedURL = process.env.GOOGLE_SHEET_PUBLISHED_URL || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmKSEcbe2pMjKu-FC162k-BxaroOAi0_iS-Ew09kEuEdGYeRiW68-2M4gLncX_H7wnoeLSgs35zqfe/pub";
export const tabs = {
  board: process.env.GOOGLE_SHEET_BOARD_GID || "0",
  events: process.env.GOOGLE_SHEET_EVENTS_GID || "1476852653",
};
export const requiredColumn = { board: "name", events: "title" } as const;
export function tabCsvUrl(tab: Tab) {
  const url = new URL(publishedURL);
  url.search = new URLSearchParams({ gid: tabs[tab], single: "true", output: "csv" }).toString();
  return url;
}
type Tab = keyof typeof tabs;

async function readTab(tab: Tab): Promise<Row[]> {
  try {
    const response = await fetch(tabCsvUrl(tab), { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = parseCSV(await response.text());
    if (rows.length && !(requiredColumn[tab] in rows[0])) throw new Error("Unexpected sheet columns");
    return rows;
  } catch (error) {
    console.warn(`Using saved ${tab} content because Google Sheets is unavailable:`, error instanceof Error ? error.message : "Unknown error");
    return snapshot[tab] as Row[];
  }
}

export const getSiteData = cache(async () => {
  const [board, events] = await Promise.all([readTab("board"), readTab("events")]);
  return { board, events };
});
