import { scaledFontSize } from '../../../../typography/projectFontSize.js';
// Admin customer returns screen: KhachTraHang (UC-027 TH001-TH012)
// Connected with Backend APIs: /api/v1/admin/returns
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import LoadingSpinner from '../../../../shared/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FileText,
  Package,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Phone,
  Info,
  DollarSign,
  XCircle,
} from 'lucide-react';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import {
  WarrantyFields,
  WarrantyPanel,
  WarrantyTable,
} from '../../warranty/components/WarrantyShell';
import {
  RETURN_WORK_GROUP_OPTIONS,
  isReturnWorkGroup,
  getReturns,
  getEligibleOrders,
  getEligibleOrderDetail,
  previewReturn,
  createReturn,
  getReturnDetail,
  receiveReturnPackage,
  refundReturn,
  cancelReturn,
} from '../api/customerReturnApi.js';
import { getOrder } from '../../orders/api/orderApi.js';
import '../../warranty/styles/warrantyShell.css';

import { hasAdminPermission, hasSystemAdminPermission } from '../../../../auth/roleModel';
import { useAdminPermissions } from '../../../../shared/components/ui/PermissionGate';

import './KhachTraHang.css';

const LIST_ROUTE = '/admin/don-hang/khach-tra-hang';
const ORDER_DETAIL_ROUTE = '/admin/don-hang/danh-sach-don-hang';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  ...RETURN_WORK_GROUP_OPTIONS,
  { value: 'CHO_TIEP_NHAN', label: 'Chờ tiếp nhận' },
  { value: 'DA_NHAN_HANG', label: 'Đã nhận hàng' },
  { value: 'DA_HOAN_TIEN', label: 'Đã hoàn tiền' },
  { value: 'HOAN_TAT', label: 'Hoàn tất' },
  { value: 'CHO_TRA_KHACH', label: 'Chờ trả khách' },
  { value: 'TU_CHOI', label: 'Từ chối' },
  { value: 'HUY_TIEP_NHAN', label: 'Hủy tiếp nhận' },
  { value: 'HUY', label: 'Đã hủy' },
];

const getReturnStatusVariant = (st) => {
  const status = String(st || '').toUpperCase();
  if (status === 'CHO_TIEP_NHAN') return 'amber';
  if (status === 'DA_NHAN_HANG') return 'blue';
  if (status === 'DA_HOAN_TIEN' || status === 'HOAN_TAT') return 'green';
  if (status === 'CHO_TRA_KHACH' || status === 'DA_HOAN_TIEN_CU') return 'teal';
  if (status === 'HUY_TIEP_NHAN' || status.includes('HUY') || status.includes('TU_CHOI'))
    return 'red';
  return 'neutral';
};

