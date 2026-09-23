import { useState } from 'react';

// Project convention: related-record tables inside detail pages paginate at five rows.
export const DETAIL_TABLE_PAGE_SIZE = 5;

export default function useDetailTablePagination(items = []) {
  const [currentPage, setCurrentPage] = useState(1);
  const rows = Array.isArray(items) ? items : [];
  const totalPages = Math.max(1, Math.ceil(rows.length / DETAIL_TABLE_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * DETAIL_TABLE_PAGE_SIZE;

  return {
    currentPage: safePage,
    onPageChange: setCurrentPage,
    visibleItems: rows.slice(startIndex, startIndex + DETAIL_TABLE_PAGE_SIZE),
  };
}
