import { useState } from 'react';
import FormCard from '../../../../shared/components/ui/FormCard';
import TablePagination from '../../../../shared/components/ui/TablePagination';

export function WarrantyBadge({ children, tone }) {
  if (!children)
    return (
      <span className="w-shell-missing" title="Chưa có thông tin">
        —
      </span>
    );
  const variant =
    tone ||
    {
      'Tiếp nhận': 'blue',
      'Đang kiểm tra': 'amber',
      'Đã gửi bảo hành': 'purple',
      'Đang bảo hành': 'amber',
      'Đã nhận lại': 'cyan',
      'Chờ trả khách': 'cyan',
      'Chờ đổi sản phẩm': 'orange',
      'Đã bàn giao thiết bị': 'green',
      'Khách đã đồng ý': 'green',
      'Khách đã từ chối': 'red',
      'Chờ khách phản hồi': 'amber',
      'Đã thanh toán': 'green',
      'Chưa thanh toán': 'amber',
      'Thanh toán một phần': 'amber',
      'Chờ hoàn tiền': 'amber',
      'Hoàn tiền một phần': 'orange',
      'Đã hoàn tiền': 'green',
    }[children] ||
    'neutral';
  return <span className={`w-shell-badge w-shell-badge--${variant}`}>{children}</span>;
}

export function WarrantyPanel({ title, note, action, className = '', children }) {
  return (
    <FormCard
      title={title}
      headerRight={action}
      className={`w-shell-panel ${className}`.trim()}
    >
      <div className="w-shell-panel-body">
        {note && <p className="w-shell-note w-panel-note">{note}</p>}
        {children}
      </div>
    </FormCard>
  );
}

export function WarrantyFields({ fields }) {
  return (
    <dl className="w-shell-fields">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WarrantyTable({
  columns,
  rows = [],
  empty,
  pageSize: initialPageSize = 5,
  idPrefix = 'warranty-table',
  showPagination = true,
  pageSizeOptions = [5, 10, 20, 50, 100],
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = showPagination ? rows.slice(startIndex, startIndex + pageSize) : rows;

  return (
    <div className="w-shell-table-scroll">
      <div
        className="admin-table-scroll admin-table-scroll--embedded"
        tabIndex={0}
        role="region"
        aria-label="Bảng dữ liệu liên quan"
      >
        <table className="w-shell-detail-table admin-data-table admin-data-table--records">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell ?? '—'}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="w-shell-empty">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <TablePagination
          className="admin-table-footer"
          totalItems={totalItems}
          pageSize={pageSize}
          currentPage={safePage}
          onPageChange={setCurrentPage}
          idPrefix={idPrefix}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={(newSize) => {
            setPageSize(Number(newSize));
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}
