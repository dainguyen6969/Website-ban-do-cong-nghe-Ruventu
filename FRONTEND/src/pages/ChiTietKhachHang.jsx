import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineSearch } from 'react-icons/hi';
import useCustomers from '../context/useCustomers';
import { formatMoney, getOrdersForCustomer } from '../data/mockOrders';
import { StatusBadge } from './DanhSachKhachHang';
import './KhachHang.css';

export default function ChiTietKhachHang() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const { customers, setCustomerStatus } = useCustomers();
  const [orderSearch, setOrderSearch] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const customer = customers.find((item) => item.id === customerId);
  const orders = useMemo(() => getOrdersForCustomer(customerId), [customerId]);
  const filteredOrders = orders.filter((order) => order.id.toLowerCase().includes(orderSearch.trim().toLowerCase()));

  useEffect(() => {
    if (!modalMode) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setModalMode(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalMode]);

  if (!customer) {
    return (
      <main className="customer-page customer-not-found">
        <h1>KHÔNG TÌM THẤY KHÁCH HÀNG</h1>
        <button className="customer-btn customer-btn--outline" onClick={() => navigate('/admin/khach-hang-doi-tac/khach-hang')}>QUAY LẠI DANH SÁCH</button>
      </main>
    );
  }

  const isActive = customer.status === 'active';
  const confirmStatusChange = () => {
    setCustomerStatus(customer.id, modalMode === 'lock' ? 'inactive' : 'active');
    setModalMode(null);
  };

  return (
    <main className="customer-page customer-detail-page" role="main">
      <section className="customer-detail-hero">
        <div>
          <nav className="customer-page__crumbs" aria-label="Breadcrumb nội dung">
            <span>KHÁCH HÀNG &amp; ĐỐI TÁC</span><span>/</span><span>KHÁCH HÀNG</span><span>/</span><strong>CHI TIẾT KHÁCH HÀNG</strong>
          </nav>
          <span className="customer-detail-code">#{customer.id}</span>
          <div className="customer-detail-title">
            <h1>{customer.name.toUpperCase()}</h1>
            <StatusBadge status={customer.status} />
          </div>
        </div>
        <div className="customer-detail-actions">
          <button type="button" className="customer-btn customer-btn--outline" onClick={() => navigate('/admin/khach-hang-doi-tac/khach-hang')}>
            <HiOutlineArrowLeft size={16} /> QUAY LẠI
          </button>
          <button
            type="button"
            className={`customer-btn customer-btn--status customer-btn--${isActive ? 'danger' : 'success'}`}
            onClick={() => setModalMode(isActive ? 'lock' : 'unlock')}
          >
            {isActive ? 'KHÓA TÀI KHOẢN' : 'MỞ TÀI KHOẢN'}
          </button>
        </div>
      </section>

      <section className="customer-detail-content">
        <aside className="customer-detail-sidebar">
          <section className="customer-panel">
            <h2>THÔNG TIN KHÁCH HÀNG</h2>
            <dl className="customer-info-list">
              <InfoRow label="TRẠNG THÁI"><span className={`customer-status-text customer-status-text--${customer.status}`}>{isActive ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</span></InfoRow>
              <InfoRow label="MÃ KHÁCH HÀNG">#{customer.id}</InfoRow>
              <InfoRow label="HỌ TÊN">{customer.name}</InfoRow>
              <InfoRow label="SỐ ĐIỆN THOẠI">{customer.phone.replaceAll(' ', '')}</InfoRow>
              <InfoRow label="EMAIL">{customer.email || '—'}</InfoRow>
              <InfoRow label="NGÀY TẠO">{customer.createdAt}</InfoRow>
              <InfoRow label="CẬP NHẬT CUỐI">{customer.updatedAt}</InfoRow>
            </dl>
          </section>

          <section className="customer-panel customer-address-panel">
            <h2>ĐỊA CHỈ MẶC ĐỊNH</h2>
            <div className="customer-address">
              <strong>{customer.address.recipient}</strong>
              <span>{customer.address.phone}</span>
              <p>{customer.address.lines.map((line) => <span key={line}>{line}</span>)}</p>
            </div>
          </section>
        </aside>

        <section className="customer-panel customer-order-history">
          <header>
            <h2>LỊCH SỬ MUA HÀNG</h2>
            <label className="customer-order-search" htmlFor="customer-order-search">
              <HiOutlineSearch size={16} />
              <input id="customer-order-search" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="TÌM MÃ ĐƠN HÀNG..." />
            </label>
          </header>
          <div className="customer-history-table-wrap">
            <table className="customer-history-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN HÀNG</th><th>LOẠI ĐƠN</th><th>TRẠNG THÁI ĐƠN</th><th>GIAO HÀNG</th><th>THANH TOÁN</th><th>GIÁ TRỊ</th><th>NGÀY GHI NHẬN</th><th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="customer-order-code">{order.id}</td>
                    <td><OrderBadge type={order.type}>{order.type.toUpperCase()}</OrderBadge></td>
                    <td><OrderBadge type={order.status}>{order.status.toUpperCase()}</OrderBadge></td>
                    <td>{order.delivery.toUpperCase()}</td>
                    <td className={order.payment === 'Đã thanh toán' ? 'customer-order-paid' : ''}>{order.payment.toUpperCase()}</td>
                    <td className="customer-order-value">{formatMoney(order.total)}</td>
                    <td>{order.createdDate}</td>
                    <td><button className="customer-action-btn" onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`)}>XEM ĐƠN HÀNG</button></td>
                  </tr>
                ))}
                {!filteredOrders.length && <tr className="customer-empty-row"><td colSpan="8">Không tìm thấy đơn hàng phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {modalMode && (
        <StatusConfirmModal
          mode={modalMode}
          customer={customer}
          onCancel={() => setModalMode(null)}
          onConfirm={confirmStatusChange}
        />
      )}
    </main>
  );
}

function InfoRow({ label, children }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

export function OrderBadge({ type, children }) {
  const variant = type === 'Online' ? 'blue'
    : type === 'Tại quầy' ? 'neutral'
      : type === 'Hoàn thành' ? 'green'
        : type === 'Đã hủy' ? 'red' : 'amber';
  return <span className={`order-badge order-badge--${variant}`}>{children}</span>;
}

function StatusConfirmModal({ mode, customer, onCancel, onConfirm }) {
  const isLock = mode === 'lock';
  return (
    <div className="customer-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className={`customer-modal customer-modal--${isLock ? 'lock' : 'unlock'}`} role="alertdialog" aria-modal="true" aria-labelledby="customer-modal-title">
        <h2 id="customer-modal-title">{isLock ? 'KHÓA TÀI KHOẢN KHÁCH HÀNG?' : 'MỞ LẠI TÀI KHOẢN KHÁCH HÀNG?'}</h2>
        <div className="customer-modal__body">
          <strong>{customer.name.toUpperCase()} – #{customer.id}</strong>
          <p>{isLock
            ? 'Khách hàng sẽ không thể đăng nhập và sử dụng các chức năng yêu cầu tài khoản đang hoạt động.'
            : 'Tài khoản sẽ được mở lại và khách hàng có thể đăng nhập bình thường.'}</p>
        </div>
        <footer>
          <button type="button" className="customer-btn customer-btn--outline" onClick={onCancel}>HỦY</button>
          <button type="button" className={`customer-btn customer-btn--solid-${isLock ? 'danger' : 'success'}`} onClick={onConfirm} autoFocus>
            {isLock ? 'XÁC NHẬN KHÓA' : 'XÁC NHẬN MỞ'}
          </button>
        </footer>
      </section>
    </div>
  );
}
