import Link from "next/link";

export function Pagination({ path, offset, total, search }: { path: string; offset: number; total: number; search?: string }) {
  const page = offset / 25 + 1;
  function href(nextPage: number) {
    const query = new URLSearchParams({ page: String(nextPage) });
    if (search) query.set("q", search);
    return `${path}?${query}`;
  }
  if (total <= 25 && offset === 0) return null;
  return <div className="attendance-pagination" aria-label="Pagination"><div>{offset > 0 && <Link href={href(page - 1)} className="attendance-text-link">Previous page</Link>}</div><span>Page {page}</span><div>{offset + 25 < total && <Link href={href(page + 1)} className="attendance-text-link">Next page</Link>}</div></div>;
}
