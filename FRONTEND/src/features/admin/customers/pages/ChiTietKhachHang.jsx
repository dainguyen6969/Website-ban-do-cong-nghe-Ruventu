// Admin customer screen: ChiTietKhachHang.
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineSearch } from 'react-icons/hi';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import { formatMoney } from '../../../../data/mockOrders';
import { customerService } from '../../../../shared/services/customerService';
import { StatusBadge } from './DanhSachKhachHang';
import './KhachHang.css';

export default function ChiTietKhachHang() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  
  const [orders, setOrders] = useState([]);
  const [orderTotalElements, setOrderTotalElements] = useState(0);
  
  const [orderSearch, setOrderSearch] = useState('');
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const orderPageSize = 10;
  
  const [modalMode, setModalMode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const orderSearchTimeoutRef = useRef(null);

  const fetchCustomerDetail = useCallback(async () => {
    try {
      const response = await customerService.getCustomerDetail(customerId);
      if (response.data?.data) {
        setCustomer(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải chi tiết khách hàng:', error);
    }
  }, [customerId]);

  const fetchCustomerOrders = useCallback(async () => {
    try {
      const response = await customerService.getCustomerOrders(customerId, {
        keyword: debouncedOrderSearch.trim() || undefined,
        page: Math.max(0, orderPage - 1),
        limit: orderPageSize
      });
      if (response.data?.data) {
        setOrders(response.data.data.items || []);
        setOrderTotalElements(response.data.data.pagination?.total_elements || 0);
      }
    } catch (error) {
      console.error('Lỗi khi tải đơn hàng của khách:', error);
    }
  }, [customerId, debouncedOrderSearch, orderPage]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCustomerDetail(), fetchCustomerOrders()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCustomerDetail, fetchCustomerOrders]);

  const handleOrderSearchChange = (event) => {
    const value = event.target.value;
    setOrderSearch(value);
    
    if (orderSearchTimeoutRef.current) clearTimeout(orderSearchTimeoutRef.current);
    orderSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedOrderSearch(value);
      setOrderPage(1);
    }, 500);
  };

  useEffect(() => {
    if (!modalMode) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setModalMode(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalMode]);

  if (isLoading) {
    return <main className="customer-page"><p>Đang tải dữ liệu...</p></main>;
  }

  if (!customer) {
    return (
      <main className="customer-page customer-not-found">
        <h1>KHÔNG TÌM THẤY KHÁCH HÀNG</h1>
        <button className="customer-btn customer-btn--outline" onClick={() => navigate('/admin/khach-hang-doi-tac/khach-hang')}>QUAY LẠI DANH SÁCH</button>
      </main>
    );
  }

  const isActive = customer.trang_thai === 1;
  const confirmStatusChange = async () => {
    try {
      const newStatus = modalMode === 'lock' ? 0 : 1;
      await customerService.updateCustomerStatus(customer.id, newStatus);
      await fetchCustomerDetail();
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái khách hàng:', error);
    } finally {
      setModalMode(null);
    }
  };

  const mapStatusStr = (trangThaiVal) => trangThaiVal === 1 ? 'active' : 'inactive';

  return (
    <main className="customer-page customer-detail-page" role="main">
      <section className="customer-detail-hero">
        <div>
          <nav className="customer-page__crumbs" aria-label="Breadcrumb nội dung">
            <span>KHÁCH HÀNG &amp; ĐỐI TÁC</span><span>/</span><span>KHÁCH HÀNG</span><span>/</span><strong>CHI TIẾT KHÁCH HÀNG</strong>
          </nav>
          <span className="customer-detail-code">#{customer.id}</span>
          <div className="customer-detail-title">
            <h1>{customer.ho_ten?.toUpperCase()}</h1>
            <StatusBadge status={mapStatusStr(customer.trang_thai)} />
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
              <InfoRow label="TRẠNG THÁI"><span className={`customer-status-text customer-status-text--${mapStatusStr(customer.trang_thai)}`}>{isActive ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</span></InfoRow>
              <InfoRow label="MÃ KHÁCH HÀNG">#{customer.id}</InfoRow>
              <InfoRow label="HỌ TÊN">{customer.ho_ten}</InfoRow>
              <InfoRow label="SỐ ĐIỆN THOẠI">{customer.so_dien_thoai?.replaceAll(' ', '')}</InfoRow>
              <InfoRow label="EMAIL">{customer.email || '—'}</InfoRow>
              <InfoRow label="NGÀY TẠO">{customer.ngay_tao ? new Date(customer.ngay_tao).toLocaleString() : '—'}</InfoRow>
              <InfoRow label="CẬP NHẬT CUỐI">{customer.ngay_cap_nhat ? new Date(customer.ngay_cap_nhat).toLocaleString() : '—'}</InfoRow>
            </dl>
          </section>

          <section className="customer-panel customer-address-panel">
            <h2>ĐỊA CHỈ MẶC ĐỊNH</h2>
            {customer.dia_chi_mac_dinh ? (
              <div className="customer-address">
                <strong>{customer.dia_chi_mac_dinh.nguoi_nhan || customer.ho_ten}</strong>
                <span>{customer.dia_chi_mac_dinh.so_dien_thoai || customer.so_dien_thoai}</span>
                <p>
                  <span>{customer.dia_chi_mac_dinh.dia_chi_chi_tiet}</span>
                  <span>{customer.dia_chi_mac_dinh.phuong_xa}, {customer.dia_chi_mac_dinh.tinh_thanh}</span>
                </p>
              </div>
            ) : (
              <p>Chưa có địa chỉ mặc định.</p>
            )}
          </section>
        </aside>

        <section className="customer-panel customer-order-history">
          <header>
            <h2>LỊCH SỬ MUA HÀNG</h2>
            <label className="customer-order-search" htmlFor="customer-order-search">
              <HiOutlineSearch size={16} />
              <input id="customer-order-search" value={orderSearch} onChange={handleOrderSearchChange} placeholder="TÌM MÃ ĐƠN HÀNG..." />
            </label>
          </header>
          <div className="customer-history-table-wrap">
            <table className="customer-history-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN HÀNG</th><th>LOẠI ĐƠN</th><th>TRẠNG THÁI ĐƠN</th><th>THANH TOÁN</th><th>GIÁ TRỊ</th><th>NGÀY GHI NHẬN</th><th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="customer-order-code">{order.ma_don_hang}</td>
                    <td><OrderBadge type={order.loai_don_hang}>{order.loai_don_hang?.toUpperCase()}</OrderBadge></td>
                    <td><OrderBadge type={order.trang_thai_don_hang}>{order.trang_thai_don_hang?.toUpperCase()}</OrderBadge></td>
                    <td className={order.trang_thai_thanh_toan === 'Đã thanh toán' ? 'customer-order-paid' : ''}>{order.trang_thai_thanh_toan?.toUpperCase()}</td>
                    <td className="customer-order-value">{formatMoney(order.tong_thanh_toan)}</td>
                    <td>{new Date(order.ngay_tao).toLocaleString()}</td>
                    <td><button className="customer-action-btn" onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`)}>XEM ĐƠN HÀNG</button></td>
                  </tr>
                ))}
                {!orders.length && <tr className="customer-empty-row"><td colSpan="7">Không tìm thấy đơn hàng phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
          <DetailTablePagination totalItems={orderTotalElements} currentPage={orderPage} onPageChange={setOrderPage} pageSize={orderPageSize} idPrefix="customer-orders" />
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
          <strong>{customer.ho_ten?.toUpperCase()} – #{customer.id}</strong>
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
