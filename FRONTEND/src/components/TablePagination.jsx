import { useState } from 'react';
import './TablePagination.css';

export default function TablePagination({
  totalItems,
  pageSize = 10,
  currentPage,
  onPageChange,
  idPrefix = 'table',
  showSummary = true,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);
  const isMiddlePage = safePage > 2 && safePage < totalPages;
  const [jumpDraft, setJumpDraft] = useState(null);
  const jumpPage = jumpDraft ?? (isMiddlePage ? String(safePage) : '');

  const changePage = (pageNumber) => onPageChange(Math.min(Math.max(1, pageNumber), totalPages));
  const commitJump = () => {
    const rawValue = jumpPage.trim();
    const parsedPage = Number(rawValue);
    if (!rawValue || !Number.isInteger(parsedPage)) {
      setJumpDraft(null);
      return;
    }
    const targetPage = Math.min(Math.max(1, parsedPage), totalPages);
    setJumpDraft(null);
    changePage(targetPage);
  };

  const compactPages = totalPages <= 3
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [1, 2];

  return (
    <div className="product-pagination-bar">
      {showSummary && <div className="product-pagination-range">
        <span className="product-pagination-range__text">Hiển thị </span>
        <strong className="product-pagination-range__number">
          {totalItems === 0 ? '0' : `${startIndex}-${endIndex}`}
        </strong>
        <span className="product-pagination-range__text"> trên tổng số {totalItems} kết quả</span>
      </div>}

      <div className="product-pagination-controls">
        {safePage > 1 && <button
          type="button"
          className="product-pagination-btn product-pagination-btn--nav"
          onClick={() => changePage(safePage - 1)}
          aria-label="Trang trước"
          id={`${idPrefix}-pagination-prev`}
        >
          ←
        </button>}
        {compactPages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`product-pagination-btn ${pageNumber === safePage ? 'product-pagination-btn--active' : ''}`}
            onClick={() => changePage(pageNumber)}
            aria-current={pageNumber === safePage ? 'page' : undefined}
            id={`${idPrefix}-pagination-page-${pageNumber}`}
          >
            {pageNumber}
          </button>
        ))}
        {totalPages > 3 && <>
          <input
            className={`product-pagination-jump ${isMiddlePage ? 'product-pagination-jump--current' : ''}`}
            type="number"
            min="1"
            max={totalPages}
            step="1"
            inputMode="numeric"
            value={jumpPage}
            placeholder="…"
            onChange={(event) => setJumpDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') commitJump(); }}
            onBlur={commitJump}
            aria-label="Đi đến trang"
            id={`${idPrefix}-pagination-jump`}
          />
          <button
            type="button"
            className={`product-pagination-btn ${safePage === totalPages ? 'product-pagination-btn--active' : ''}`}
            onClick={() => changePage(totalPages)}
            aria-current={safePage === totalPages ? 'page' : undefined}
            id={`${idPrefix}-pagination-page-${totalPages}`}
          >
            {totalPages}
          </button>
        </>}
        {safePage < totalPages && <button
          type="button"
          className="product-pagination-btn product-pagination-btn--nav"
          onClick={() => changePage(safePage + 1)}
          aria-label="Trang sau"
          id={`${idPrefix}-pagination-next`}
        >
          →
        </button>}
      </div>
    </div>
  );
}
