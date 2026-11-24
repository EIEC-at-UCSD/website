import { requireAdmin } from "@/lib/attendance/auth";
import { csvCell, validateUUID } from "@/lib/attendance/validation";
import { eventDate } from "@/lib/attendance/format";

type Row = { display_name: string; email: string; checked_in_at: string; points: number; source: string; note: string };

/** admin-only csv of one event's attendance. the proxy marks /admin responses private and uncached */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  let id: string;
  try { id = validateUUID((await params).id); } catch { return new Response("Not found", { status: 404 }); }
  const { data: event } = await supabase.from("attendance_events").select("title,starts_at").eq("id", id).maybeSingle();
  if (!event) return new Response("Not found", { status: 404 });
  const { data, error } = await supabase.rpc("admin_event_attendees", { p_event_id: id, p_offset: 0, p_limit: 5000 });
  if (error) return new Response("The export could not be created.", { status: 500 });
  const header = ["event", "event_date_pacific", "name", "email", "points", "checked_in_pacific", "added_by", "note"];
  const lines = ((data || []) as Row[]).map((row) => [
    event.title, eventDate(event.starts_at), row.display_name, row.email, row.points, eventDate(row.checked_in_at),
    row.source === "admin" ? "board" : "self", row.note,
  ].map(csvCell).join(","));
  const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  // the byte-order mark makes Excel read accented names as UTF-8
  return new Response("\uFEFF" + [header.join(","), ...lines].join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eiec-${slug}-attendance.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
