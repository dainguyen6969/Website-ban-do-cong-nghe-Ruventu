// Shared pagination for lists, detail tables and product results.
import React, { useState } from 'react';
import FilterDropdown from './FilterDropdown';
import './TablePagination.css';

export default function TablePagination({
  totalItems,
  pageSize = 10,
  currentPage,
  onPageChange,
  idPrefix = 'table',
  showSummary = true,
  className = '',
  pageSizeOptions,
  onPageSizeChange,
}) {
  const [internalPageSize, setInternalPageSize] = useState(pageSize);
  const effectivePageSize = onPageSizeChange ? pageSize : internalPageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * effectivePageSize + 1;
  const endIndex = Math.min(safePage * effectivePageSize, totalItems);
  const firstVisible = Math.max(1, Math.min(safePage - 1, totalPages - 2));
  const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => firstVisible + index);

  const handlePageSizeSelect = (newSize) => {
    const sizeVal = Number(newSize);
    if (onPageSizeChange) {
      onPageSizeChange(sizeVal);
    } else {
      setInternalPageSize(sizeVal);
    }
    if (onPageChange) {
      onPageChange(1);
    }
  };

  const normalizedPageSizeOptions = pageSizeOptions
    ? (() => {
        const list = pageSizeOptions.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : `${val} / trang`;
          return { value: Number(val), label: lbl };
        });
        const currentNum = Number(effectivePageSize);
        if (currentNum && !list.some((o) => o.value === currentNum)) {
          list.push({ value: currentNum, label: `${currentNum} / trang` });
          list.sort((a, b) => a.value - b.value);
        }
        return list;
      })()
    : null;

  return (
    <div
      className={`product-pagination-bar product-pagination-bar--compact${showSummary ? '' : ' product-pagination-bar--no-summary'} ${className}`}
    >
      {showSummary && (
        <div className="product-pagination-range">
          <span className="product-pagination-range__text">Hiển thị </span>
          <strong className="product-pagination-range__number">
            {totalItems === 0 ? '0' : `${startIndex}-${endIndex}`}
          </strong>
          <span className="product-pagination-range__text"> trên tổng số {totalItems} kết quả</span>
        </div>
      )}
      <nav className="product-pagination-controls" aria-label="Phân trang">
        {normalizedPageSizeOptions && normalizedPageSizeOptions.length > 0 && (
          <div className="product-pagination-size-picker">
            <FilterDropdown
              className="product-pagination-size-select"
              value={effectivePageSize}
              options={normalizedPageSizeOptions}
              onSelect={handlePageSizeSelect}
              selectedDark={true}
              direction="up"
              aria-label="Số bản ghi mỗi trang"
              id={`${idPrefix}-page-size-select`}
            />
          </div>
        )}
        {safePage > 1 && (
          <>
            <button
              type="button"
              className="product-pagination-btn product-pagination-btn--nav"
              aria-label="Trang đầu"
              id={`${idPrefix}-pagination-first`}
              onClick={() => onPageChange(1)}
            >
              «
            </button>
            <button
              type="button"
              className="product-pagination-btn product-pagination-btn--nav"
              aria-label="Trang trước"
              id={`${idPrefix}-pagination-prev`}
              onClick={() => onPageChange(safePage - 1)}
            >
              ‹
            </button>
          </>
        )}
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`product-pagination-btn ${page === safePage ? 'product-pagination-btn--active' : ''}`}
            aria-current={page === safePage ? 'page' : undefined}
            id={`${idPrefix}-pagination-page-${page}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        {safePage < totalPages && (
          <>
            <button
              type="button"
              className="product-pagination-btn product-pagination-btn--nav"
              aria-label="Trang sau"
              id={`${idPrefix}-pagination-next`}
              onClick={() => onPageChange(safePage + 1)}
            >
              ›
            </button>
            <button
              type="button"
              className="product-pagination-btn product-pagination-btn--nav"
              aria-label="Trang cuối"
              id={`${idPrefix}-pagination-last`}
              onClick={() => onPageChange(totalPages)}
            >
              »
            </button>
          </>
        )}
        <div className="product-pagination-page-picker">
          <FilterDropdown
            className="product-pagination-page-select"
            value={safePage}
            options={Array.from({ length: totalPages }, (_, index) => index + 1)}
            onSelect={(value) => onPageChange(Number(value))}
            selectedDark={false}
            direction="up"
            aria-label="Chọn trang"
            id={`${idPrefix}-pagination-select`}
          />
          <span>/ {totalPages}</span>
        </div>
      </nav>
    </div>
  );
}
