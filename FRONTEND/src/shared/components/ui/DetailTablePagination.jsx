// Reusable admin UI primitive: DetailTablePagination.
import TablePagination from './TablePagination';
import { DETAIL_TABLE_PAGE_SIZE } from '../../../hooks/useDetailTablePagination';

export default function DetailTablePagination({
  totalItems,
  currentPage,
  onPageChange,
  idPrefix,
  pageSize = DETAIL_TABLE_PAGE_SIZE,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
  showSummary = true,
  className = '',
}) {
  if (totalItems <= 0) return null;

  return (
    <TablePagination
      className={`admin-table-footer ${className}`}
      totalItems={totalItems}
      pageSize={pageSize}
      currentPage={currentPage}
      onPageChange={onPageChange}
      idPrefix={idPrefix}
      showSummary={showSummary}
      pageSizeOptions={pageSizeOptions}
      onPageSizeChange={onPageSizeChange}
    />
  );
}
