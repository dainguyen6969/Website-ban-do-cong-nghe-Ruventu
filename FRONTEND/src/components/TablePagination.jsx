import './TablePagination.css';

export default function TablePagination({
  totalItems,
  pageSize = 10,
  currentPage,
  onPageChange,
  idPrefix = 'table',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="product-pagination-bar">
      <div className="product-pagination-range">
        <span className="product-pagination-range__text">Hiển thị </span>
        <strong className="product-pagination-range__number">
          {totalItems === 0 ? '0' : `${startIndex}-${endIndex}`}
        </strong>
        <span className="product-pagination-range__text"> trên tổng số {totalItems} kết quả</span>
      </div>

      <div className="product-pagination-controls">
        <button
          type="button"
          className="product-pagination-btn product-pagination-btn--nav"
          disabled={safePage === 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          aria-label="Trang trước"
          id={`${idPrefix}-pagination-prev`}
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`product-pagination-btn ${pageNumber === safePage ? 'product-pagination-btn--active' : ''}`}
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === safePage ? 'page' : undefined}
            id={`${idPrefix}-pagination-page-${pageNumber}`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          className="product-pagination-btn product-pagination-btn--nav"
          disabled={safePage === totalPages || totalItems === 0}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          aria-label="Trang sau"
          id={`${idPrefix}-pagination-next`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
