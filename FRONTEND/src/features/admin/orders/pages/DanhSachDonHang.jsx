// Admin order screen: DanhSachDonHang.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineAdjustments, HiOutlineSearch } from 'react-icons/hi';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import useOrders from '../../../../context/useOrders';
import {
  formatMoney, orderStatuses, orderTypeOptions, packingOptions, paymentOptions, warehouseOptions,
} from '../../../../data/mockOrders';
import './DanhSachDonHang.css';

const PAGE_SIZE = 10;
const statusOptions = ['Tất cả', ...orderStatuses];
const timeOptions = ['Tất cả', 'Hôm nay', '7 ngày qua', '30 ngày qua', 'Tháng này'];
const emptyFilters = {
  search: '', type: 'Tất cả', status: 'Tất cả', payment: 'Tất cả', time: 'Tất cả', packing: 'Tất cả', warehouse: 'Tất cả', fromDate: '', toDate: '',
};

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase();

function matchesTimeFilter(orderDate, filter, referenceDate) {
  if (filter === 'Tất cả' || !orderDate || !referenceDate) return true;
  const date = new Date(`${orderDate}T12:00:00`);
  const reference = new Date(`${referenceDate}T12:00:00`);
  const diffDays = Math.floor((reference - date) / 86400000);
  if (filter === 'Hôm nay') return diffDays === 0;
  if (filter === '7 ngày qua') return diffDays >= 0 && diffDays < 7;
  if (filter === '30 ngày qua') return diffDays >= 0 && diffDays < 30;
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear();
}

const statusCounts = (orders) => [
  { count: orders.length, label: 'TỔNG', variant: 'default' },
  { count: orders.filter((order) => order.status === 'Chờ duyệt').length, label: 'CHỜ DUYỆT', variant: 'yellow' },
  { count: orders.filter((order) => order.status === 'Đang giao hàng').length, label: 'ĐANG GIAO', variant: 'blue' },
  { count: orders.filter((order) => order.status === 'Đã hủy').length, label: 'ĐÃ HỦY', variant: 'red' },
];

