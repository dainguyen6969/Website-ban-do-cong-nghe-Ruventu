// Admin customer screen: ChiTietKhachHang.
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineExternalLink,
  HiOutlineScale,
  HiOutlineSearch,
  HiOutlineTrendingDown,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import { formatMoney } from '../../../../data/mockOrders';
import { customerService } from '../../../../shared/services/customerService';
import { cashbookService } from '../../../../shared/services/cashbookService';
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
        limit: orderPageSize,
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
    return (
      <main className="customer-page">
        <p>Đang tải dữ liệu...</p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="customer-page customer-not-found">
        <h1>KHÔNG TÌM THẤY KHÁCH HÀNG</h1>
        <button
          className="customer-btn customer-btn--outline"
          onClick={() => navigate('/admin/khach-hang-doi-tac/khach-hang')}
        >
          QUAY LẠI DANH SÁCH
        </button>
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

  const mapStatusStr = (trangThaiVal) => (trangThaiVal === 1 ? 'active' : 'inactive');

  return (
    <main className="customer-page customer-detail-page" role="main">
      <section className="customer-detail-hero">
        <div>
          <nav className="customer-page__crumbs" aria-label="Breadcrumb nội dung">
            <span>KHÁCH HÀNG &amp; ĐỐI TÁC</span>
            <span>/</span>
            <span>KHÁCH HÀNG</span>
            <span>/</span>
            <strong>CHI TIẾT KHÁCH HÀNG</strong>
          </nav>
          <span className="customer-detail-code">#{customer.id}</span>
          <div className="customer-detail-title">
            <h1>{customer.ho_ten?.toUpperCase()}</h1>
            <StatusBadge status={mapStatusStr(customer.trang_thai)} />
          </div>
        </div>
        <div className="customer-detail-actions">
          <button
            type="button"
            className="customer-btn customer-btn--outline"
            onClick={() => navigate('/admin/khach-hang-doi-tac/khach-hang')}
          >
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
              <InfoRow label="TRẠNG THÁI">
                <span
                  className={`customer-status-text customer-status-text--${mapStatusStr(customer.trang_thai)}`}
                >
                  {isActive ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}
                </span>
              </InfoRow>
              <InfoRow label="MÃ KHÁCH HÀNG">#{customer.id}</InfoRow>
              <InfoRow label="HỌ TÊN">{customer.ho_ten}</InfoRow>
              <InfoRow label="SỐ ĐIỆN THOẠI">{customer.so_dien_thoai?.replaceAll(' ', '')}</InfoRow>
              <InfoRow label="EMAIL">{customer.email || '—'}</InfoRow>
              <InfoRow label="NGÀY TẠO">
                {customer.ngay_tao ? new Date(customer.ngay_tao).toLocaleString() : '—'}
              </InfoRow>
              <InfoRow label="CẬP NHẬT CUỐI">
                {customer.ngay_cap_nhat ? new Date(customer.ngay_cap_nhat).toLocaleString() : '—'}
              </InfoRow>
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
                  <span>
                    {customer.dia_chi_mac_dinh.phuong_xa}, {customer.dia_chi_mac_dinh.tinh_thanh}
                  </span>
                </p>
              </div>
            ) : (
              <p>Chưa có địa chỉ mặc định.</p>
            )}
          </section>
        </aside>

        <div className="customer-detail-main">
          <section className="customer-panel customer-order-history">
            <header>
              <h2>LỊCH SỬ MUA HÀNG</h2>
              <label className="customer-order-search" htmlFor="customer-order-search">
                <HiOutlineSearch size={16} />
                <input
                  id="customer-order-search"
                  value={orderSearch}
                  onChange={handleOrderSearchChange}
                  placeholder="TÌM MÃ ĐƠN HÀNG..."
                />
              </label>
            </header>
            <div className="customer-history-table-wrap">
              <table className="customer-history-table">
                <thead>
                  <tr>
                    <th>MÃ ĐƠN HÀNG</th>
                    <th>LOẠI ĐƠN</th>
                    <th>TRẠNG THÁI ĐƠN</th>
                    <th>THANH TOÁN</th>
                    <th>GIÁ TRỊ</th>
                    <th>NGÀY GHI NHẬN</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="customer-order-code">{order.ma_don_hang}</td>
                      <td>
                        <OrderBadge type={order.loai_don_hang}>
                          {order.loai_don_hang?.toUpperCase()}
                        </OrderBadge>
                      </td>
                      <td>
                        <OrderBadge type={order.trang_thai_don_hang}>
                          {order.trang_thai_don_hang?.toUpperCase()}
                        </OrderBadge>
                      </td>
                      <td
                        className={
                          order.trang_thai_thanh_toan === 'Đã thanh toán' ? 'customer-order-paid' : ''
                        }
                      >
                        {order.trang_thai_thanh_toan?.toUpperCase()}
                      </td>
                      <td className="customer-order-value">{formatMoney(order.tong_thanh_toan)}</td>
                      <td>{new Date(order.ngay_tao).toLocaleString()}</td>
                      <td>
                        <button
                          className="customer-action-btn"
                          onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`)}
                        >
                          XEM ĐƠN HÀNG
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!orders.length && (
                    <tr className="customer-empty-row">
                      <td colSpan="7">Không tìm thấy đơn hàng phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <DetailTablePagination
              totalItems={orderTotalElements}
              currentPage={orderPage}
              onPageChange={setOrderPage}
              pageSize={orderPageSize}
              idPrefix="customer-orders"
            />
          </section>

          <CustomerCashbookPanel customerId={customer.id} orders={orders} />
        </div>
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
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function OrderBadge({ type, children }) {
  const variant =
    type === 'Online'
      ? 'blue'
      : type === 'Tại quầy'
        ? 'neutral'
        : type === 'Hoàn thành'
          ? 'green'
          : type === 'Đã hủy'
            ? 'red'
            : 'amber';
  return <span className={`order-badge order-badge--${variant}`}>{children}</span>;
}

function StatusConfirmModal({ mode, customer, onCancel, onConfirm }) {
  const isLock = mode === 'lock';
  return (
    <div
      className="customer-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className={`customer-modal customer-modal--${isLock ? 'lock' : 'unlock'}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
      >
        <h2 id="customer-modal-title">
          {isLock ? 'KHÓA TÀI KHOẢN KHÁCH HÀNG?' : 'MỞ LẠI TÀI KHOẢN KHÁCH HÀNG?'}
        </h2>
        <div className="customer-modal__body">
          <strong>
            {customer.ho_ten?.toUpperCase()} – #{customer.id}
          </strong>
          <p>
            {isLock
              ? 'Khách hàng sẽ không thể đăng nhập và sử dụng các chức năng yêu cầu tài khoản đang hoạt động.'
              : 'Tài khoản sẽ được mở lại và khách hàng có thể đăng nhập bình thường.'}
          </p>
        </div>
        <footer>
          <button type="button" className="customer-btn customer-btn--outline" onClick={onCancel}>
            HỦY
          </button>
          <button
            type="button"
            className={`customer-btn customer-btn--solid-${isLock ? 'danger' : 'success'}`}
            onClick={onConfirm}
            autoFocus
          >
            {isLock ? 'XÁC NHẬN KHÓA' : 'XÁC NHẬN MỞ'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function CustomerCashbookPanel({ customerId, orders = [] }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    tongThu: 0,
    tongChi: 0,
    tonCuoiKy: 0,
  });
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const pageSize = 5;

  const fetchVouchers = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        nguoi_nop_nhan_id: customerId,
        tu_ngay: '2020-01-01',
        den_ngay: '2035-12-31',
        page: Math.max(0, page - 1),
        limit: pageSize,
        ...(typeFilter !== 'ALL' ? { loai_phieu: typeFilter } : {}),
      };
      const res = await cashbookService.getCashbook(params);
      const data = res.data?.data;
      if (data) {
        setItems(data.items || []);
        setTotalElements(data.pagination?.total_elements || 0);
        if (data.tong_hop) {
          setSummary({
            tongThu: Number(data.tong_hop.tong_thu) || 0,
            tongChi: Number(data.tong_hop.tong_chi) || 0,
            tonCuoiKy: Number(data.tong_hop.ton_cuoi_ky) || 0,
          });
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải phiếu thu chi của khách hàng:', err);
      setError('Không thể kết nối hoặc tải sổ quỹ của khách hàng.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, page, typeFilter]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleTabChange = (nextType) => {
    if (nextType === typeFilter) return;
    setTypeFilter(nextType);
    setPage(1);
  };

  const handleDocClick = (docCode) => {
    if (!docCode) return;
    const cleanCode = docCode.trim();
    const matched = (orders || []).find((o) => o.ma_don_hang === cleanCode || String(o.id) === cleanCode);
    if (matched) {
      navigate(`/admin/don-hang/danh-sach-don-hang/${matched.id}`);
      return;
    }
    navigate('/admin/don-hang/danh-sach-don-hang');
  };

  const handleVoucherClick = (item) => {
    if (item.loai_phieu === 'CHI') {
      navigate(`/admin/so-quy-tien-mat/phieu-chi/${item.id}`);
    } else {
      navigate(`/admin/so-quy-tien-mat/phieu-thu/${item.id}`);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatPaymentMethod = (method) => {
    switch (method) {
      case 'TIEN_MAT':
        return 'Tiền mặt';
      case 'CHUYEN_KHOAN':
        return 'Chuyển khoản';
      case 'THE':
        return 'Quẹt thẻ';
      default:
        return method ? String(method).replaceAll('_', ' ') : '—';
    }
  };

  return (
    <section className="customer-panel customer-cashbook-section">
      <header>
        <h2>SỔ QUỸ: PHIẾU THU &amp; PHIẾU CHI LIÊN QUAN</h2>
      </header>

      {/* Stats Cards */}
      <div className="customer-cashbook-stats">
        <div className="customer-stat-card customer-stat-card--thu">
          <div className="customer-stat-icon customer-stat-icon--thu">
            <HiOutlineTrendingUp />
          </div>
          <div className="customer-stat-content">
            <span className="customer-stat-title">TỔNG TIỀN ĐÃ THU</span>
            <span className="customer-stat-subtitle">Khách thanh toán mua hàng</span>
            <strong className="customer-stat-value text-green">
              +{formatMoney(summary.tongThu)}
            </strong>
          </div>
        </div>

        <div className="customer-stat-card customer-stat-card--chi">
          <div className="customer-stat-icon customer-stat-icon--chi">
            <HiOutlineTrendingDown />
          </div>
          <div className="customer-stat-content">
            <span className="customer-stat-title">TỔNG TIỀN HOÀN TRẢ</span>
            <span className="customer-stat-subtitle">Hoàn tiền trả hàng / bảo hành</span>
            <strong className="customer-stat-value text-red">
              -{formatMoney(summary.tongChi)}
            </strong>
          </div>
        </div>

        <div className="customer-stat-card customer-stat-card--net">
          <div className="customer-stat-icon customer-stat-icon--net">
            <HiOutlineScale />
          </div>
          <div className="customer-stat-content">
            <span className="customer-stat-title">CHÊNH LỆCH THỰC THU</span>
            <span className="customer-stat-subtitle">Doanh thu ròng từ khách</span>
            <strong className="customer-stat-value text-dark">
              {formatMoney(summary.tongThu - summary.tongChi)}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="customer-cashbook-tabs">
        <div className="customer-cashbook-tabs-group">
          <button
            type="button"
            className={`customer-cashbook-tab ${typeFilter === 'ALL' ? 'customer-cashbook-tab--active' : ''}`}
            onClick={() => handleTabChange('ALL')}
          >
            TẤT CẢ
            {typeFilter === 'ALL' && <span className="customer-cashbook-tab-count">{totalElements}</span>}
          </button>
          <button
            type="button"
            className={`customer-cashbook-tab ${typeFilter === 'THU' ? 'customer-cashbook-tab--active' : ''}`}
            onClick={() => handleTabChange('THU')}
          >
            PHIẾU THU (THU TIỀN VỀ)
            {typeFilter === 'THU' && <span className="customer-cashbook-tab-count">{totalElements}</span>}
          </button>
          <button
            type="button"
            className={`customer-cashbook-tab ${typeFilter === 'CHI' ? 'customer-cashbook-tab--active' : ''}`}
            onClick={() => handleTabChange('CHI')}
          >
            PHIẾU CHI (HOÀN TIỀN)
            {typeFilter === 'CHI' && <span className="customer-cashbook-tab-count">{totalElements}</span>}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="customer-history-table-wrap">
        <table className="customer-history-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}>STT</th>
              <th>MÃ PHIẾU</th>
              <th>LOẠI PHIẾU</th>
              <th>CHỨNG TỪ THAM CHIẾU</th>
              <th>HÌNH THỨC</th>
              <th style={{ textAlign: 'right' }}>SỐ TIỀN</th>
              <th>NGÀY GHI NHẬN</th>
              <th>TRẠNG THÁI</th>
              <th>GHI CHÚ / MÔ TẢ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="customer-table-loading">
                  Đang tải dữ liệu phiếu thu / phiếu chi...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="9" className="customer-table-error">
                  <span>{error}</span>
                  <button type="button" onClick={fetchVouchers} className="customer-btn-retry">
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((item, idx) => {
                const isChi = item.loai_phieu === 'CHI';
                const amount = isChi
                  ? Number(item.tien_chi || item.so_tien || 0)
                  : Number(item.tien_thu || item.so_tien || 0);
                return (
                  <tr key={item.id}>
                    <td>{(page - 1) * pageSize + idx + 1}</td>
                    <td>
                      <button
                        type="button"
                        className="customer-voucher-link"
                        onClick={() => handleVoucherClick(item)}
                        title="Xem chi tiết phiếu"
                      >
                        {item.ma_phieu}
                        <HiOutlineExternalLink style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                      </button>
                    </td>
                    <td>
                      <span
                        className={`customer-cashbook-badge ${
                          isChi ? 'customer-cashbook-badge--chi' : 'customer-cashbook-badge--thu'
                        }`}
                      >
                        {isChi ? 'PHIẾU CHI' : 'PHIẾU THU'}
                      </span>
                    </td>
                    <td>
                      {item.ma_chung_tu_tham_chieu ? (
                        <button
                          type="button"
                          className="customer-doc-link"
                          onClick={() => handleDocClick(item.ma_chung_tu_tham_chieu)}
                          title="Đi đến chứng từ tham chiếu"
                        >
                          {item.ma_chung_tu_tham_chieu}
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>{formatPaymentMethod(item.phuong_thuc_thanh_toan)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className={`customer-cashbook-amount ${
                          isChi ? 'customer-cashbook-amount--chi' : 'customer-cashbook-amount--thu'
                        }`}
                      >
                        {isChi ? `-${formatMoney(amount)}` : `+${formatMoney(amount)}`}
                      </span>
                    </td>
                    <td>{formatDateTime(item.ngay_ghi_nhan)}</td>
                    <td>
                      <span
                        className={`customer-cashbook-badge ${
                          item.trang_thai === 'DA_GHI_NHAN' || item.trang_thai === 'DA_GHI_SO'
                            ? 'customer-cashbook-badge--success'
                            : item.trang_thai === 'HUY'
                            ? 'customer-cashbook-badge--cancelled'
                            : 'customer-cashbook-badge--default'
                        }`}
                      >
                        {item.trang_thai === 'DA_GHI_NHAN' || item.trang_thai === 'DA_GHI_SO'
                          ? 'ĐÃ GHI SỔ'
                          : item.trang_thai === 'HUY'
                          ? 'ĐÃ HỦY'
                          : item.trang_thai}
                      </span>
                    </td>
                    <td className="customer-col-notes" title={item.mo_ta || ''}>
                      {item.mo_ta || '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="customer-empty-row">
                <td colSpan="9">
                  Chưa có phiếu thu hoặc phiếu chi nào phát sinh với khách hàng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailTablePagination
        totalItems={totalElements}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={setPage}
        idPrefix="customer-cashbook"
      />
    </section>
  );
}
