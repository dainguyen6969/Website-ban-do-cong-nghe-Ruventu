import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import FilterDropdown from '../components/FilterDropdown';
import { formatMoney, mockOrders, orderStatuses } from '../data/mockOrders';
import './DanhSachDonHang.css';

const BATCH_SIZE = 20;
const allOrderStatuses = ['Tất cả', ...orderStatuses];
const paymentOptions = ['Tất cả', 'Đã thanh toán', 'Chưa thanh toán'];
const timeOptions = ['Tất cả', 'Hôm nay', '7 ngày qua', '30 ngày qua', 'Tháng này'];
const referenceDate = new Date('2026-09-15T12:00:00');

const statusCounts = (orders) => [
  { count: orders.length, label: 'TỔNG', variant: 'default' },
  { count: orders.filter((order) => order.status === 'Chờ duyệt').length, label: 'CHỜ DUYỆT', variant: 'yellow' },
  { count: orders.filter((order) => order.status === 'Đang giao hàng').length, label: 'ĐANG GIAO', variant: 'blue' },
  { count: orders.filter((order) => order.status === 'Đã hủy').length, label: 'ĐÃ HỦY', variant: 'red' },
];

const normalize = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase();

function matchesTimeFilter(orderDate, filter) {
  if (filter === 'Tất cả') return true;
  const date = new Date(`${orderDate}T12:00:00`);
  const diffDays = Math.floor((referenceDate - date) / 86400000);
  if (filter === 'Hôm nay') return diffDays === 0;
  if (filter === '7 ngày qua') return diffDays >= 0 && diffDays < 7;
  if (filter === '30 ngày qua') return diffDays >= 0 && diffDays < 30;
  return date.getMonth() === referenceDate.getMonth() && date.getFullYear() === referenceDate.getFullYear();
}

export default function DanhSachDonHang() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [paymentFilter, setPaymentFilter] = useState('Tất cả');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const filteredOrders = useMemo(() => mockOrders.filter((order) => {
    const query = normalize(search.trim());
    const searchTarget = normalize(`${order.id} ${order.customerName} ${order.customerPhone}`);
    return (!query || searchTarget.includes(query))
      && (statusFilter === 'Tất cả' || order.status === statusFilter)
      && (paymentFilter === 'Tất cả' || order.payment === paymentFilter)
      && matchesTimeFilter(order.createdIso, timeFilter);
  }), [search, statusFilter, paymentFilter, timeFilter]);

  const visibleOrders = filteredOrders.slice(0, visibleCount);
  const stats = statusCounts(filteredOrders);
  const hasMore = visibleOrders.length < filteredOrders.length;

  const handleScroll = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (hasMore && scrollHeight - scrollTop - clientHeight < 160) {
      setVisibleCount((count) => Math.min(count + BATCH_SIZE, filteredOrders.length));
    }
  };

  return (
    <>
      <div className="content__filter-row order-filter-row">
        <div className="content__filter-left">
          <label className="filter__search" htmlFor="search-orders">
            <HiOutlineSearch size={16} className="filter__search-icon" />
            <input
              type="search"
              className="filter__search-input"
              placeholder="Tìm kiếm mã đơn hàng, khách hàng, SĐT..."
              id="search-orders"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setVisibleCount(BATCH_SIZE); }}
            />
          </label>
          <FilterDropdown id="filter-trang-thai-don" label="Trạng thái đơn hàng" options={allOrderStatuses} value={statusFilter} onSelect={(value) => { setStatusFilter(value); setVisibleCount(BATCH_SIZE); }} />
          <FilterDropdown id="filter-thanh-toan" label="Trạng thái thanh toán" options={paymentOptions} value={paymentFilter} onSelect={(value) => { setPaymentFilter(value); setVisibleCount(BATCH_SIZE); }} />
          <FilterDropdown id="filter-thoi-gian" label="Thời gian" options={timeOptions} value={timeFilter} onSelect={(value) => { setTimeFilter(value); setVisibleCount(BATCH_SIZE); }} />
        </div>

        <div className="content__stats">
          {stats.map((stat) => (
            <div key={stat.label} className={`stat-badge stat-badge--${stat.variant}`}>
              <span className="stat-badge__count">{stat.count}</span>
              <span className="stat-badge__label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="order-table-scroll" onScroll={handleScroll} aria-label="Danh sách đơn hàng cuộn vô hạn">
        <table className="order-list-table" id="orders-table">
          <thead>
            <tr>
              <th>#</th><th>ẢNH</th><th>ĐƠN HÀNG</th><th>NGÀY TẠO</th><th>KHÁCH HÀNG</th><th>TRẠNG THÁI ĐƠN</th><th>THANH TOÁN</th><th>ĐÓNG GÓI</th><th>XUẤT KHO</th><th>TỔNG TIỀN</th><th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order, index) => (
              <tr key={order.id} className={order.status === 'Đã hủy' ? 'order-row--cancelled' : ''}>
                <td className="order-row-number">{index + 1}</td>
                <td><img className="order-thumbnail" src={order.image} alt="" /></td>
                <td><strong className="order-primary">{order.id}</strong><OrderStateBadge value={order.type} /></td>
                <td><strong>{order.createdDate}</strong><small>{order.createdTime}</small></td>
                <td><strong>{order.customerName}</strong><small>{order.customerPhone || '—'}</small></td>
                <td><OrderStateBadge value={order.status} /></td>
                <td><OrderStateBadge value={order.payment} /></td>
                <td><OrderStateBadge value={order.packing} /></td>
                <td><OrderStateBadge value={order.warehouse} /></td>
                <td><strong className="order-total">{formatMoney(order.total)}</strong></td>
                <td><button className="order-detail-button" type="button" onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`)}>XEM CHI TIẾT</button></td>
              </tr>
            ))}
            {!visibleOrders.length && <tr className="order-empty-row"><td colSpan="11">Không tìm thấy đơn hàng phù hợp.</td></tr>}
            {visibleOrders.length > 0 && (
              <tr className="order-load-row">
                <td colSpan="11">{hasMore ? `Cuộn xuống để xem thêm · ${visibleOrders.length}/${filteredOrders.length}` : `Đã hiển thị ${filteredOrders.length} đơn hàng`}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function OrderStateBadge({ value }) {
  const variant = value === 'Online' ? 'blue'
    : value === 'Tại quầy' ? 'neutral'
      : value === 'Đã hủy' || value === 'Hủy đóng gói' ? 'red'
        : value === 'Chưa thanh toán' || value === 'Chờ duyệt' || value === 'Chờ đóng gói' || value === 'Chờ lấy hàng' ? 'amber'
          : value === 'Đang giao hàng' ? 'green'
            : value === 'Đang đóng gói' ? 'orange'
              : value.startsWith('Đã') || value === 'Hoàn thành' ? 'green' : 'neutral';
  return <span className={`order-state-badge order-state-badge--${variant}`}>{value.toUpperCase()}</span>;
}