export default function DanhSachDonHang() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);

  const latestOrderDate = useMemo(
    () => orders.reduce((latest, order) => order.createdIso > latest ? order.createdIso : latest, ''),
    [orders],
  );

  const setBasicFilter = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setApplied((current) => ({ ...current, [field]: value }));
    setCurrentPage(1);
  };
  const setAdvancedFilter = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const applyFilters = () => { setApplied({ ...draft }); setCurrentPage(1); };
  const clearFilters = () => { setDraft(emptyFilters); setApplied(emptyFilters); setCurrentPage(1); };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const query = normalize(applied.search.trim());
    const target = normalize(`${order.id} ${order.customerName} ${order.customerPhone}`);
    return (!query || target.includes(query))
      && (applied.type === 'Tất cả' || order.type === applied.type)
      && (applied.status === 'Tất cả' || order.status === applied.status)
      && (applied.payment === 'Tất cả' || order.payment === applied.payment)
      && matchesTimeFilter(order.createdIso, applied.time, latestOrderDate)
      && (applied.packing === 'Tất cả' || order.packing === applied.packing)
      && (applied.warehouse === 'Tất cả' || order.warehouse === applied.warehouse)
      && (!applied.fromDate || order.createdIso >= applied.fromDate)
      && (!applied.toDate || order.createdIso <= applied.toDate);
  }), [applied, latestOrderDate, orders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleOrders = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
  const stats = statusCounts(filteredOrders);

  return (
    <>
      <section className="order-toolbar" aria-label="Bộ lọc đơn hàng">
        <div className="order-toolbar__primary">
          <label className="order-search" htmlFor="search-orders">
            <HiOutlineSearch size={17} />
            <input id="search-orders" type="search" value={draft.search} onChange={(event) => setBasicFilter('search', event.target.value)} placeholder="TÌM MÃ ĐƠN HÀNG / TÊN KHÁCH HÀNG / SỐ ĐIỆN THOẠI..." />
          </label>
          <FilterDropdown id="order-type-filter" label="LOẠI ĐƠN" options={orderTypeOptions} value={draft.type} onSelect={(value) => setBasicFilter('type', value)} />
          <FilterDropdown id="order-status-filter" label="TRẠNG THÁI ĐƠN" options={statusOptions} value={draft.status} onSelect={(value) => setBasicFilter('status', value)} />
          <FilterDropdown id="order-payment-filter" label="THANH TOÁN" options={paymentOptions} value={draft.payment} onSelect={(value) => setBasicFilter('payment', value)} />
          <FilterDropdown id="order-time-filter" label="THỜI GIAN" options={timeOptions} value={draft.time} onSelect={(value) => setBasicFilter('time', value)} />
          <button type="button" className={`order-advanced-toggle ${showAdvanced ? 'order-advanced-toggle--active' : ''}`} onClick={() => setShowAdvanced((current) => !current)} aria-expanded={showAdvanced}><HiOutlineAdjustments size={16} /> BỘ LỌC NÂNG CAO</button>
        </div>
        {showAdvanced && (
          <div className="order-toolbar__advanced">
            <AdvancedFilter label="TRẠNG THÁI ĐÓNG GÓI"><FilterDropdown options={packingOptions} value={draft.packing} onSelect={(value) => setAdvancedFilter('packing', value)} /></AdvancedFilter>
            <AdvancedFilter label="TRẠNG THÁI XUẤT KHO"><FilterDropdown options={warehouseOptions} value={draft.warehouse} onSelect={(value) => setAdvancedFilter('warehouse', value)} /></AdvancedFilter>
            <AdvancedFilter label="TỪ NGÀY"><input className="order-date-input" type="date" value={draft.fromDate} onChange={(event) => setAdvancedFilter('fromDate', event.target.value)} /></AdvancedFilter>
            <AdvancedFilter label="ĐẾN NGÀY"><input className="order-date-input" type="date" value={draft.toDate} onChange={(event) => setAdvancedFilter('toDate', event.target.value)} /></AdvancedFilter>
            <div className="order-filter-actions"><button type="button" className="order-filter-clear" onClick={clearFilters}>XÓA</button><button type="button" className="order-filter-apply" onClick={applyFilters}>ÁP DỤNG</button></div>
          </div>
        )}
      </section>

      <section className="order-list-content">
        <div className="order-summary-stats" aria-label="Tổng hợp đơn hàng">
          {stats.map((stat) => (
            <div key={stat.label} className={`stat-badge stat-badge--${stat.variant}`}>
              <span className="stat-badge__count">{stat.count}</span>
              <span className="stat-badge__label">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="order-table-scroll" aria-label="Danh sách đơn hàng">
          <table className="order-list-table" id="orders-table">
            <thead><tr><th>ẢNH</th><th>ĐƠN HÀNG</th><th>NGÀY TẠO</th><th>KHÁCH HÀNG</th><th>TRẠNG THÁI ĐƠN</th><th>THANH TOÁN</th><th>ĐÓNG GÓI</th><th>XUẤT KHO</th><th>TỔNG TIỀN</th><th>THAO TÁC</th></tr></thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id} className={order.status === 'Đã hủy' ? 'order-row--cancelled' : ''}>
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
              {!visibleOrders.length && <tr className="order-empty-row"><td colSpan="10">Không tìm thấy đơn hàng phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="order-list-footer">
          <p>HIỂN THỊ {filteredOrders.length ? startIndex + 1 : 0}-{Math.min(startIndex + PAGE_SIZE, filteredOrders.length)} TRÊN TỔNG SỐ {filteredOrders.length} ĐƠN HÀNG</p>
          <TablePagination currentPage={safePage} pageSize={PAGE_SIZE} totalItems={filteredOrders.length} onPageChange={setCurrentPage} idPrefix="orders" />
        </div>
      </section>
    </>
  );
}

function AdvancedFilter({ label, children }) {
  return <label className="order-advanced-field"><span>{label}</span>{children}</label>;
}

export function OrderStateBadge({ value }) {
  const label = String(value ?? '—');
  const variant = label === 'Online' || label === 'Đang giao hàng' ? 'blue'
    : label === 'Tại quầy' || label === 'Chưa đóng gói' || label === 'Chưa xuất kho' ? 'neutral'
      : label === 'Đã hủy' || label === 'Hủy đóng gói' ? 'red'
        : label === 'Chờ duyệt' || label === 'Chưa thanh toán' || label === 'Chờ thanh toán' ? 'amber'
          : label === 'Chờ đóng gói' ? 'purple'
            : label === 'Chờ lấy hàng' ? 'cyan'
              : label === 'Đang đóng gói' ? 'orange'
                : label.startsWith('Đã') || label === 'Hoàn thành' ? 'green' : 'neutral';
  return <span className={`order-state-badge order-state-badge--${variant}`}>{label.toUpperCase()}</span>;
}
