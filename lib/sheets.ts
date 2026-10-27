import { cache } from "react";
import { parseCSV, type Row } from "./data";
import snapshot from "@/data/sheets-snapshot.json";

const publishedURL = process.env.GOOGLE_SHEET_PUBLISHED_URL || "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFSDjddvSUesDGf8AcUSUfvKqYyhasPnH5Vdi96mhAzOKPuHZbStS4tCV_OaJVd7uffUEqKjSuEj4q/pub";
const tabs = { board: "0", events: "1476852653", projects: "85582537", content: "909039884" };
type Tab = keyof typeof tabs;

async function readTab(tab: Tab): Promise<Row[]> {
  try {
    const url = new URL(publishedURL);
    url.search = new URLSearchParams({ gid: tabs[tab], single: "true", output: "csv" }).toString();
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = parseCSV(await response.text());
    const required = { board: "name", events: "title", projects: "project name", content: "key" }[tab];
    if (rows.length && !(required in rows[0])) throw new Error("Unexpected sheet columns");
    return rows;
  } catch (error) {
    console.warn(`Using saved ${tab} content because Google Sheets is unavailable:`, error instanceof Error ? error.message : "Unknown error");
    return snapshot[tab] as Row[];
  }
}

export const getSiteData = cache(async () => {
  const [board, events, projects, contentRows] = await Promise.all([
    readTab("board"), readTab("events"), readTab("projects"), readTab("content"),
  ]);
  return { board, events, projects, content: Object.fromEntries(contentRows.filter((r) => r.key && r.value).map((r) => [r.key, r.value])) };
});