const getReturnStatusText = (st) => {
  const status = String(st || '').toUpperCase();
  switch (status) {
    case 'CHO_TIEP_NHAN':
      return 'CHỜ TIẾP NHẬN';
    case 'DA_NHAN_HANG':
      return 'ĐÃ NHẬN HÀNG';
    case 'DA_HOAN_TIEN':
      return 'ĐÃ HOÀN TIỀN';
    case 'HOAN_TAT':
      return 'HOÀN TẤT';
    case 'CHO_TRA_KHACH':
      return 'CHỜ TRẢ KHÁCH';
    case 'TU_CHOI':
      return 'TỪ CHỐI';
    case 'HUY_TIEP_NHAN':
    case 'HUY':
      return 'HỦY TIẾP NHẬN';
    case 'DA_HOAN_TIEN_CU':
      return 'ĐÃ HOÀN TIỀN - NHẬN CŨ';
    default:
      return status || '—';
  }
};

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))}đ`;

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${hours}:${mins}:${secs} ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export default function KhachTraHang() {
  const { orderId, returnId } = useParams();
  const location = useLocation();
  const isCreate = location.pathname.includes('/tao');

  if (isCreate || orderId) {
    return <CreateReturn initialOrderId={orderId} />;
  }

  if (returnId) {
    return <ReturnDetail returnId={returnId} />;
  }

  return <ReturnList />;
}

/* ==========================================================================
   View 1: Danh sách khách trả hàng (Lấy dữ liệu thực từ Backend)
   ========================================================================== */
function ReturnList() {
  const navigate = useNavigate();

  const access = useAdminPermissions()?.access;
  const canCreateReturn = hasAdminPermission(access, 'khach_tra_hang', 'them');

  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    total_items: 0,
    total_pages: 1,
    current_page: 0,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const statusParam = params.get('trang_thai_tra_hang') || 'ALL';
  const returnGroup =
    params.get('nhom_xu_ly') || (isReturnWorkGroup(statusParam) ? statusParam : '');
  const status = returnGroup || statusParam;
  const salesChannel = params.get('kenh_ban') || '';
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const [toast, setToast] = useState(location.state?.toast || '');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch list from Backend API
  const fetchList = async (signal) => {
    setLoading(true);
    setError('');
    try {
      const data = await getReturns(
        {
          keyword: query.trim(),
          returnStatus:
            returnGroup || status === 'ALL'
              ? undefined
              : status === 'HUY_TIEP_NHAN'
                ? 'HUY'
                : status,
          returnGroup,
          salesChannel,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          page: Math.max(0, page - 1),
          limit: pageSize,
        },
        signal
      );

      if (data) {
        setItems(data.items || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err?.message || 'Không thể tải danh sách phiếu trả hàng từ máy chủ.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [query, status, returnGroup, salesChannel, dateFrom, dateTo, page, pageSize]);

  const selectReturnFilter = (value) => {
    const next = new URLSearchParams(params);
    next.delete('trang_thai_tra_hang');
    next.delete('nhom_xu_ly');

    if (value !== 'ALL') {
      next.set(isReturnWorkGroup(value) ? 'nhom_xu_ly' : 'trang_thai_tra_hang', value);
    }

    setParams(next, { replace: true });
    setPage(1);
  };

  const resetFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('trang_thai_tra_hang');
    next.delete('nhom_xu_ly');
    next.delete('kenh_ban');

    setParams(next, { replace: true });
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="returns-page admin-list-page">
      {/* Toast alert */}
      {toast && (
        <div className="returns-toast" role="status">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="returns-hero">
        <div className="returns-hero__info">
          <div className="returns-hero__breadcrumb">
            <Link to="/admin/don-hang/danh-sach-don-hang">ĐƠN HÀNG</Link> /{' '}
            <span>KHÁCH TRẢ HÀNG</span>
          </div>
          <h1>KHÁCH TRẢ HÀNG</h1>
          <p>Theo dõi phiếu, người liên hệ và quyền trả hàng từ dữ liệu hệ thống.</p>
        </div>
        <button
          type="button"
          className="return-btn return-btn--black"
          disabled={!canCreateReturn}
          onClick={() => setSelecting(true)}
        >
          + LẬP PHIẾU TRẢ HÀNG
        </button>
      </section>

      {/* Filter Bar */}
      <section className="returns-filters">
        <div className="returns-filters__inner">
          {/* Search box */}
          <label className="returns-search">
            <HiOutlineSearch />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="TÌM MÃ PHIẾU / ĐƠN / NGƯỜI LIÊN HỆ / SĐT..."
            />
          </label>

          {/* Status filter */}
          <div className="returns-status-dropdown-wrap">
            <FilterDropdown
              options={STATUS_FILTER_OPTIONS}
              value={returnGroup || status}
              onSelect={selectReturnFilter}
              selectedDark={false}
              aria-label="Lọc trạng thái"
            />
          </div>

          {/* Date from */}
          <div className="returns-date-group">
            <span className="returns-date-label">TỪ NGÀY</span>
            <input
              type="date"
              className="returns-date-input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Date to */}
          <div className="returns-date-group">
            <span className="returns-date-label">ĐẾN NGÀY</span>
            <input
              type="date"
              className="returns-date-input"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {['ONLINE', 'TAI_QUAY'].includes(salesChannel) && (
            <span className="returns-date-label">
              Kênh bán {salesChannel === 'ONLINE' ? 'Online' : 'Tại quầy'}
            </span>
          )}

          {/* Reset button */}
          <button
            type="button"
            className="return-btn return-btn--outline"
            onClick={resetFilters}
            title="Xóa tất cả bộ lọc"
          >
            XÓA BỘ LỌC
          </button>
        </div>
      </section>

      {/* Main Table */}
      <section className="returns-table-container admin-list-body admin-list-body--inset">
        {error && (
          <div
            className="returns-error-banner"
            style={{
              margin: '16px 20px',
              padding: 12,
              background: '#fff1f1',
              border: '1px solid #ff9297',
              color: '#df1720',
            }}
          >
            {error}
          </div>
        )}

        <div
          className="returns-table-wrap admin-table-scroll"
          role="region"
          aria-label="Danh sách phiếu trả hàng"
          tabIndex={0}
        >
          <table className="returns-table admin-data-table">
            <thead>
              <tr>
                <th>MÃ PHIẾU</th>
                <th>ĐƠN HÀNG GỐC</th>
                <th>NGƯỜI LIÊN HỆ</th>
                <th>SỐ ĐIỆN THOẠI</th>
                <th>TIỀN HOÀN</th>
                <th>TRẠNG THÁI</th>
                <th>NGÀY TẠO</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading && !items.length ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 24 }}>
                    <LoadingSpinner text="Đang tải danh sách phiếu trả hàng..." size="md" />
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((record) => {
                  const ticketCode =
                    record.ma_tra_hang || `TH${String(record.id).padStart(6, '0')}`;
                  const orderCode =
                    record.don_hang?.ma_don_hang ||
                    (record.don_hang?.id ? `ORD-${record.don_hang.id}` : '—');
                  const contactName = record.ten_nguoi_lien_he;
                  const contactPhone = record.sdt_nguoi_lien_he;
                  const refundAmount = record.tong_tien_hoan != null ? record.tong_tien_hoan : 0;
                  const statusVal = record.trang_thai_tra_hang;

                  return (
                    <tr key={record.id}>
                      <td>
                        <strong className="returns-code">{ticketCode}</strong>
                      </td>
                      <td>
                        <span className="returns-code">{orderCode}</span>
                      </td>
                      <td>
                        {contactName ? (
                          contactName
                        ) : (
                          <span className="returns-muted">Chưa có người liên hệ</span>
                        )}
                      </td>
                      <td>
                        {contactPhone ? (
                          contactPhone
                        ) : (
                          <span className="returns-muted">Chưa có số điện thoại</span>
                        )}
                      </td>
                      <td>
                        <span className="returns-money">{money(refundAmount)}</span>
                      </td>
                      <td>
                        <div className="returns-status-cell">
                          <span
                            className={`returns-status-badge returns-status-badge--${getReturnStatusVariant(statusVal)}`}
                          >
                            {getReturnStatusText(statusVal)}
                          </span>
                        </div>
                      </td>
                      <td>{formatDisplayDate(record.ngay_tao)}</td>
                      <td>
                        <button
                          className="returns-action-btn"
                          onClick={() => navigate(`${LIST_ROUTE}/${record.id}`)}
                        >
                          XEM CHI TIẾT
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                    Không tìm thấy phiếu trả hàng phù hợp trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination */}
        <div className="returns-footer admin-table-footer">
          <div className="returns-footer__left">
            <span>
              {pagination.total_items || items.length} phiếu · Trang {page}/
              {Math.max(1, pagination.total_pages || 1)}
            </span>
          </div>

          <div className="returns-footer__right">
            <TablePagination
              totalItems={pagination.total_items || items.length}
              pageSize={pageSize}
              currentPage={page}
              onPageChange={(p) => setPage(p)}
              showSummary={false}
              idPrefix="returns"
            />
          </div>
        </div>
      </section>

      {/* Modal: CHỌN ĐƠN HÀNG CẦN TRẢ (TH002) */}
      {canCreateReturn && selecting && (
        <SelectOrderModal
          onClose={() => setSelecting(false)}
          onSelect={(selectedId) => {
            setSelecting(false);
            navigate(`${LIST_ROUTE}/tao/${selectedId}`);
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   View 2: Modal Chọn Đơn Hàng Cần Trả (Lấy đơn đủ điều kiện từ Backend)
   ========================================================================== */
function SelectOrderModal({ onClose, onSelect }) {
  const [modalQuery, setModalQuery] = useState('');
  const [modalPage, setModalPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total_items: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const MODAL_PAGE_SIZE = 8;

  useEscape(onClose);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getEligibleOrders({
          keyword: modalQuery.trim(),
          page: Math.max(0, modalPage - 1),
          limit: MODAL_PAGE_SIZE,
        });
        if (active && data) {
          setOrders(data.items || []);
          if (data.pagination) {
            setPagination(data.pagination);
          }
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Không thể tải danh sách đơn hàng đủ điều kiện.');
          setOrders([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      active = false;
    };
  }, [modalQuery, modalPage]);

  return (
    <div
      className="returns-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="returns-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="returns-modal__header">
          <h2>CHỌN ĐƠN HÀNG CẦN TRẢ</h2>
          <button className="returns-modal__close-btn" onClick={onClose}>
            ĐÓNG
          </button>
        </div>

        {/* Body */}
        <div className="returns-modal__body">
          {/* Search box */}
          <label className="returns-modal-search">
            <HiOutlineSearch />
            <input
              autoFocus
              value={modalQuery}
              onChange={(e) => {
                setModalQuery(e.target.value);
                setModalPage(1);
              }}
              placeholder="TÌM MÃ ĐƠN / KHÁCH / NGƯỜI NHẬN / SĐT..."
            />
          </label>

          {error && (
            <div
              style={{
                margin: '8px 0',
                padding: 8,
                background: '#fff1f1',
                color: '#df1720',
                fontSize: 11,
              }}
            >
              {error}
            </div>
          )}

          {/* Table */}
          <div className="returns-modal-table-wrap">
            <table className="returns-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN</th>
                  <th>KHÁCH / LIÊN HỆ</th>
                  <th>SỐ ĐIỆN THOẠI</th>
                  <th>HOÀN THÀNH</th>
                  <th>QUY TẮC TRẢ</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>
                      <LoadingSpinner text="Đang tải danh sách đơn hàng..." size="sm" />
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong className="returns-code">{order.ma_don_hang || order.id}</strong>
                      </td>
                      <td>{order.ten_nguoi_lien_he || 'Khách vãng lai'}</td>
                      <td>
                        <span className={!order.sdt_nguoi_lien_he ? 'returns-muted' : ''}>
                          {order.sdt_nguoi_lien_he || 'Nhập khi lập phiếu'}
                        </span>
                      </td>
                      <td>{formatDisplayDate(order.ngay_hoan_thanh)}</td>
                      <td>
                        <span
                          className={`returns-order-rule${order.chi_duoc_tra_toan_bo ? ' returns-order-rule--all' : ''}`}
                        >
                          {order.chi_duoc_tra_toan_bo ? 'CHỈ TRẢ TOÀN BỘ' : 'CHỌN SỐ LƯỢNG'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="returns-select-order-btn"
                          onClick={() => onSelect(order.id)}
                        >
                          CHỌN TRẢ HÀNG
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>
                      Không tìm thấy đơn hàng nào đủ điều kiện trả.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="returns-modal__footer">
          <div>
            {pagination.total_items || orders.length} đơn · Trang {modalPage}/
            {Math.max(1, pagination.total_pages || 1)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="return-btn return-btn--outline"
              disabled={modalPage <= 1}
              onClick={() => setModalPage((p) => Math.max(1, p - 1))}
            >
              TRƯỚC
            </button>
            <button
              className="return-btn return-btn--outline"
              disabled={modalPage >= (pagination.total_pages || 1)}
              onClick={() => setModalPage((p) => p + 1)}
            >
              SAU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   View 3: Lập phiếu trả hàng (Kết nối Backend tính preview & tạo phiếu)
   ========================================================================== */
function CreateReturn({ initialOrderId }) {
  const navigate = useNavigate();

  const [currentOrderId, setCurrentOrderId] = useState(
    initialOrderId ? String(initialOrderId) : ''
  );
  const [showOrderSearch, setShowOrderSearch] = useState(!initialOrderId);

  // Embedded search state for eligible orders
  const [orderQuery, setOrderQuery] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(5);
  const [orderList, setOrderList] = useState([]);
  const [orderPagination, setOrderPagination] = useState({ total_items: 0, total_pages: 1 });
  const [orderSearchLoading, setOrderSearchLoading] = useState(false);
  const [orderSearchError, setOrderSearchError] = useState('');

  const [eligibleData, setEligibleData] = useState(null);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [eligibleError, setEligibleError] = useState('');

  // Selected lines state: { [chiTietDonHangId]: qty }
  const [selectedLines, setSelectedLines] = useState({});

  // Form inputs
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('TIEN_MAT');

  // Preview calculation state
  const [previewResult, setPreviewResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Sync initialOrderId from prop if it changes
  useEffect(() => {
    if (initialOrderId) {
      setCurrentOrderId(String(initialOrderId));
      setShowOrderSearch(false);
    }
  }, [initialOrderId]);

  // Fetch eligible orders for embedded search
  useEffect(() => {
    if (!showOrderSearch && currentOrderId) return;
    let active = true;
    const fetchOrders = async () => {
      setOrderSearchLoading(true);
      setOrderSearchError('');
      try {
        const data = await getEligibleOrders({
          keyword: orderQuery.trim(),
          page: Math.max(0, orderPage - 1),
          limit: orderPageSize,
        });
        if (active && data) {
          setOrderList(data.items || []);
          if (data.pagination) {
            setOrderPagination(data.pagination);
          }
        }
      } catch (err) {
        if (active) {
          setOrderSearchError(err?.message || 'Không thể tải danh sách đơn hàng đủ điều kiện.');
          setOrderList([]);
        }
      } finally {
        if (active) setOrderSearchLoading(false);
      }
    };

    fetchOrders();
    return () => {
      active = false;
    };
  }, [orderQuery, orderPage, orderPageSize, showOrderSearch, currentOrderId]);

  // Load eligible order detail when currentOrderId is set
  useEffect(() => {
    if (!currentOrderId) {
      setEligibleData(null);
      setLoadingEligible(false);
      setEligibleError('');
      return;
    }

    let active = true;
    const loadEligibleDetail = async () => {
      setLoadingEligible(true);
      setEligibleError('');
      try {
        const data = await getEligibleOrderDetail(currentOrderId);
        if (active && data) {
          setEligibleData(data);
          if (data.don_hang) {
            setContactName(data.don_hang.ten_nguoi_lien_he || '');
            setContactPhone(data.don_hang.sdt_nguoi_lien_he || '');
          }
        }
      } catch (err) {
        if (active) {
          setEligibleError(err?.message || 'Không thể tải thông tin điều kiện trả hàng của đơn.');
        }
      } finally {
        if (active) setLoadingEligible(false);
      }
    };

    loadEligibleDetail();
    return () => {
      active = false;
    };
  }, [currentOrderId]);

  const handleSelectOrder = (order) => {
    setCurrentOrderId(String(order.id));
    setShowOrderSearch(false);
    setSelectedLines({});
    setPreviewResult(null);
    setSubmitError('');
    navigate(`${LIST_ROUTE}/tao/${order.id}`, { replace: true });
  };

  const handleToggleLine = (line) => {
    const lineId = line.chi_tiet_don_hang_id;
    setSelectedLines((prev) => {
      const next = { ...prev };
      if (next[lineId]) {
        delete next[lineId];
      } else {
        next[lineId] = 1;
      }
      return next;
    });
    setPreviewResult(null);
  };

  const handleQuantityChange = (line, val) => {
    const lineId = line.chi_tiet_don_hang_id;
    const maxQty = line.so_luong_con_duoc_tra || 1;
    const num = Math.max(1, Math.min(maxQty, Number(val) || 1));
    setSelectedLines((prev) => ({
      ...prev,
      [lineId]: num,
    }));
    setPreviewResult(null);
  };

  const selectedEntries = Object.entries(selectedLines);
  const numSelectedLines = selectedEntries.length;
  const numSelectedUnits = selectedEntries.reduce((sum, [, qty]) => sum + Number(qty || 0), 0);

  const [previewRetry, setPreviewRetry] = useState(0);

  useEffect(() => {
    const entries = Object.entries(selectedLines);
    setPreviewResult(null);
    setSubmitError('');

    if (entries.length === 0) {
      setIsCalculating(false);
      return;
    }

    const controller = new AbortController();
    setIsCalculating(true);

    const timer = setTimeout(async () => {
      try {
        const data = await previewReturn(
          {
            don_hang_id: Number(currentOrderId),
            chi_tiet_tra: entries.map(([id, qty]) => ({
              chi_tiet_don_hang_id: Number(id),
              so_luong: Number(qty),
            })),
          },
          controller.signal
        );

        if (controller.signal.aborted) return;

        if (data?.du_dieu_kien === false || data?.tong_tien_hoan == null) {
          throw new Error('Chưa thể xác nhận số tiền hoàn từ máy chủ.');
        }

        setPreviewResult(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setSubmitError(err?.message || 'Không thể tính thử tiền hoàn.');
        }
      } finally {
        if (!controller.signal.aborted) setIsCalculating(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedLines, currentOrderId, previewRetry]);

  const handleCalculatePreview = () => {
    setPreviewResult(null);
    setPreviewRetry((value) => value + 1);
  };

  // Call Create Return API
  const handleCreateReturn = async () => {
    setSubmitError('');

    if (!currentOrderId) {
      setSubmitError('Vui lòng chọn đơn hàng gốc cần trả.');
      return;
    }
    if (numSelectedLines === 0) {
      setSubmitError('Vui lòng chọn ít nhất một sản phẩm cần trả.');
      return;
    }
    if (!contactName.trim()) {
      setSubmitError('Vui lòng nhập tên người liên hệ.');
      return;
    }
    if (!contactPhone.trim()) {
      setSubmitError('Vui lòng nhập số điện thoại người liên hệ.');
      return;
    }
    if (!reason.trim()) {
      setSubmitError('Vui lòng nhập lý do trả hàng.');
      return;
    }
    if (!previewResult) {
      setSubmitError(
        isCalculating
          ? 'Đang tự động tính tiền hoàn, vui lòng chờ trong giây lát...'
          : 'Chưa thể xác nhận số tiền hoàn. Vui lòng kiểm tra lại sản phẩm cần trả.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        don_hang_id: Number(currentOrderId),
        ten_nguoi_lien_he: contactName.trim(),
        sdt_nguoi_lien_he: contactPhone.trim(),
        ly_do_tra: reason.trim(),
        hinh_thuc_hoan_tien: refundMethod,
        ghi_chu: notes.trim() || undefined,
        chi_tiet_tra: Object.entries(selectedLines).map(([id, qty]) => ({
          chi_tiet_don_hang_id: Number(id),
          so_luong: Number(qty),
        })),
      };

      const res = await createReturn(payload);
      const newCode = res?.ma_tra_hang || res?.id || 'mới';
      navigate(LIST_ROUTE, {
        state: { toast: `Tạo phiếu trả hàng ${newCode} thành công.` },
      });
    } catch (err) {
      setSubmitError(err?.message || 'Không thể tạo phiếu trả hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const donHang = eligibleData?.don_hang || {};
  const chiTiet = eligibleData?.chi_tiet || [];
  const blockedReasons = eligibleData?.ly_do_chan || [];

  return (
    <div className="returns-page">
      {/* Hero Header */}
      <section className="returns-hero">
        <div className="returns-hero__info">
          <div className="returns-hero__breadcrumb">
            <Link to="/admin/don-hang/danh-sach-don-hang">ĐƠN HÀNG</Link> /{' '}
            <Link to={LIST_ROUTE}>KHÁCH TRẢ HÀNG</Link> / <span>LẬP PHIẾU</span>
          </div>
          <h1>LẬP PHIẾU TRẢ HÀNG</h1>
          {(donHang.ma_don_hang || currentOrderId) && (
            <div className="returns-hero__order-id">
              {donHang.ma_don_hang || `ORD-${currentOrderId}`}
            </div>
          )}
        </div>
        <button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}>
          QUAY LẠI DANH SÁCH
        </button>
      </section>

      {/* Block reason notice if any */}
      {!eligibleData?.du_dieu_kien_lap_phieu && blockedReasons.length > 0 && (
        <div style={{ margin: '16px 32px 0' }} className="return-warning-callout">
          <strong>Đơn hàng bị chặn hoặc chưa đủ điều kiện lập phiếu:</strong>
          <ul style={{ margin: '6px 0 0 16px' }}>
            {blockedReasons.map((r, i) => (
              <li key={i}>{r.message || r.code}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <div style={{ margin: '16px 32px 0' }} className="return-warning-callout">
          {submitError}
        </div>
      )}

      {/* Form Container */}
      <div className="returns-create-container">
        {/* ĐƠN HÀNG GỐC */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>
              <i aria-hidden="true" />
              01 / ĐƠN HÀNG GỐC
            </h2>
            {currentOrderId && (
              <div className="return-section-box__actions">
                <button
                  type="button"
                  className="return-btn return-btn--outline"
                  style={{ minHeight: 28, padding: '2px 10px', fontSize: 11 }}
                  onClick={() => setShowOrderSearch((prev) => !prev)}
                >
                  {showOrderSearch ? 'ĐÓNG TÌM KIẾM' : 'ĐỔI ĐƠN HÀNG GỐC'}
                </button>
              </div>
            )}
          </div>
          <div className="return-section-box__body">
            {eligibleError && (
              <div
                style={{
                  margin: '0 0 16px',
                  padding: 10,
                  background: '#fff1f1',
                  border: '1px solid #ff9297',
                  color: '#df1720',
                  fontSize: 12,
                }}
              >
                {eligibleError}
              </div>
            )}

            {/* Current order details if loaded */}
            {donHang && donHang.id ? (
              <div
                className="return-order-info-grid"
                style={{ marginBottom: showOrderSearch ? 16 : 0 }}
              >
                <div className="return-order-info-item">
                  <dt>MÃ ĐƠN</dt>
                  <dd>{donHang.ma_don_hang || currentOrderId}</dd>
                </div>
                <div className="return-order-info-item">
                  <dt>NGƯỜI LIÊN HỆ GỐC</dt>
                  <dd>{donHang.ten_nguoi_lien_he || contactName || 'Khách lẻ'}</dd>
                </div>
                <div className="return-order-info-item">
                  <dt>SỐ ĐIỆN THOẠI</dt>
                  <dd>{donHang.sdt_nguoi_lien_he || contactPhone || '—'}</dd>
                </div>
                <div className="return-order-info-item">
                  <dt>NGÀY HOÀN THÀNH</dt>
                  <dd>{formatDisplayDate(donHang.ngay_hoan_thanh)}</dd>
                </div>
              </div>
            ) : currentOrderId && loadingEligible ? (
              <div style={{ padding: '16px 0' }}>
                <LoadingSpinner text="Đang tải thông tin đơn hàng..." size="sm" />
              </div>
            ) : null}

            {/* Embedded order search input and table */}
            {(!currentOrderId || showOrderSearch) && (
              <div
                style={{
                  marginTop: donHang && donHang.id ? 16 : 0,
                  borderTop: donHang && donHang.id ? '1px dashed #d1d5db' : 'none',
                  paddingTop: donHang && donHang.id ? 16 : 0,
                }}
              >
                <label className="returns-modal-search" style={{ marginBottom: 12 }}>
                  <HiOutlineSearch />
                  <input
                    value={orderQuery}
                    onChange={(e) => {
                      setOrderQuery(e.target.value);
                      setOrderPage(1);
                    }}
                    placeholder="TÌM MÃ ĐƠN / KHÁCH / NGƯỜI NHẬN / SĐT..."
                  />
                </label>

                {orderSearchError && (
                  <div
                    style={{
                      margin: '8px 0',
                      padding: 8,
                      background: '#fff1f1',
                      color: '#df1720',
                      fontSize: 11,
                    }}
                  >
                    {orderSearchError}
                  </div>
                )}

                <div className="returns-modal-table-wrap" style={{ borderBottom: 0 }}>
                  <table className="returns-table">
                    <thead>
                      <tr>
                        <th>MÃ ĐƠN</th>
                        <th>KHÁCH / LIÊN HỆ</th>
                        <th>SỐ ĐIỆN THOẠI</th>
                        <th>HOÀN THÀNH</th>
                        <th>QUY TẮC TRẢ</th>
                        <th style={{ textAlign: 'center' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderSearchLoading ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>
                            <LoadingSpinner text="Đang tìm kiếm đơn hàng..." size="sm" />
                          </td>
                        </tr>
                      ) : orderList.length > 0 ? (
                        orderList.map((ord) => {
                          const isCurrent = String(ord.id) === String(currentOrderId);
                          return (
                            <tr
                              key={ord.id}
                              style={{ background: isCurrent ? '#fffbf5' : 'inherit' }}
                            >
                              <td>
                                <strong className="returns-code">
                                  {ord.ma_don_hang || ord.id}
                                </strong>
                              </td>
                              <td>{ord.ten_nguoi_lien_he || 'Khách vãng lai'}</td>
                              <td>
                                <span className={!ord.sdt_nguoi_lien_he ? 'returns-muted' : ''}>
                                  {ord.sdt_nguoi_lien_he || 'Nhập khi lập phiếu'}
                                </span>
                              </td>
                              <td>{formatDisplayDate(ord.ngay_hoan_thanh)}</td>
                              <td>
                                <span
                                  className={`returns-order-rule${ord.chi_duoc_tra_toan_bo ? ' returns-order-rule--all' : ''}`}
                                >
                                  {ord.chi_duoc_tra_toan_bo ? 'CHỈ TRẢ TOÀN BỘ' : 'CHỌN SỐ LƯỢNG'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="returns-select-order-btn"
                                  style={{
                                    background: isCurrent ? '#16a34a' : '#000',
                                    borderColor: isCurrent ? '#16a34a' : '#000',
                                  }}
                                  onClick={() => handleSelectOrder(ord)}
                                >
                                  {isCurrent ? 'ĐANG CHỌN' : 'CHỌN TRẢ HÀNG'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}
                          >
                            Không tìm thấy đơn hàng nào đủ điều kiện trả.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  className="admin-table-footer"
                  style={{
                    border: '1px solid #000',
                    borderTop: '0',
                    marginTop: 0,
                  }}
                  totalItems={orderPagination.total_items ?? orderList.length}
                  pageSize={orderPageSize}
                  currentPage={orderPage}
                  onPageChange={(p) => setOrderPage(p)}
                  pageSizeOptions={[5, 10, 20, 50, 100]}
                  onPageSizeChange={(sz) => {
                    setOrderPageSize(sz);
                    setOrderPage(1);
                  }}
                  showSummary={true}
                  idPrefix="create-return-order"
                />
              </div>
            )}
          </div>
        </section>

        {/* CHỌN SẢN PHẨM & SỐ LƯỢNG TRẢ */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>
              <i aria-hidden="true" />
              02 / CHỌN SẢN PHẨM & SỐ LƯỢNG TRẢ
            </h2>
            <div className="return-section-box__actions">
              <span>
                Đã chọn:{' '}
                <strong>
                  {numSelectedLines} dòng · {numSelectedUnits} đơn vị
                </strong>
              </span>
            </div>
          </div>
          <div className="return-section-box__body">
            {!currentOrderId ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  color: '#6b7280',
                  fontSize: 13,
                }}
              >
                Vui lòng tìm và chọn đơn hàng gốc ở phần trên để hiển thị danh sách sản phẩm có thể
                trả.
              </div>
            ) : loadingEligible ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <LoadingSpinner text="Đang tải dữ liệu sản phẩm của đơn hàng..." size="sm" />
              </div>
            ) : (
              <div className="returns-table-wrap">
                <table className="returns-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48, textAlign: 'center' }}>CHỌN</th>
                      <th>SẢN PHẨM / PHIÊN BẢN</th>
                      <th>ĐÃ GIAO</th>
                      <th>ĐÃ YÊU CẦU</th>
                      <th>CÒN ĐƯỢC TRẢ</th>
                      <th>SL TRẢ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chiTiet.length > 0 ? (
                      chiTiet.map((item) => {
                        const lineId = item.chi_tiet_don_hang_id;
                        const isChecked = Boolean(selectedLines[lineId]);
                        const currentQty = selectedLines[lineId] || 1;
                        const maxQty = item.so_luong_con_duoc_tra || 1;

                        return (
                          <tr
                            key={lineId}
                            style={{ background: isChecked ? '#fffbf5' : 'inherit' }}
                          >
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={item.so_luong_con_duoc_tra <= 0}
                                onChange={() => handleToggleLine(item)}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <strong>{item.ten_san_pham}</strong>
                              {item.la_qua_tang && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 10,
                                    color: '#e31e24',
                                    fontWeight: 800,
                                  }}
                                >
                                  (QUÀ TẶNG)
                                </span>
                              )}
                            </td>
                            <td>{item.so_luong_da_giao ?? '—'}</td>
                            <td>{item.so_luong_da_yeu_cau_tra ?? 0}</td>
                            <td>
                              <strong
                                style={{ color: item.so_luong_con_duoc_tra > 0 ? '#111' : '#888' }}
                              >
                                {item.so_luong_con_duoc_tra ?? 0}
                              </strong>
                            </td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                max={maxQty}
                                disabled={!isChecked}
                                value={currentQty}
                                onChange={(e) => handleQuantityChange(item, e.target.value)}
                                style={{
                                  width: 70,
                                  height: 32,
                                  textAlign: 'center',
                                  border: '1px solid #111',
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}
                        >
                          Đơn hàng không có sản phẩm nào đủ điều kiện trả.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* THÔNG TIN TIẾP NHẬN & HOÀN TIỀN */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>
              <i aria-hidden="true" />
              03 / THÔNG TIN TIẾP NHẬN & HOÀN TIỀN
            </h2>
          </div>
          <div className="return-section-box__body">
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            >
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  TÊN NGƯỜI LIÊN HỆ *
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Tên khách hàng hoặc người mang trả..."
                  style={{ width: '100%', height: 38, border: '1px solid #111', padding: '0 12px' }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  SỐ ĐIỆN THOẠI *
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Số điện thoại liên hệ..."
                  style={{ width: '100%', height: 38, border: '1px solid #111', padding: '0 12px' }}
                />
              </div>
            </div>

            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            >
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  LÝ DO TRẢ HÀNG *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Sản phẩm lỗi, không phù hợp nhu cầu..."
                  style={{ width: '100%', height: 38, border: '1px solid #111', padding: '0 12px' }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  HÌNH THỨC HOÀN TIỀN DỰ KIẾN
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  style={{ width: '100%', height: 38, border: '1px solid #111', padding: '0 12px' }}
                >
                  <option value="TIEN_MAT">Tiền mặt</option>
                  <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                GHI CHÚ THÊM
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú nội bộ bổ sung (nếu có)..."
                rows={3}
                style={{ width: '100%', border: '1px solid #111', padding: '8px 12px' }}
              />
            </div>
          </div>
        </section>

        {/* KẾT QUẢ TÍNH & XÁC NHẬN TẠO PHIẾU */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>
              <i aria-hidden="true" />
              04 / KẾT QUẢ TÍNH & XÁC NHẬN TẠO PHIẾU
            </h2>
          </div>
          <div className="return-section-box__body">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              <button
                type="button"
                className="return-btn return-btn--outline"
                disabled={isCalculating || isSubmitting || numSelectedLines === 0}
                onClick={handleCalculatePreview}
              >
                TÍNH THỬ TIỀN HOÀN
              </button>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Hệ thống tự tính lại khi đổi sản phẩm hoặc số lượng.
              </span>
            </div>

            {isCalculating ? (
              <div
                role="status"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                Đang tính tiền hoàn...
              </div>
            ) : previewResult ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>TỔNG TIỀN HOÀN DỰ KIẾN:</span>
                  <strong style={{ fontSize: 18, color: '#e31e24' }}>
                    {money(previewResult.tong_tien_hoan)}
                  </strong>
                </div>
              </div>
            ) : numSelectedLines === 0 ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  padding: 16,
                  marginBottom: 16,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Vui lòng chọn sản phẩm và số lượng cần trả ở mục 02 để hệ thống tự động tính tiền
                hoàn.
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                className="return-btn return-btn--outline"
                onClick={() => navigate(LIST_ROUTE)}
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                className="return-btn return-btn--danger"
                disabled={!currentOrderId || isSubmitting || !previewResult}
                onClick={handleCreateReturn}
              >
                {isSubmitting ? 'ĐANG TẠO PHIẾU...' : 'TẠO PHIẾU TRẢ HÀNG'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ==========================================================================
   View 4: Chi tiết phiếu trả hàng (Kết nối Backend chi tiết & thao tác)
   ========================================================================== */
function ReturnDetail({ returnId }) {
  const navigate = useNavigate();

  const access = useAdminPermissions()?.access;
  const canReceiveReturn = hasAdminPermission(access, 'khach_tra_hang', 'sua');
  const canRefundReturn = hasSystemAdminPermission(access, 'khach_tra_hang', 'sua');

  // All Hooks at top level
  const [activeTab, setActiveTab] = useState('TONG_QUAN');
  const [showTH007, setShowTH007] = useState(false);
  const [toast, setToast] = useState('');

  const [detail, setDetail] = useState(null);

  const canCancelReturn =
    hasSystemAdminPermission(access, 'khach_tra_hang', 'xoa') &&
    detail?.trang_thai_tra_hang === 'CHO_TIEP_NHAN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // TH007 Form State
  const [th007ReceiptDate, setTh007ReceiptDate] = useState(() => new Date().toISOString());
  const [th007Shipper, setTh007Shipper] = useState('');
  const [th007Condition, setTh007Condition] = useState('Bình thường, nguyên vẹn');
  const [th007Notes, setTh007Notes] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  // Refund Confirmation Modal States
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const [orderExtra, setOrderExtra] = useState(null);

  // Cancel Receipt Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Khách không còn nhu cầu trả hàng');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const handleCancelReceipt = async () => {
    if (!canCancelReturn || !detail?.id || isCancelling) return;
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy tiếp nhận');
      return;
    }
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelReturn(detail.id, { ly_do: cancelReason.trim() });
      setToast(`Đã hủy tiếp nhận phiếu trả hàng ${ticketCode}`);
      setShowCancelModal(false);
      const controller = new AbortController();
      fetchDetail(controller.signal);
    } catch (err) {
      setCancelError(err?.message || 'Không thể hủy tiếp nhận phiếu trả hàng');
    } finally {
      setIsCancelling(false);
    }
  };

  const loadOrderData = async (orderId, signal) => {
    try {
      const [orderRes, eligRes] = await Promise.allSettled([
        getOrder(orderId, signal),
        getEligibleOrderDetail(orderId, signal),
      ]);
      setOrderExtra({
        order: orderRes.status === 'fulfilled' ? orderRes.value : null,
        elig: eligRes.status === 'fulfilled' ? eligRes.value : null,
      });
    } catch (e) {
      console.warn('Could not load order details', e);
    }
  };

  const fetchDetail = async (signal) => {
    setLoading(true);
    setError('');
    try {
      const data = await getReturnDetail(returnId, signal);
      if (data) {
        setDetail(data);
        if (data.don_hang?.id) {
          await loadOrderData(data.don_hang.id, signal);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err?.message || 'Không thể tải chi tiết phiếu trả hàng từ máy chủ.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDetail(controller.signal);
    return () => controller.abort();
  }, [returnId]);

  const productInfoMap = useMemo(() => {
    const map = new Map();
    const orderData = orderExtra?.order;
    const eligData = orderExtra?.elig;

    if (eligData?.chi_tiet && Array.isArray(eligData.chi_tiet)) {
      eligData.chi_tiet.forEach((item) => {
        const lineId = Number(item.chi_tiet_don_hang_id);
        if (!lineId) return;
        const serials = [];
        if (Array.isArray(item.thiet_bi_hien_hanh)) {
          item.thiet_bi_hien_hanh.forEach((d) => {
            const sn = d?.so_serial;
            if (sn && !serials.includes(String(sn))) serials.push(String(sn));
          });
        }
        map.set(lineId, {
          ten_san_pham: item.ten_san_pham,
          ten_phien_ban: item.ten_phien_ban,
          phien_ban_id: item.phien_ban_id,
          serials,
        });
      });
    }

    if (orderData?.san_pham && Array.isArray(orderData.san_pham)) {
      orderData.san_pham.forEach((sp) => {
        const lineId = Number(sp.chi_tiet_don_hang_id || sp.id);
        if (!lineId) return;
        const current = map.get(lineId) || { serials: [] };
        map.set(lineId, {
          ...current,
          ten_san_pham: sp.ten_san_pham || current.ten_san_pham,
          ten_phien_ban: sp.ten_phien_ban || current.ten_phien_ban,
          ma_san_pham: sp.ma_san_pham || current.ma_san_pham,
          phien_ban_id: sp.phien_ban_id || current.phien_ban_id,
        });
      });
    }

    if (orderData?.thiet_bi_da_giao && Array.isArray(orderData.thiet_bi_da_giao)) {
      orderData.thiet_bi_da_giao.forEach((dev) => {
        const lineId = Number(dev.chi_tiet_don_hang_id);
        if (!lineId) return;
        const current = map.get(lineId) || { serials: [] };
        const serials = [...current.serials];
        const sn = dev.so_serial;
        if (sn && !serials.includes(String(sn))) serials.push(String(sn));
        map.set(lineId, {
          ...current,
          ten_san_pham: dev.ten_san_pham || current.ten_san_pham,
          ten_phien_ban: dev.ten_phien_ban || current.ten_phien_ban,
          serials,
        });
      });
    }

    if (orderData?.thiet_bi_hien_hanh && Array.isArray(orderData.thiet_bi_hien_hanh)) {
      orderData.thiet_bi_hien_hanh.forEach((dev) => {
        const lineId = Number(dev.chi_tiet_don_hang_id);
        if (!lineId) return;
        const current = map.get(lineId) || { serials: [] };
        const serials = [...current.serials];
        const sn = dev.so_serial;
        if (sn && !serials.includes(String(sn))) serials.push(String(sn));
        map.set(lineId, {
          ...current,
          serials,
        });
      });
    }

    if (orderData?.serials && Array.isArray(orderData.serials)) {
      map.forEach((val) => {
        if (val.phien_ban_id && (!val.serials || val.serials.length === 0)) {
          const matchedSerials = orderData.serials
            .filter((s) => Number(s.phien_ban_id) === Number(val.phien_ban_id))
            .map((s) => s.so_serial)
            .filter(Boolean);
          if (matchedSerials.length > 0) {
            val.serials = Array.from(new Set([...(val.serials || []), ...matchedSerials]));
          }
        }
      });
    }

    const returnReceived = [
      ...(Array.isArray(detail?.hang_da_nhan) ? detail.hang_da_nhan : []),
      ...(Array.isArray(detail?.hang_dang_giu) ? detail.hang_dang_giu : []),
    ];
    returnReceived.forEach((item) => {
      const lineId = Number(item.chi_tiet_don_hang_id);
      if (!lineId) return;
      const current = map.get(lineId) || { serials: [] };
      const serials = [...current.serials];
      if (Array.isArray(item.serials)) {
        item.serials.forEach((s) => {
          const sn = typeof s === 'string' ? s : s?.so_serial;
          if (sn && !serials.includes(String(sn))) serials.push(String(sn));
        });
      }
      map.set(lineId, {
        ...current,
        serials,
      });
    });

    return map;
  }, [orderExtra, detail]);

  if (loading) {
    return (
      <div className="returns-page">
        <LoadingSpinner text="Đang tải chi tiết phiếu trả hàng..." fullPage />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="returns-page" style={{ padding: 40 }}>
        <h2>KHÔNG TÌM THẤY PHIẾU TRẢ HÀNG</h2>
        <p style={{ margin: '16px 0', color: '#df1720' }}>
          {error || `Mã phiếu ${returnId} không tồn tại trên hệ thống.`}
        </p>
        <button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}>
          QUAY LẠI DANH SÁCH
        </button>
      </div>
    );
  }

  const ticketCode = detail.ma_tra_hang || `TH${String(detail.id).padStart(6, '0')}`;
  const orderCode =
    detail.don_hang?.ma_don_hang || (detail.don_hang?.id ? `ORD-${detail.don_hang.id}` : '—');
  const contactNameText = detail.ten_nguoi_lien_he || 'Chưa có tên';
  const contactPhoneText = detail.sdt_nguoi_lien_he || 'Chưa có SĐT';
  const createdDate = detail.ngay_tao || detail.ngayTao || detail.created_at || detail.createdAt;
  const refundAmount = detail.tong_tien_hoan != null ? detail.tong_tien_hoan : 0;
  const statusVal = detail.trang_thai_tra_hang;
  const statusTone = getReturnStatusVariant(statusVal);
  const statusDisplay = getReturnStatusText(statusVal);
  const lineItems = detail.chi_tiet_tra || [];
  const firstItem = lineItems[0] || {};

  // Actions
  const handleReload = () => {
    fetchDetail();
    setToast('Đã tải lại dữ liệu phiếu mới nhất từ máy chủ.');
  };

  // Submit TH007: Ghi nhận tiếp nhận kiện
  const handleSaveTH007 = async () => {
    if (!canReceiveReturn) return;

    setIsReceiving(true);
    try {
      let orderLines = [];
      if (detail?.don_hang?.id) {
        try {
          const elig = await getEligibleOrderDetail(detail.don_hang.id);
          orderLines = elig?.chi_tiet || [];
        } catch (e) {
          console.warn('Could not fetch eligible order lines', e);
        }
      }

      const orderLineMap = new Map();
      orderLines.forEach((ol) => {
        orderLineMap.set(ol.chi_tiet_don_hang_id, ol);
      });

      const hang_nhan = lineItems.map((ln) => {
        const orderLineId = ln.chi_tiet_don_hang_id || ln.id;
        const matched = orderLineMap.get(orderLineId);
        const variantId = matched?.phien_ban_id || ln.phien_ban_id || 1;
        const qty = Number(ln.so_luong || 1);

        // Map serials if product manages serials
        const serials = (matched?.thiet_bi_hien_hanh || [])
          .slice(0, qty)
          .filter((d) => d.so_serial_id != null)
          .map((d) => ({
            so_serial_id: d.so_serial_id,
            trang_thai_sau_nhan: 'TRONG_KHO',
          }));

        return {
          chi_tiet_don_hang_id: orderLineId,
          phien_ban_id: variantId,
          kho_hang_id: 1,
          so_luong_nguyen_ven: qty,
          so_luong_loi: 0,
          serials,
        };
      });

      const payload = {
        ngay_nhan_hang: new Date().toISOString(),
        hang_nhan,
      };

      await receiveReturnPackage(detail.id, payload);
      setShowTH007(false);
      setToast(`Đã ghi nhận tiếp nhận kiện cho phiếu ${ticketCode}`);
      fetchDetail();
    } catch (err) {
      setToast(err?.message ? `Lỗi: ${err.message}` : 'Không thể ghi nhận tiếp nhận kiện.');
    } finally {
      setIsReceiving(false);
    }
  };

  const openRefundModal = () => {
    if (!canRefundReturn) return;

    setRefundError(null);
    setShowRefundModal(true);
  };

  const handleConfirmRefund = async () => {
    if (!canRefundReturn) return;

    setIsRefunding(true);
    setRefundError(null);
    try {
      const payload = {
        xac_nhan_da_hoan_tien: true,
        phuong_thuc_hoan: detail.hinh_thuc_hoan_tien || 'TIEN_MAT',
        ngay_hoan_tien: new Date().toISOString(),
      };
      await refundReturn(detail.id, payload);
      setToast(`Đã hoàn tất chứng từ hoàn tiền cho phiếu ${ticketCode}`);
      setShowRefundModal(false);
      fetchDetail();
    } catch (err) {
      setRefundError(err?.message || 'Không thể thực hiện hoàn tiền.');
    } finally {
      setIsRefunding(false);
    }
  };

  const RETURN_DETAIL_TABS = [
    { key: 'TONG_QUAN', label: 'TỔNG QUAN & ĐỐI CHIẾU', icon: FileText },
    { key: 'TIEP_NHAN', label: 'TIẾP NHẬN & LƯU KHO', icon: Package },
    { key: 'HOAN_TIEN', label: 'CHỨNG TỪ & HOÀN TIỀN', icon: Wallet },
  ];

  return (
    <div className="w-shell returns-detail-shell" data-refund-positive={Number(refundAmount) > 0}>
      {' '}
      {/* Toast Alert */}
      {toast && (
        <p className="w-intake-message" role="status" style={{ margin: '12px 28px 0' }}>
          <CheckCircle2 size={18} />
          {toast}
        </p>
      )}
      {/* HERO HEADER */}
      <header className="w-shell-hero">
        <div>
          <p className="w-shell-breadcrumb">
            <Link to="/admin/don-hang/danh-sach-don-hang">ĐƠN HÀNG</Link> <ChevronRight size={12} />{' '}
            <Link to={LIST_ROUTE}>KHÁCH TRẢ HÀNG</Link> <ChevronRight size={12} />{' '}
            <span>CHI TIẾT PHIẾU</span>
          </p>
          <div className="w-shell-title-row">
            <h1>{ticketCode}</h1>
            <span className={`returns-status-badge returns-status-badge--${statusTone}`}>
              {statusDisplay}
            </span>
            <span className="w-reference-tag kth-order-reference">Đơn gốc: {orderCode}</span>
          </div>
          <div className="kth-contact-hero-bar">
            <span className="kth-contact-item">
              <span className="kth-contact-label">Người liên hệ:</span>
              <strong className="kth-contact-name">{contactNameText}</strong>
            </span>
            <span className="w-text-divider">/</span>
            <span className="kth-contact-item">
              <span className="kth-contact-label">Số điện thoại:</span>
              <strong className="kth-contact-phone">
                <Phone size={13} /> {contactPhoneText}
              </strong>
            </span>
          </div>
        </div>

        <div className="w-shell-actions">
          <button type="button" className="w-shell-button" onClick={() => navigate(LIST_ROUTE)}>
            <ArrowLeft size={15} /> Danh sách
          </button>
          <button type="button" className="w-shell-button" onClick={handleReload}>
            <RefreshCw size={15} /> Tải lại
          </button>
          {detail.don_hang?.id && (
            <button
              type="button"
              className="w-shell-button"
              onClick={() => navigate(`${ORDER_DETAIL_ROUTE}/${detail.don_hang.id}`)}
            >
              <ExternalLink size={15} /> Xem đơn gốc
            </button>
          )}
          {canReceiveReturn && statusVal === 'CHO_TIEP_NHAN' && (
            <button
              type="button"
              className={`w-shell-button ${showTH007 ? 'w-shell-button--red' : 'w-shell-button--black'}`}
              onClick={() => setShowTH007((prev) => !prev)}
            >
              <Package size={15} />
              {showTH007 ? 'Đóng tiếp nhận' : 'Tiếp nhận kiện'}
            </button>
          )}

          {canCancelReturn && (
            <button
              type="button"
              className="w-shell-button w-shell-button--red"
              onClick={() => {
                setCancelReason('Khách không còn nhu cầu trả hàng');
                setCancelError(null);
                setShowCancelModal(true);
              }}
            >
              <XCircle size={15} /> Hủy tiếp nhận
            </button>
          )}

          {canRefundReturn && statusVal === 'DA_NHAN_HANG' && !detail.phieu_chi && (
            <button
              type="button"
              className="w-shell-button w-shell-button--red"
              onClick={openRefundModal}
            >
              <DollarSign size={15} /> Hoàn tiền cho khách
            </button>
          )}
        </div>
      </header>
      {/* TABS NAVIGATION */}
      <nav className="w-shell-tabs" aria-label="Các nhóm thông tin yêu cầu trả hàng">
        {RETURN_DETAIL_TABS.map(({ key, label, icon: Icon }) => (
          <button
            type="button"
            key={key}
            aria-current={activeTab === key ? 'page' : undefined}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      {/* CONTENT GRID */}
      <div className="w-shell-content">
        <div className="w-shell-detail-grid">
          {/* MAIN COLUMN */}
          <main>
            {/* TH007 Panel if toggled */}
            {canReceiveReturn && showTH007 && (
              <WarrantyPanel
                title="TH007 — TIẾP NHẬN KIỆN & NGOẠI QUAN"
                note="Biên bản tiếp nhận thực tế kiện hàng khách mang tới cửa hàng."
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <label className="kth-field-label">NGƯỜI GIAO</label>
                    <input
                      type="text"
                      value={th007Shipper}
                      onChange={(e) => setTh007Shipper(e.target.value)}
                      placeholder="Tên người giao hàng / khách..."
                      style={{
                        width: '100%',
                        height: 38,
                        border: '1px solid #111',
                        padding: '0 12px',
                        marginTop: 4,
                      }}
                    />
                  </div>
                  <div>
                    <label className="kth-field-label">HIỆN TRẠNG NGOẠI QUAN</label>
                    <input
                      type="text"
                      value={th007Condition}
                      onChange={(e) => setTh007Condition(e.target.value)}
                      placeholder="Tình trạng linh kiện, vỏ hộp..."
                      style={{
                        width: '100%',
                        height: 38,
                        border: '1px solid #111',
                        padding: '0 12px',
                        marginTop: 4,
                      }}
                    />
                  </div>
                </div>

                <div
                  className="w-shell-actions"
                  style={{ justifyContent: 'flex-end', marginTop: 16 }}
                >
                  <button
                    type="button"
                    className="w-shell-button"
                    onClick={() => setShowTH007(false)}
                  >
                    HỦY TIẾP NHẬN
                  </button>
                  <button
                    type="button"
                    className="w-shell-button w-shell-button--black"
                    disabled={isReceiving}
                    onClick={handleSaveTH007}
                  >
                    {isReceiving ? 'ĐANG LƯU...' : 'GHI NHẬN KIỆN — CHƯA NHẬP KHO'}
                  </button>
                </div>
              </WarrantyPanel>
            )}

            {/* TAB 1: TỔNG QUAN & ĐỐI CHIẾU */}
            {activeTab === 'TONG_QUAN' && (
              <>
                <WarrantyPanel
                  title="DÒNG SẢN PHẨM HOÀN TRẢ"
                  note="Chi tiết các sản phẩm và số tiền hoàn tương ứng."
                >
                  <WarrantyTable
                    showPagination={false}
                    columns={[
                      'SẢN PHẨM TRẢ',
                      'SERIAL',
                      'SỐ LƯỢNG',
                      'ĐƠN GIÁ HOÀN',
                      'THÀNH TIỀN HOÀN',
                    ]}
                    rows={lineItems.map((line, idx) => {
                      const lineId = Number(line.chi_tiet_don_hang_id || line.id);
                      const lineInfo =
                        productInfoMap.get(lineId) ||
                        (productInfoMap.size === 1 && lineItems.length === 1
                          ? Array.from(productInfoMap.values())[0]
                          : null) ||
                        {};

                      const prodName =
                        line.ten_san_pham ||
                        lineInfo.ten_san_pham ||
                        line.sanPham ||
                        `Dòng sản phẩm #${line.chi_tiet_don_hang_id || idx + 1}`;

                      const variantName = lineInfo.ten_phien_ban || line.ten_phien_ban;
                      const rawSerials = lineInfo.serials || line.serials || [];
                      const serials = (Array.isArray(rawSerials) ? rawSerials : [rawSerials])
                        .map((s) => (typeof s === 'string' ? s : s?.so_serial))
                        .filter((s) => s && !String(s).startsWith('TB-'));

                      return [
                        <div key={line.id || idx}>
                          <strong className="kth-product-name">{prodName}</strong>
                          {variantName && (
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                              {variantName}
                            </div>
                          )}
                        </div>,
                        <div key="serial" className="kth-serial-cell">
                          {serials && serials.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {serials.map((s, sIdx) => (
                                <span key={sIdx} className="kth-code-pill kth-code-pill--serial">
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>-</span>
                          )}
                        </div>,
                        <span key="sl" className="kth-qty-badge">
                          {line.so_luong || 1}
                        </span>,
                        <span key="dg">{money(line.don_gia_hoan)}</span>,
                        <strong key="tt" className="kth-line-total">
                          {money(line.thanh_tien_hoan || line.so_luong * line.don_gia_hoan)}
                        </strong>,
                      ];
                    })}
                    empty="Không có dữ liệu dòng trả hàng."
                  />
                </WarrantyPanel>

                <WarrantyPanel
                  title="THÔNG TIN ĐƠN GỐC & YÊU CẦU"
                  note="Thông tin liên hệ và lý do trả từ hồ sơ phiếu."
                >
                  <WarrantyFields
                    fields={[
                      [
                        'Mã phiếu',
                        <span className="kth-code-pill kth-code-pill--ticket">{ticketCode}</span>,
                      ],
                      [
                        'Đơn mua hàng gốc',
                        <span
                          className="kth-code-pill kth-code-pill--order"
                          onClick={() =>
                            detail.don_hang?.id &&
                            navigate(`${ORDER_DETAIL_ROUTE}/${detail.don_hang.id}`)
                          }
                          style={{ cursor: detail.don_hang?.id ? 'pointer' : 'default' }}
                        >
                          {orderCode} {detail.don_hang?.id && <ExternalLink size={12} />}
                        </span>,
                      ],
                      [
                        'Người liên hệ',
                        <strong className="kth-contact-name">{contactNameText}</strong>,
                      ],
                      [
                        'Số điện thoại',
                        <strong className="kth-contact-phone">
                          <Phone size={12} /> {contactPhoneText}
                        </strong>,
                      ],
                      [
                        'Lý do trả',
                        <span className="kth-reason-text">
                          {detail.ly_do_tra || 'Không phù hợp'}
                        </span>,
                      ],
                      [
                        'Hình thức hoàn dự kiến',
                        <span
                          className={`kth-payment-pill kth-payment-pill--${detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN' ? 'bank' : 'cash'}`}
                        >
                          {detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN'
                            ? 'Chuyển khoản'
                            : 'Tiền mặt'}
                        </span>,
                      ],
                      [
                        'Tổng tiền hoàn',
                        <strong className="kth-refund-amount-text">{money(refundAmount)}</strong>,
                      ],
                      [
                        'Ngày tạo phiếu',
                        <span className="kth-date-text">{formatDisplayDate(createdDate)}</span>,
                      ],
                    ]}
                  />
                </WarrantyPanel>
              </>
            )}
            {/* TAB 2: TIẾP NHẬN & LƯU KHO */}
            {activeTab === 'TIEP_NHAN' && (
              <WarrantyPanel
                title="KIỂM TRA THỰC NHẬN & LƯU KHO"
                note="Biên bản tiếp nhận kiểm tra thực tế kiện hàng tại cửa hàng."
              >
                {detail.ngay_nhan_hang ? (
                  <WarrantyFields
                    fields={[
                      ['Thời điểm nhận hàng', formatDisplayDate(detail.ngay_nhan_hang)],
                      ['Thời điểm tiếp nhận', formatDisplayDate(detail.ngay_tiep_nhan_thuc_te)],
                      ['Trạng thái', 'Đã tiếp nhận kiện tại cửa hàng'],
                    ]}
                  />
                ) : (
                  <div className="w-empty-inline">
                    <Package size={24} />
                    <p>Chưa có biên bản tiếp nhận kiểm tra thực tế.</p>
                    {canReceiveReturn && statusVal === 'CHO_TIEP_NHAN' && (
                      <button
                        type="button"
                        className="w-shell-button w-shell-button--black"
                        style={{ marginTop: 12 }}
                        onClick={() => setShowTH007(true)}
                      >
                        TIẾP NHẬN KIỆN NGAY
                      </button>
                    )}
                  </div>
                )}
              </WarrantyPanel>
            )}

            {/* TAB 3: CHỨNG TỪ & HOÀN TIỀN */}
            {activeTab === 'HOAN_TIEN' && (
              <WarrantyPanel
                title="CHỨNG TỪ TIỀN & HOÀN TIỀN"
                note="Theo dõi các giao dịch và chứng từ phiếu chi hoàn tiền."
              >
                {detail.phieu_chi ? (
                  <WarrantyFields
                    fields={[
                      ['Mã phiếu chi', detail.phieu_chi.ma_phieu || `PC-${detail.phieu_chi.id}`],
                      ['Số tiền hoàn', money(detail.phieu_chi.so_tien)],
                      [
                        'Phương thức',
                        detail.phieu_chi.phuong_thuc_thanh_toan || detail.hinh_thuc_hoan_tien,
                      ],
                      ['Người nhận', detail.phieu_chi.ten_nguoi_nop_nhan || contactNameText],
                      ['Ngày ghi nhận', formatDisplayDate(detail.phieu_chi.ngay_ghi_nhan)],
                      ['Trạng thái phiếu chi', detail.phieu_chi.trang_thai || 'ĐÃ CHI'],
                    ]}
                  />
                ) : (
                  <div className="w-empty-inline">
                    <Wallet size={24} />
                    <p>Chưa có chứng từ hoàn tiền chính thức.</p>
                    {canRefundReturn && statusVal === 'DA_NHAN_HANG' && (
                      <button
                        type="button"
                        className="w-shell-button w-shell-button--red"
                        style={{ marginTop: 12 }}
                        onClick={openRefundModal}
                      >
                        <DollarSign size={14} /> GHI NHẬN HOÀN TIỀN
                      </button>
                    )}
                  </div>
                )}
              </WarrantyPanel>
            )}
          </main>

          {/* ASIDE COLUMN */}
          <aside>
            <WarrantyPanel title="KHÁCH HÀNG & ĐƠN GỐC">
              <div className="w-contact-card">
                <div>
                  <strong>{contactNameText}</strong>
                  <p>
                    <Phone size={14} />
                    {contactPhoneText}
                  </p>
                </div>
              </div>
              <WarrantyFields
                fields={[
                  ['Đơn mua hàng', orderCode],
                  ['Lý do trả', detail.ly_do_tra || '—'],
                ]}
              />
            </WarrantyPanel>

            <WarrantyPanel title="TỔNG HỢP NGHĨA VỤ">
              <div className="kth-aside-stat">
                <div className="kth-aside-stat-row">
                  <span>TRẠNG THÁI HIỆN TẠI</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`returns-status-badge returns-status-badge--${statusTone}`}>
                      {statusDisplay}
                    </span>
                  </div>
                </div>
                <div className="kth-aside-stat-row" style={{ marginTop: 12 }}>
                  <span>TỔNG TIỀN HOÀN</span>
                  <strong className="kth-aside-refund-hero">{money(refundAmount)}</strong>
                </div>
                <div className="kth-aside-stat-row" style={{ marginTop: 12 }}>
                  <span>HÌNH THỨC HOÀN</span>
                  <div>
                    <span
                      className={`kth-payment-pill kth-payment-pill--${detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN' ? 'bank' : 'cash'}`}
                    >
                      {detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN' ? 'Chuyển khoản' : 'Tiền mặt'}
                    </span>
                  </div>
                </div>
                <div className="kth-aside-stat-row" style={{ marginTop: 12 }}>
                  <span>NGÀY LẬP PHIẾU</span>
                  <strong className="kth-date-highlight">{formatDisplayDate(createdDate)}</strong>
                </div>
              </div>
            </WarrantyPanel>

            <WarrantyPanel title="THAO TÁC XỬ LÝ" className="kth-actions-panel">
              <div
                className="w-shell-actions"
                style={{ flexDirection: 'column', alignItems: 'stretch', margin: 0, gap: 8 }}
              >
                {canReceiveReturn && statusVal === 'CHO_TIEP_NHAN' && (
                  <button
                    type="button"
                    className={`w-shell-button w-full-width ${showTH007 ? 'w-shell-button--red' : 'w-shell-button--black'}`}
                    onClick={() => setShowTH007((prev) => !prev)}
                  >
                    <Package size={14} />
                    {showTH007 ? 'Đóng form tiếp nhận' : 'Tiếp nhận kiện'}
                  </button>
                )}
                {canRefundReturn && statusVal === 'DA_NHAN_HANG' && !detail.phieu_chi && (
                  <button
                    type="button"
                    className="w-shell-button w-shell-button--red w-full-width"
                    onClick={openRefundModal}
                  >
                    <DollarSign size={14} /> Hoàn tiền cho khách
                  </button>
                )}
                <button
                  type="button"
                  className="w-shell-button w-full-width"
                  onClick={() => navigate(LIST_ROUTE)}
                >
                  <ArrowLeft size={14} /> Về danh sách phiếu
                </button>
              </div>
            </WarrantyPanel>
          </aside>
        </div>

        {/* OVERVIEW SUMMARY STRIP (đẩy xuống dưới bảng) */}
        <div className="w-detail-overview" style={{ marginTop: 24, padding: 0 }}>
          <div className="w-summary-strip kth-overview-strip">
            <div className="kth-summary-status-cell">
              <span>TRẠNG THÁI HIỆN TẠI</span>
              <div style={{ marginTop: '6px' }}>
                <span
                  className={`returns-status-badge returns-status-badge--${statusTone} kth-overview-status-badge`}
                >
                  {statusDisplay}
                </span>
              </div>
            </div>
            <div>
              <span>NGÀY TẠO PHIẾU</span>
              <strong className="kth-date-highlight">{formatDisplayDate(createdDate)}</strong>
            </div>
            <div>
              <span>HÌNH THỨC HOÀN TIỀN</span>
              <div style={{ marginTop: '6px' }}>
                <span
                  className={`kth-payment-pill kth-payment-pill--${detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN' ? 'bank' : 'cash'}`}
                >
                  {detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN' ? 'Chuyển khoản' : 'Tiền mặt'}
                </span>
              </div>
            </div>
            <div>
              <span>TỔNG TIỀN HOÀN</span>
              <strong className="kth-refund-hero-amount">{money(refundAmount)}</strong>
            </div>
          </div>
        </div>
      </div>
      {/* MODAL XÁC NHẬN HOÀN TIỀN (Thay thế window.confirm mặc định) */}
      {canRefundReturn && showRefundModal && (
        <div
          className="returns-modal-backdrop"
          onClick={() => !isRefunding && setShowRefundModal(false)}
        >
          <div className="returns-modal kth-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="returns-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className="form-card__accent"
                  style={{ height: 18, width: 4, background: '#e11d48', display: 'inline-block' }}
                />
                <h2>XÁC NHẬN HOÀN TIỀN CHO KHÁCH</h2>
              </div>
              <button
                type="button"
                className="returns-modal__close-btn"
                disabled={isRefunding}
                onClick={() => setShowRefundModal(false)}
              >
                ĐÓNG
              </button>
            </div>

            <div className="returns-modal__body kth-confirm-modal-body">
              <div className="kth-refund-modal-hero">
                <span className="kth-refund-modal-label">SỐ TIỀN HOÀN TRẢ</span>
                <strong className="kth-refund-modal-amount">{money(refundAmount)}</strong>
              </div>

              <div className="kth-refund-modal-details">
                <div className="kth-modal-row">
                  <span>Mã phiếu hoàn:</span>
                  <strong className="kth-code-pill kth-code-pill--ticket">{ticketCode}</strong>
                </div>
                <div className="kth-modal-row">
                  <span>Đơn mua hàng gốc:</span>
                  <strong className="kth-code-pill kth-code-pill--order">{orderCode}</strong>
                </div>
                <div className="kth-modal-row">
                  <span>Khách hàng:</span>
                  <strong>
                    {contactNameText} ({contactPhoneText})
                  </strong>
                </div>
                <div className="kth-modal-row">
                  <span>Hình thức hoàn:</span>
                  <span
                    className={`kth-payment-pill kth-payment-pill--${detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN' ? 'bank' : 'cash'}`}
                  >
                    {detail.hinh_thuc_hoan_tien === 'CHUYEN_KHOAN' ? 'Chuyển khoản' : 'Tiền mặt'}
                  </span>
                </div>
              </div>

              <div className="kth-refund-modal-notice">
                <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Thao tác này sẽ ghi nhận hoàn tất chi tiền cho khách, cập nhật phiếu sang trạng
                  thái <strong>ĐÃ HOÀN TIỀN</strong> và lập chứng từ chi liên quan.
                </span>
              </div>

              {refundError && (
                <div className="w-shell-error" style={{ marginTop: 12 }}>
                  {refundError}
                </div>
              )}
            </div>

            <div className="returns-modal__footer">
              <button
                type="button"
                className="w-shell-button"
                disabled={isRefunding}
                onClick={() => setShowRefundModal(false)}
              >
                HỦY
              </button>
              <button
                type="button"
                className="w-shell-button w-shell-button--red"
                disabled={isRefunding}
                onClick={handleConfirmRefund}
              >
                {isRefunding ? 'ĐANG XỬ LÝ...' : `XÁC NHẬN HOÀN ${money(refundAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CANCEL RECEIPT CONFIRMATION MODAL */}
      {canCancelReturn && showCancelModal && (
        <div
          className="returns-modal-backdrop"
          onClick={() => !isCancelling && setShowCancelModal(false)}
        >
          <div className="returns-modal kth-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="returns-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className="form-card__accent"
                  style={{ height: 18, width: 4, background: '#e11d48', display: 'inline-block' }}
                />
                <h2>HỦY TIẾP NHẬN PHIẾU TRẢ HÀNG</h2>
              </div>
              <button
                type="button"
                className="returns-modal__close-btn"
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
              >
                ĐÓNG
              </button>
            </div>

            <div className="returns-modal__body kth-confirm-modal-body">
              <div className="kth-refund-modal-details">
                <div className="kth-modal-row">
                  <span>Mã phiếu:</span>
                  <strong className="kth-code-pill kth-code-pill--ticket">{ticketCode}</strong>
                </div>
                {orderCode && (
                  <div className="kth-modal-row">
                    <span>Đơn mua hàng gốc:</span>
                    <strong className="kth-code-pill kth-code-pill--order">{orderCode}</strong>
                  </div>
                )}
                <div className="kth-modal-row">
                  <span>Khách hàng:</span>
                  <strong>
                    {contactNameText} {contactPhoneText ? `(${contactPhoneText})` : ''}
                  </strong>
                </div>
              </div>

              <div
                className="kth-refund-modal-notice"
                style={{ background: '#fff1f2', borderColor: '#fecdd3' }}
              >
                <AlertTriangle size={18} color="#e11d48" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: '#9f1239' }}>
                  Thao tác này sẽ hủy tiếp nhận yêu cầu trả hàng và chuyển trạng thái phiếu sang{' '}
                  <strong>HỦY TIẾP NHẬN</strong>.
                </span>
              </div>

              <div style={{ marginTop: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 800,
                    marginBottom: 6,
                    color: '#111',
                    textTransform: 'uppercase',
                  }}
                >
                  LÝ DO HỦY TIẾP NHẬN <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 2,
                    fontSize: 12,
                    resize: 'vertical',
                  }}
                  placeholder="Nhập lý do hủy tiếp nhận..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={isCancelling}
                />
              </div>

              {cancelError && (
                <div className="w-shell-error" style={{ marginTop: 12 }}>
                  {cancelError}
                </div>
              )}
            </div>

            <div className="returns-modal__footer">
              <button
                type="button"
                className="w-shell-button"
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
              >
                BỎ QUA
              </button>
              <button
                type="button"
                className="w-shell-button w-shell-button--red"
                disabled={isCancelling || !cancelReason.trim()}
                onClick={handleCancelReceipt}
              >
                {isCancelling ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN HỦY TIẾP NHẬN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
}
