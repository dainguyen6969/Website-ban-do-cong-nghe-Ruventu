// Reusable admin UI primitive: TablePagination.
import { useState } from 'react';
import './TablePagination.css';

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages]);
  for (let page = Math.max(1, currentPage - 1); page <= Math.min(totalPages, currentPage + 1); page++) pages.add(page);
  const result = [];
  for (const page of [...pages].sort((a, b) => a - b)) {
    const previous = result.at(-1);
    if (page - previous > 1) result.push('...');
    result.push(page);
  }
  return result;
}

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
  const [jumpDraft, setJumpDraft] = useState(null);
  const jumpPage = jumpDraft ?? String(safePage);

  const changePage = (pageNumber) => { setJumpDraft(null); onPageChange(Math.min(Math.max(1, pageNumber), totalPages)); };
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

  const compactPages = getPageNumbers(safePage, totalPages);

  return (
    <div className="product-pagination-bar">
      {showSummary && <div className="product-pagination-range">
        <span className="product-pagination-range__text">Hiển thị </span>
        <strong className="product-pagination-range__number">
          {totalItems === 0 ? '0' : `${startIndex}-${endIndex}`}
        </strong>
        <span className="product-pagination-range__text"> trên tổng số {totalItems} kết quả</span>
      </div>}

      <nav className="product-pagination-controls" aria-label="Phân trang">
        {safePage > 1 && <button
          type="button"
          className="product-pagination-btn product-pagination-btn--nav"
          onClick={() => changePage(safePage - 1)}
          aria-label="Trang trước"
          id={`${idPrefix}-pagination-prev`}
        >
          ←
        </button>}
        {compactPages.map((pageNumber, index) => pageNumber === '...' ? <span key={`gap-${index}`} className="product-pagination-ellipsis" aria-hidden="true">...</span> : (
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
        {totalPages > 3 &&
          <input
            className="product-pagination-jump"
            type="number"
            min="1"
            max={totalPages}
            step="1"
            inputMode="numeric"
            value={jumpPage}
            title="Nhập số trang rồi nhấn Enter"
            onChange={(event) => setJumpDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') commitJump(); }}
            onBlur={commitJump}
            aria-label="Đi đến trang"
            id={`${idPrefix}-pagination-jump`}
          />}
        {safePage < totalPages && <button
          type="button"
          className="product-pagination-btn product-pagination-btn--nav"
          onClick={() => changePage(safePage + 1)}
          aria-label="Trang sau"
          id={`${idPrefix}-pagination-next`}
        >
          →
        </button>}
      </nav>
    </div>
  );
}
