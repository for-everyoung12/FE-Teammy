export function Pagination({
  page,
  setPage,
  pageSize,
  setPageSize,
  total,
  showPageSize = true,
  showPager = true,
}) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  const pageNumbers = Array.from({ length: maxPage }, (_, i) => i + 1)
    .filter((p) => {
      if (p === 1 || p === maxPage) return true;
      if (Math.abs(p - page) <= 1) return true;
      if (Math.abs(p - page) === 2) return true;
      return false;
    })
    .reduce((acc, p) => {
      if (acc.length === 0) return [p];
      const prev = acc[acc.length - 1];
      if (p - prev > 1) acc.push("ellipsis");
      acc.push(p);
      return acc;
    }, []);

  if (total === 0 || (!showPageSize && !showPager)) return null;

  return (
    <div className="mt-6 md:mt-8 mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
      {/* Page size */}
      {showPageSize && (
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs md:text-sm"
        >
          {[10, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="hidden sm:inline">per page</span>
        <span className="text-gray-400 hidden sm:inline">•</span>
        <span className="hidden sm:inline">{total} results</span>
        </div>
      )}

      {/* Pager */}
      {showPager && (
        <div className="inline-flex items-center gap-1">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-lg border border-gray-200 bg-white px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          Prev
        </button>

        {pageNumbers.map((p, idx) =>
          p === "ellipsis" ? (
            <span key={`e-${idx}`} className="px-1 md:px-2 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm font-semibold ${
                p === page
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-50 border border-gray-200 bg-white"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
          disabled={page === maxPage}
          className="rounded-lg border border-gray-200 bg-white px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          Next
        </button>
        </div>
      )}
    </div>
  );
}
