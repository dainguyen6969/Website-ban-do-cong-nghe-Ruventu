import { useState } from 'react';
import {
  HiOutlineDownload,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineChevronDown,
} from 'react-icons/hi';
import './MainContent.css';

const tabs = [
  { id: 'danh-sach-don-hang', label: 'Danh sách đơn hàng' },
  { id: 'dat-hang-online', label: 'Đặt hàng online' },
  { id: 'quan-ly-giao-hang', label: 'Quản lý giao hàng' },
  { id: 'khach-tra-hang', label: 'Khách trả hàng' },
];

const statBadges = [
  { count: '12', label: 'TỔNG', variant: 'default' },
  { count: '2', label: 'CHỜ DUYỆT', variant: 'yellow' },
  { count: '5', label: 'ĐANG GIAO', variant: 'blue' },
  { count: '2', label: 'ĐÃ HỦY', variant: 'red' },
];

const tableColumns = [
  { id: 'checkbox', label: '', isCheckbox: true },
  { id: 'ma-don-hang', label: 'MÃ ĐƠN HÀNG' },
  { id: 'khach-hang', label: 'KHÁCH HÀNG' },
  { id: 'ngay-dat', label: 'NGÀY ĐẶT' },
  { id: 'thanh-toan', label: 'THANH TOÁN' },
  { id: 'trang-thai-don', label: 'TRẠNG THÁI ĐƠN HÀNG' },
  { id: 'trang-thai-kho', label: 'TRẠNG THÁI KHO/GIAO' },
  { id: 'tong-tien', label: 'TỔNG TIỀN' },
  { id: 'thao-tac', label: 'THAO TÁC' },
];

export default function MainContent() {
  const [activeTab, setActiveTab] = useState('danh-sach-don-hang');

  return (
    <main className="main-content" role="main">
      {/* Secondary breadcrumb */}
      <nav className="content__breadcrumb" aria-label="Breadcrumb nội dung">
        <span className="content__breadcrumb-item">Đơn hàng</span>
        <span className="content__breadcrumb-sep" aria-hidden="true">›</span>
        <span className="content__breadcrumb-item content__breadcrumb-item--current">
          Quản lý đơn hàng
        </span>
      </nav>

      {/* Page title + action buttons */}
      <div className="content__title-row">
        <h1 className="content__title">QUẢN LÝ ĐƠN HÀNG</h1>
        <div className="content__actions">
          <button className="btn btn--outline" id="btn-export-excel">
            <HiOutlineDownload size={16} />
            <span>XUẤT EXCEL</span>
          </button>
          <button className="btn btn--primary" id="btn-dat-hang-online">
            <HiOutlinePlus size={16} />
            <span>ĐẶT HÀNG ONLINE</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="content__tabs" role="tablist" aria-label="Tabs đơn hàng">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`content__tab ${activeTab === tab.id ? 'content__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            id={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="content__tabs-divider" aria-hidden="true" />

      {/* Filter row */}
      <div className="content__filter-row">
        <div className="content__filter-left">
          {/* Search */}
          <div className="filter__search">
            <HiOutlineSearch size={16} className="filter__search-icon" />
            <input
              type="text"
              className="filter__search-input"
              placeholder="Tìm kiếm mã đơn hàng, khách hàng, SĐT..."
              id="search-orders"
            />
          </div>

          {/* Dropdown filters */}
          <div className="filter__dropdown" id="filter-trang-thai-don">
            <span className="filter__dropdown-label">
              Trạng thái đơn hàng: <strong>Tất cả</strong>
            </span>
            <HiOutlineChevronDown size={14} />
          </div>
          <div className="filter__dropdown" id="filter-thanh-toan">
            <span className="filter__dropdown-label">
              Trạng thái thanh toán: <strong>Tất cả</strong>
            </span>
            <HiOutlineChevronDown size={14} />
          </div>
          <div className="filter__dropdown" id="filter-thoi-gian">
            <span className="filter__dropdown-label">
              Thời gian: <strong>Tất cả</strong>
            </span>
            <HiOutlineChevronDown size={14} />
          </div>
        </div>

        {/* Stat badges */}
        <div className="content__stats">
          {statBadges.map((stat) => (
            <div key={stat.label} className={`stat-badge stat-badge--${stat.variant}`}>
              <span className="stat-badge__count">{stat.count}</span>
              <span className="stat-badge__label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="content__table-wrapper">
        <table className="data-table" id="orders-table">
          <thead className="data-table__head">
            <tr>
              {tableColumns.map((col) => (
                <th key={col.id} className="data-table__th">
                  {col.isCheckbox ? (
                    <input
                      type="checkbox"
                      className="data-table__checkbox"
                      aria-label="Chọn tất cả"
                      id="select-all-orders"
                    />
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="data-table__body">
            {/* Placeholder empty state */}
            <tr className="data-table__empty-row">
              <td colSpan={tableColumns.length} className="data-table__empty-cell">
                <div className="data-table__empty-state">
                  <div className="data-table__empty-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <rect x="4" y="8" width="40" height="32" rx="4" stroke="#d1d5db" strokeWidth="2" fill="none" />
                      <line x1="4" y1="18" x2="44" y2="18" stroke="#d1d5db" strokeWidth="2" />
                      <line x1="16" y1="8" x2="16" y2="40" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="32" y1="8" x2="32" y2="40" stroke="#e5e7eb" strokeWidth="1" />
                      <circle cx="24" cy="30" r="4" stroke="#d1d5db" strokeWidth="1.5" fill="none" />
                      <line x1="27" y1="33" x2="30" y2="36" stroke="#d1d5db" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="data-table__empty-text">Chưa có dữ liệu</span>
                  <span className="data-table__empty-subtext">
                    Dữ liệu đơn hàng sẽ được hiển thị tại đây
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
