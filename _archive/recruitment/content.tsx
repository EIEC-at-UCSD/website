import sanitizeHtml from "sanitize-html";
import type { Content as ContentMap } from "@/lib/data";

type Tag = "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";

export function Content({ as: Tag = "div", name, content, fallback, html = false, className }: {
  as?: Tag; name: string; content: ContentMap; fallback: string; html?: boolean; className?: string;
}) {
  const value = content[name] || fallback;
  if (!html) return <Tag className={className}>{value}</Tag>;
  const clean = sanitizeHtml(value, {
    allowedTags: ["br", "em", "strong", "b", "i", "span"],
    allowedAttributes: { em: ["data-text"] },
  });
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
