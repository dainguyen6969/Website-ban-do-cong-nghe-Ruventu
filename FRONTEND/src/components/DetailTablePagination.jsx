import TablePagination from './TablePagination';
import { DETAIL_TABLE_PAGE_SIZE } from '../hooks/useDetailTablePagination';

export default function DetailTablePagination({ totalItems, currentPage, onPageChange, idPrefix }) {
  if (totalItems <= DETAIL_TABLE_PAGE_SIZE) return null;

  return (
    <TablePagination
      totalItems={totalItems}
      pageSize={DETAIL_TABLE_PAGE_SIZE}
      currentPage={currentPage}
      onPageChange={onPageChange}
      idPrefix={idPrefix}
    />
  );
}
