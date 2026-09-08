import { HiOutlineSearch } from 'react-icons/hi';
import FilterDropdown from '../components/FilterDropdown';

const statBadges = [
  { count: '0', label: 'TỔNG', variant: 'default' },
  { count: '0', label: 'CHỜ DUYỆT', variant: 'yellow' },
  { count: '0', label: 'ĐANG GIAO', variant: 'blue' },
  { count: '0', label: 'ĐÃ HỦY', variant: 'red' },
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

const filterOptionsOrderState = [
  'Tất cả',
  'Chờ duyệt',
  'Đang xử lý',
  'Đang giao',
  'Hoàn thành',
  'Đã hủy',
];

const filterOptionsPaymentState = [
  'Tất cả',
  'Đã thanh toán',
  'Chưa thanh toán',
];

const filterOptionsTime = [
  'Tất cả',
  'Hôm nay',
  '7 ngày qua',
  '30 ngày qua',
  'Tháng này',
];

export default function DanhSachDonHang() {
  return (
    <>
      {/* Filter row */}
      <div className="content__filter-row">
        <div className="content__filter-left">
          {/* Search input */}
          <div className="filter__search">
            <HiOutlineSearch size={16} className="filter__search-icon" />
            <input
              type="text"
              className="filter__search-input"
              placeholder="Tìm kiếm mã đơn hàng, khách hàng, SĐT..."
              id="search-orders"
            />
          </div>

          {/* Dropdown 1: Trạng thái đơn hàng */}
          <FilterDropdown
            id="filter-trang-thai-don"
            label="Trạng thái đơn hàng"
            options={filterOptionsOrderState}
            defaultValue="Tất cả"
          />

          {/* Dropdown 2: Trạng thái thanh toán */}
          <FilterDropdown
            id="filter-thanh-toan"
            label="Trạng thái thanh toán"
            options={filterOptionsPaymentState}
            defaultValue="Tất cả"
          />

          {/* Dropdown 3: Thời gian */}
          <FilterDropdown
            id="filter-thoi-gian"
            label="Thời gian"
            options={filterOptionsTime}
            defaultValue="Tất cả"
          />
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
    </>
  );
}
