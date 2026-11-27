import { useState } from "react";

// Project convention: related-record tables inside detail pages default to 5 rows.
export const DETAIL_TABLE_PAGE_SIZE = 5;

export default function useDetailTablePagination(items = [], initialPageSize = DETAIL_TABLE_PAGE_SIZE) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const rows = Array.isArray(items) ? items : [];
  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / pageSize),
  );
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    currentPage: safePage,
    pageSize,
    setPageSize,
    onPageChange: setCurrentPage,
    onPageSizeChange: (newSize) => {
      setPageSize(Number(newSize));
      setCurrentPage(1);
    },
    visibleItems: rows.slice(startIndex, startIndex + pageSize),
  };
}
