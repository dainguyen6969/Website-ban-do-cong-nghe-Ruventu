// Admin customer returns screen: KhachTraHang (UC-027 TH001-TH012)
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  HiOutlineSearch,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from 'react-icons/hi';
import useOrders from '../../../../context/useOrders';
import { subscribeToAdminSlice } from '../../../../sync/adminSync';
import {
  CUSTOMER_RETURNS_SYNC_SLICE,
  RETURN_STATUS,
  createReturnId,
  readCustomerReturns,
  returnTotals,
  saveCustomerReturns,
  matchesReturnStatus,
} from '../../../../data/customerReturns';
import {
  PROTOTYPE_RETURNS,
  PROTOTYPE_ELIGIBLE_ORDERS,
  UC027_SCENARIOS,
} from '../../../../data/customerReturnsPrototype';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import './KhachTraHang.css';

const LIST_ROUTE = '/admin/don-hang/khach-tra-hang';
const ORDER_DETAIL_ROUTE = '/admin/don-hang/danh-sach-don-hang';
const STATUS_FILTER_OPTIONS = [
  'Tất cả trạng thái',
  'CHỜ TIẾP NHẬN',
  'ĐÃ NHẬN HÀNG',
  'ĐÃ HOÀN TIỀN - NHẬN CŨ',
  'ĐÃ HOÀN TIỀN',
];

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))}đ`;
const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

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
  const { orders } = useOrders();
  const { orderId, returnId } = useParams();
  const [returns, setReturns] = useState(() => readCustomerReturns(orders));

  useEffect(() => {
    return subscribeToAdminSlice(CUSTOMER_RETURNS_SYNC_SLICE, () => {
      setReturns(readCustomerReturns(orders));
    });
  }, [orders]);

  const updateReturns = (next, action, entityId) => {
    setReturns(next);
    saveCustomerReturns(next, action, entityId);
  };

  if (orderId) {
    return (
      <CreateReturn
        orderId={orderId}
        orders={orders}
        returns={returns}
        updateReturns={updateReturns}
      />
    );
  }

  if (returnId) {
    return (
      <ReturnDetail
        returnId={returnId}
        orders={orders}
        returns={returns}
        updateReturns={updateReturns}
      />
    );
  }

  return <ReturnList orders={orders} returns={returns} updateReturns={updateReturns} />;
}

/* ==========================================================================
   View 1: Danh sách khách trả hàng (Image 1)
   ========================================================================== */
function ReturnList({ returns }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(() => params.get('trang_thai_tra_hang') || STATUS_FILTER_OPTIONS[0]);
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

  // Combine prototype and local records
  const allReturns = useMemo(() => {
    const records = returns && returns.length > 0 ? returns : PROTOTYPE_RETURNS;
    return records;
  }, [returns]);

  // Filtering
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return allReturns.filter((record) => {
      // Text search
      const matchesText =
        !term ||
        [
          record.id,
          record.orderId,
          record.khachHang,
          record.soDienThoai,
          record.tenNguoiLienHe,
          record.sdtNguoiLienHe,
        ].some((val) => normalize(val || '').includes(term));

      // Status filter
      let matchesStatus = true;
      if (status && status !== STATUS_FILTER_OPTIONS[0]) {
        if (status === 'CHỜ TIẾP NHẬN') matchesStatus = record.trangThai === 'CHO_TIEP_NHAN';
        else if (status === 'ĐÃ NHẬN HÀNG') matchesStatus = record.trangThai === 'DA_NHAN_HANG';
        else if (status === 'ĐÃ HOÀN TIỀN - NHẬN CŨ') matchesStatus = record.trangThai === 'DA_HOAN_TIEN_CU';
        else if (status === 'ĐÃ HOÀN TIỀN')
          matchesStatus = record.trangThai === 'DA_HOAN_TIEN' || record.trangThai === 'DA_HOAN_TIEN_CU';
        else matchesStatus = matchesReturnStatus(record, status);
      }

      // Date range filter
      let matchesDate = true;
      if (dateFrom) {
        const fromTime = new Date(dateFrom).getTime();
        const recordTime = new Date(record.createdAt).getTime();
        if (!isNaN(fromTime) && !isNaN(recordTime) && recordTime < fromTime) {
          matchesDate = false;
        }
      }
      if (dateTo) {
        const toDateObj = new Date(dateTo);
        toDateObj.setHours(23, 59, 59, 999);
        const toTime = toDateObj.getTime();
        const recordTime = new Date(record.createdAt).getTime();
        if (!isNaN(toTime) && !isNaN(recordTime) && recordTime > toTime) {
          matchesDate = false;
        }
      }

      return matchesText && matchesStatus && matchesDate;
    });
  }, [allReturns, query, status, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetFilters = () => {
    setQuery('');
    setStatus(STATUS_FILTER_OPTIONS[0]);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="returns-page">
      {/* Toast Notification */}
      {toast && (
        <div className="returns-toast" role="status">
          <HiOutlineCheck style={{ fontSize: 16 }} />
          <span>{toast}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="returns-hero">
        <div className="returns-hero__info">
          <div className="returns-hero__breadcrumb">ĐƠN HÀNG / KHÁCH TRẢ HÀNG</div>
          <h1>KHÁCH TRẢ HÀNG</h1>
          <p>Theo dõi phiếu, người liên hệ và quyền trả theo UC-027.</p>
        </div>
        <button
          className="return-btn return-btn--red"
          onClick={() => setSelecting(true)}
          id="btn-create-return-voucher"
        >
          + LẬP PHIẾU TRẢ HÀNG
        </button>
      </section>

      {/* Prototype Banner */}
      <div className="returns-proto-banner">
        <strong>PROTOTYPE TH001—TH005:</strong> Không lưu lên backend. Nhãn hoàn tiền cũ không được
        suy ra HOÀN TẤT. Nhận kho và giao dịch tiền là nghiệp vụ riêng.
      </div>

      {/* Filter Toolbar */}
      <div className="returns-toolbar-wrap">
        <div className="returns-toolbar">
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

          {/* Status filter dropdown */}
          <div className="returns-status-dropdown-wrap">
            <FilterDropdown
              options={STATUS_FILTER_OPTIONS}
              value={status}
              onSelect={(val) => {
                setStatus(val);
                setPage(1);
              }}
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

          {/* Clear filters button */}
          <button className="returns-reset-btn" onClick={resetFilters}>
            XÓA BỘ LỌC
          </button>
        </div>
        <div className="returns-subnote">
          Khoảng ngày gửi TH001 dưới dạng ISO-8601 có múi giờ +07:00.
        </div>
      </div>

      {/* Table Section */}
      <section className="returns-list-card">
        <div className="returns-table-scroll">
          <table className="returns-table">
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
              {visible.length > 0 ? (
                visible.map((record) => {
                  const contactName = record.khachHang || record.tenNguoiLienHe;
                  const contactPhone = record.soDienThoai || record.sdtNguoiLienHe;
                  const refundAmount = record.tongTienHoan != null ? record.tongTienHoan : returnTotals(record).amount;
                  const isOldRefund = record.trangThai === 'DA_HOAN_TIEN_CU';

                  let statusText = 'CHỜ TIẾP NHẬN';
                  if (record.trangThai === 'DA_NHAN_HANG') statusText = 'ĐÃ NHẬN HÀNG';
                  else if (record.trangThai === 'DA_HOAN_TIEN') statusText = 'ĐÃ HOÀN TIỀN';
                  else if (isOldRefund) statusText = 'ĐÃ HOÀN TIỀN - NHẬN CŨ';

                  return (
                    <tr key={record.id}>
                      <td>
                        <span className="returns-code">{record.id}</span>
                      </td>
                      <td>
                        <span className="returns-code">{record.orderId}</span>
                      </td>
                      <td>
                        {contactName ? (
                          contactName
                        ) : (
                          <span className="returns-muted">Chưa có bản chụp người liên hệ</span>
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
                          <span className="returns-status-label">{statusText}</span>
                          {(isOldRefund || record.subNote) && (
                            <span className="returns-status-note">
                              {record.subNote || 'Cần xác minh sự kiện; chưa quy đổi sang trạng thái phiếu mới.'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{record.displayDate || formatDisplayDate(record.createdAt)}</td>
                      <td>
                        <button
                          className="returns-action-btn"
                          onClick={() => navigate(`${LIST_ROUTE}/${record.rawId || record.id}`)}
                        >
                          XEM CHI TIẾT
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="returns-empty" style={{ textAlign: 'center', padding: 40 }}>
                    Không có phiếu trả hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="returns-pagination-bar">
          <div>
            {filtered.length} phiếu · Trang {safePage}/{totalPages}
          </div>
          <div className="returns-pagination-right">
            <div className="returns-pagesize-dropdown-wrap">
              <FilterDropdown
                options={[
                  { value: '10', label: '10 / trang' },
                  { value: '20', label: '20 / trang' },
                  { value: '50', label: '50 / trang' },
                ]}
                value={String(pageSize)}
                onSelect={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
                selectedDark={false}
                direction="up"
                aria-label="Số dòng mỗi trang"
              />
            </div>
            <button
              className="returns-page-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              TRƯỚC
            </button>
            <button
              className="returns-page-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              SAU
            </button>
          </div>
        </div>
      </section>

      {/* Modal: CHỌN ĐƠN HÀNG CẦN TRẢ (TH002) */}
      {selecting && (
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
   View 2: Modal Chọn Đơn Hàng Cần Trả (TH002 - Image 2)
   ========================================================================== */
function SelectOrderModal({ onClose, onSelect }) {
  const [modalQuery, setModalQuery] = useState('');
  const [modalPage, setModalPage] = useState(1);
  const MODAL_PAGE_SIZE = 6;

  useEscape(onClose);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    const term = normalize(modalQuery.trim());
    if (!term) return PROTOTYPE_ELIGIBLE_ORDERS;
    return PROTOTYPE_ELIGIBLE_ORDERS.filter((order) => {
      return (
        normalize(order.maDonHang || order.id).includes(term) ||
        normalize(order.khachHang).includes(term) ||
        normalize(order.soDienThoai).includes(term) ||
        normalize(order.loai).includes(term)
      );
    });
  }, [modalQuery]);

  const totalModalPages = Math.max(1, Math.ceil(filteredOrders.length / MODAL_PAGE_SIZE));
  const safeModalPage = Math.min(modalPage, totalModalPages);
  const visibleOrders = filteredOrders.slice(
    (safeModalPage - 1) * MODAL_PAGE_SIZE,
    safeModalPage * MODAL_PAGE_SIZE
  );

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

          {/* Notice box */}
          <div className="returns-modal-notice">
            <p>
              TH002 chỉ tra cứu sơ bộ đơn HOÀN THÀNH, ĐÃ THANH TOÁN, ĐÃ XUẤT KHO. Quyền trả phải
              được kiểm tra lại qua TH003, tính thử TH004 và khi tạo TH005.
            </p>
            <p>
              Các dòng TH003-MẪU / TH004-MẪU là DTO minh họa riêng của Return, không phải đơn thật
              trong Order. Mã theo dõi DEMO không được gán cho thiết bị thật.
            </p>
          </div>

          {/* Table */}
          <div className="returns-modal-table-wrap">
            <table className="returns-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN / LOẠI</th>
                  <th>KHÁCH / LIÊN HỆ</th>
                  <th>SỐ ĐIỆN THOẠI</th>
                  <th>HOÀN THÀNH</th>
                  <th>ĐIỀU KIỆN SƠ BỘ</th>
                  <th>QUY TẮC TRẢ</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.length > 0 ? (
                  visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="returns-code">{order.maDonHang || order.id}</span>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>{order.loai}</span>
                        </div>
                      </td>
                      <td>{order.khachHang}</td>
                      <td>
                        <span className={order.soDienThoai === 'Nhập khi lập phiếu' ? 'returns-muted' : ''}>
                          {order.soDienThoai}
                        </span>
                      </td>
                      <td>{order.hoanThanh}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700 }}>{order.dieuKienSoBo}</span>
                          <span style={{ fontSize: 10, color: '#6b7280' }}>{order.dieuKienSub}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: order.quyTacTra === 'CHỈ TRẢ TOÀN BỘ' ? 800 : 500 }}>
                          {order.quyTacTra}
                        </span>
                      </td>
                      <td>
                        <button
                          className="returns-select-order-btn"
                          onClick={() => onSelect(order.id)}
                        >
                          CHỌN TRẢ
                          <br />
                          HÀNG
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>
                      Không tìm thấy đơn hàng phù hợp.
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
            {filteredOrders.length} đơn · Trang {safeModalPage}/{totalModalPages}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="returns-page-btn"
              disabled={safeModalPage <= 1}
              onClick={() => setModalPage((p) => Math.max(1, p - 1))}
            >
              TRƯỚC
            </button>
            <button
              className="returns-page-btn"
              disabled={safeModalPage >= totalModalPages}
              onClick={() => setModalPage((p) => Math.min(totalModalPages, p + 1))}
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
   View 3: Lập phiếu trả hàng (TH003 - TH005 - Image 3 & Image 4)
   ========================================================================== */
function CreateReturn({ orderId, returns, updateReturns }) {
  const navigate = useNavigate();

  // Find order in prototype list or construct fallback
  const orderData = useMemo(() => {
    const found = PROTOTYPE_ELIGIBLE_ORDERS.find(
      (o) => o.id === orderId || String(o.numericId) === orderId || o.maDonHang === orderId
    );
    if (found) return found;
    // Default to ORD-POS-001 pattern if not explicitly found
    const defaultOrder = PROTOTYPE_ELIGIBLE_ORDERS[0];
    return {
      ...defaultOrder,
      id: orderId,
      maDonHang: orderId,
    };
  }, [orderId]);

  // Section 02 selected lines state
  const [selectedLines, setSelectedLines] = useState(() => ({}));

  // Section 03 form inputs
  const [contactName, setContactName] = useState(
    orderData.khachHang && orderData.khachHang !== 'Khách vãng lai' ? orderData.khachHang : ''
  );
  const [contactPhone, setContactPhone] = useState(
    orderData.soDienThoai && orderData.soDienThoai !== 'Nhập khi lập phiếu'
      ? orderData.soDienThoai
      : ''
  );
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('TIEN_MAT');

  // Section 04 preview calculation state (TH004)
  const [previewResult, setPreviewResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Toggle selection for a line item
  const handleToggleLine = (item) => {
    setSelectedLines((prev) => {
      const next = { ...prev };
      if (next[item.lineItemRef]) {
        delete next[item.lineItemRef];
      } else {
        next[item.lineItemRef] = 1; // Default 1
      }
      return next;
    });
    setPreviewResult(null);
  };

  const handleQuantityChange = (item, val) => {
    const num = Math.max(1, Math.min(item.maxQty || 1, Number(val) || 1));
    setSelectedLines((prev) => ({
      ...prev,
      [item.lineItemRef]: num,
    }));
    setPreviewResult(null);
  };

  const selectedEntries = Object.entries(selectedLines);
  const numSelectedLines = selectedEntries.length;
  const numSelectedUnits = selectedEntries.reduce((sum, [, qty]) => sum + Number(qty || 0), 0);

  // TH004: Preview calculation
  const handleCalculatePreview = async () => {
    if (numSelectedLines === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm cần trả trước khi tính thử.');
      return;
    }

    setIsCalculating(true);
    try {
      const linesData = orderData.items
        .filter((it) => selectedLines[it.lineItemRef])
        .map((it) => {
          const qty = selectedLines[it.lineItemRef];
          const unitPrice = it.donGiaDuKien || it.thanhToanDongGoc;
          return {
            lineItemRef: it.lineItemRef,
            tenSanPham: it.tenSanPham,
            phienBan: it.phienBan,
            soLuong: qty,
            donGiaHoan: unitPrice,
            thanhTienHoan: qty * unitPrice,
            dieuChinhLamTron: 0,
          };
        });

      const totalRefund = linesData.reduce((sum, it) => sum + it.thanhTienHoan, 0);
      await new Promise((r) => setTimeout(r, 200));

      setPreviewResult({
        isValid: true,
        lines: linesData,
        tongTienHoan: totalRefund,
        dieuChinhLamTron: 0,
        daGiuQuyenTra: false,
        canKiemTraLaiKhiTao: true,
      });
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReloadTH003 = () => {
    setPreviewResult(null);
    alert('Đã tải lại thông tin quyền trả TH003 (giữ nguyên dữ liệu bạn đang nhập).');
  };

  // TH005: Create Return Voucher
  const handleCreateReturn = async () => {
    setAttemptedSubmit(true);
    setSubmitError('');

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
      setSubmitError('Vui lòng nhấn [TÍNH THỬ TH004] để xác nhận số tiền hoàn trước khi tạo phiếu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = createReturnId(returns);
      const nowIso = new Date().toISOString();

      const newRecord = {
        rawId: Date.now(),
        id: newId,
        orderId: orderData.maDonHang || orderData.id,
        khachHang: contactName.trim(),
        tenNguoiLienHe: contactName.trim(),
        soDienThoai: contactPhone.trim(),
        sdtNguoiLienHe: contactPhone.trim(),
        tongTienHoan: previewResult.tongTienHoan,
        trangThai: RETURN_STATUS.WAITING,
        createdAt: nowIso,
        displayDate: formatDisplayDate(nowIso),
        hinhThucHoanTienDuKien: refundMethod === 'CHUYEN_KHOAN' ? 'Chuyển khoản' : 'Tiền mặt',
        hinhThucHoanTien: refundMethod,
        lyDoTra: reason.trim(),
        ghiChu: notes.trim(),
        lineItems: previewResult.lines.map((ln) => ({
          lineItemRef: ln.lineItemRef,
          sanPham: ln.tenSanPham,
          phienBan: ln.phienBan,
          slTra: ln.soLuong,
          donGiaHoan: ln.donGiaHoan,
          thanhTienHoan: ln.thanhTienHoan,
          dongGoc: ln.lineItemRef,
          vatPhamVatLy: `${ln.soLuong} đơn vị: đối chiếu với danh sách hiện hành`,
          vatPhamVatLyNote: 'Chưa có định danh / snapshot hiện hành.',
          tienHoanNote: `Đơn giá: ${money(ln.donGiaHoan)}`,
          serials: [],
        })),
      };

      const updatedList = [newRecord, ...(returns || [])];
      updateReturns(updatedList, 'created', newId);

      navigate(LIST_ROUTE, {
        state: { toast: `Đã tạo phiếu trả hàng ${newId} thành công` },
      });
    } catch (err) {
      setSubmitError(err?.message || 'Không thể tạo phiếu trả hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="returns-page">
      {/* Hero Header */}
      <section className="returns-hero">
        <div className="returns-hero__info">
          <div className="returns-hero__breadcrumb">ĐƠN HÀNG / KHÁCH TRẢ HÀNG / LẬP PHIẾU</div>
          <h1>LẬP PHIẾU TRẢ HÀNG</h1>
          <div className="returns-hero__order-id">{orderData.maDonHang || orderData.id}</div>
        </div>
        <button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}>
          QUAY LẠI DANH SÁCH
        </button>
      </section>

      {/* Prototype Banner */}
      <div className="returns-proto-banner">
        <strong>PROTOTYPE TH003—TH005 ·</strong> Tính thử chỉ đọc: tạo phiếu chỉ giữ quyền trả trong
        dữ liệu cục bộ. Không nhập kho, không tạo giao dịch tiền hoặc ghi backend.
      </div>

      {submitError && (
        <div style={{ margin: '16px 32px 0' }} className="return-warning-callout">
          {submitError}
        </div>
      )}

      {/* Form Container */}
      <div className="returns-create-container">
        {/* 01 / ĐƠN HÀNG GỐC */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>01 / ĐƠN HÀNG GỐC</h2>
            <button className="return-btn return-btn--outline" onClick={handleReloadTH003}>
              TẢI LẠI TH003 — GIỮ BẢN NHÁP
            </button>
          </div>
          <div className="return-section-box__body">
            <div className="return-order-info-grid">
              <div className="return-order-info-item">
                <dt>MÃ ĐƠN</dt>
                <dd>{orderData.maDonHang || orderData.id}</dd>
              </div>
              <div className="return-order-info-item">
                <dt>NGƯỜI LIÊN HỆ GỐC</dt>
                <dd>{orderData.nguoiLienHeGoc || 'Khách lẻ / cần bổ sung liên hệ'}</dd>
              </div>
              <div className="return-order-info-item">
                <dt>QUYỀN TRẢ TỪ TH003</dt>
                <dd
                  className={
                    orderData.quyenTraStatus === 'ĐỦ ĐIỀU KIỆN LẬP PHIẾU'
                      ? 'status-ok'
                      : 'status-blocked'
                  }
                >
                  {orderData.quyenTraStatus || 'CHƯA ĐỦ ĐIỀU KIỆN LẬP PHIẾU'}
                </dd>
              </div>
            </div>

            {orderData.canhBaoGoc && (
              <div className="return-warning-callout">
                | {orderData.canhBaoGoc}
              </div>
            )}
          </div>
        </section>

        {/* 02 / CHỌN HÀNG CẦN TRẢ */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>02 / CHỌN HÀNG CẦN TRẢ</h2>
          </div>
          <div className="return-section-box__body">
            <p className="return-section-subtitle">
              Chọn dòng và nhập số lượng. Mỗi dòng cần được xác minh quyền trả và thiết bị hiện hành.
            </p>

            <div className="returns-table-scroll" style={{ border: 'none' }}>
              <table className="return-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>CHỌN / SỐ LƯỢNG TRẢ</th>
                    <th style={{ minWidth: 260 }}>SẢN PHẨM / PHIÊN BẢN</th>
                    <th style={{ width: 170 }}>QUYỀN TRẢ</th>
                    <th style={{ minWidth: 200 }}>THIẾT BỊ HIỆN HÀNH / GIAO HÀNG</th>
                    <th style={{ width: 140 }}>THANH TOÁN DÒNG GỐC</th>
                    <th style={{ width: 220 }}>THÔNG TIN HOÀN DỰ KIẾN</th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.items && orderData.items.length > 0 ? (
                    orderData.items.map((item) => {
                      const isChecked = Boolean(selectedLines[item.lineItemRef]);
                      const currentQty = selectedLines[item.lineItemRef] || 1;

                      return (
                        <tr key={item.lineItemRef} className={isChecked ? 'is-selected' : ''}>
                          <td>
                            <div className="return-pick-col">
                              <label className="return-pick-checkbox">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleLine(item)}
                                />
                                <span>Chọn trả</span>
                              </label>
                              <input
                                type="number"
                                className="return-qty-input"
                                min={1}
                                max={item.maxQty || 1}
                                value={currentQty}
                                disabled={!isChecked}
                                onChange={(e) => handleQuantityChange(item, e.target.value)}
                              />
                            </div>
                          </td>

                          <td>
                            <div className="return-prod-name">{item.tenSanPham}</div>
                            <div className="return-prod-variant">{item.phienBan}</div>
                            <div className="return-prod-origin-ref">
                              <span className="return-prod-origin-label">DÒNG BÁN GỐC</span>
                              <span className="return-prod-ref-code">{item.dongBanGoc}</span>
                            </div>
                            {item.canhBao &&
                              item.canhBao.map((warn, wIdx) => (
                                <div key={wIdx} className="return-bullet-callout">
                                  | {warn}
                                </div>
                              ))}
                          </td>

                          <td>
                            <div className="return-quyen-tra-list">
                              <span>
                                Đã mua: <strong>{item.quyenTra.daMua}</strong>
                              </span>
                              <span>
                                Đã giao: <strong>{item.quyenTra.daGiao}</strong>
                              </span>
                              <span>
                                Đã yêu cầu: <strong>{item.quyenTra.daYeuCau}</strong>
                              </span>
                              <span>
                                Còn được trả: <strong>{item.quyenTra.conDuocTra}</strong>
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="return-device-info">{item.thietBiHienHanh}</div>
                          </td>

                          <td>
                            <div className="return-orig-payment">
                              {money(item.thanhToanDongGoc)}
                            </div>
                          </td>

                          <td>
                            <div className="return-refund-info">
                              <div>
                                Đơn giá dự kiến: <strong>{money(item.donGiaDuKien)}</strong>
                              </div>
                              <div>
                                Còn được hoàn: <strong>{money(item.conDuocHoan)}</strong>
                              </div>
                              <div className="return-refund-note">
                                Chỉ thông tin TH003. Thành tiền xác nhận phải đọc kết quả TH004, kể
                                cả điều chỉnh làm tròn.
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>
                        Đơn hàng không có dòng sản phẩm nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 03 / THÔNG TIN YÊU CẦU */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>03 / THÔNG TIN YÊU CẦU</h2>
          </div>
          <div className="return-section-box__body">
            <div className="return-form-grid">
              <div className="return-form-field">
                <label>TÊN NGƯỜI LIÊN HỆ *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nhập tên người liên hệ..."
                />
                {attemptedSubmit && !contactName.trim() && (
                  <span style={{ color: '#d32f2f', fontSize: 11, fontWeight: 700 }}>
                    Vui lòng nhập tên người liên hệ.
                  </span>
                )}
              </div>

              <div className="return-form-field">
                <label>SỐ ĐIỆN THOẠI *</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                />
                {attemptedSubmit && !contactPhone.trim() && (
                  <span style={{ color: '#d32f2f', fontSize: 11, fontWeight: 700 }}>
                    Vui lòng nhập số điện thoại người liên hệ.
                  </span>
                )}
              </div>

              <div className="return-form-field">
                <label>LÝ DO TRẢ HÀNG *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do trả hàng..."
                />
                {attemptedSubmit && !reason.trim() && (
                  <span style={{ color: '#d32f2f', fontSize: 11, fontWeight: 700 }}>
                    Vui lòng nhập lý do trả hàng.
                  </span>
                )}
              </div>

              <div className="return-form-field">
                <label>GHI CHÚ</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm (tùy chọn)..."
                />
              </div>

              <div className="return-form-field">
                <label>HÌNH THỨC HOÀN TIỀN</label>
                <FilterDropdown
                  options={[
                    { value: 'TIEN_MAT', label: 'TIỀN MẶT' },
                    { value: 'CHUYEN_KHOAN', label: 'CHUYỂN KHOẢN' },
                  ]}
                  value={refundMethod}
                  onSelect={(val) => setRefundMethod(val)}
                  selectedDark={false}
                  aria-label="Hình thức hoàn tiền"
                />
              </div>
            </div>

            <div className="return-form-note">
              Khách hàng ID rỗng vẫn hợp lệ. Tên và số điện thoại liên hệ được lưu thành bản chụp của
              phiếu; chọn hình thức hoàn không có nghĩa đã hoàn tiền.
            </div>
          </div>
        </section>

        {/* 04 / TÍNH THỬ & XÁC NHẬN (TH004) */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>04 / TÍNH THỬ & XÁC NHẬN</h2>
            <button
              className="return-btn return-btn--outline"
              onClick={handleCalculatePreview}
              disabled={isCalculating || numSelectedLines === 0}
            >
              {isCalculating ? 'ĐANG TÍNH THỬ...' : 'TÍNH THỬ TH004'}
            </button>
          </div>
          <div className="return-section-box__body">
            <div className="return-preview-summary-text">
              {numSelectedLines} dòng đã chọn · {numSelectedUnits} đơn vị cần trả. Tính thử không
              tạo phiếu và không giữ quyền trả, tồn kho hoặc sửa đơn.
            </div>

            <div className="return-preview-result-box">
              {!previewResult ? (
                <div className="return-preview-empty-text">
                  CHƯA CÓ KẾT QUẢ TÍNH THỬ HỢP LỆ. Không dùng giá danh mục × số lượng làm số tiền hoàn
                  xác nhận.
                </div>
              ) : (
                <div className="return-preview-success-box">
                  <div className="return-preview-header">
                    <span className="return-preview-status">
                      <HiOutlineCheck /> ĐÃ TÍNH THỬ HOÀN TIỀN TH004 HỢP LỆ
                    </span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      Hình thức dự kiến: {refundMethod === 'CHUYEN_KHOAN' ? 'Chuyển khoản' : 'Tiền mặt'}
                    </span>
                  </div>

                  <div className="return-preview-lines">
                    {previewResult.lines.map((ln) => (
                      <div key={ln.lineItemRef} className="return-preview-line-row">
                        <div>
                          <strong>{ln.tenSanPham}</strong> ({ln.phienBan}) × {ln.soLuong}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {money(ln.thanhTienHoan)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="return-preview-line-row">
                    <span>Điều chỉnh làm tròn</span>
                    <span>{money(previewResult.dieuChinhLamTron || 0)}</span>
                  </div>

                  <div className="return-preview-total-row">
                    <strong>TỔNG TIỀN HOÀN XÁC NHẬN (TH004):</strong>
                    <strong>{money(previewResult.tongTienHoan)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="return-create-actions">
          <button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}>
            HỦY
          </button>
          <button
            className="return-btn return-btn--red"
            onClick={handleCreateReturn}
            disabled={isSubmitting}
            id="btn-submit-return-voucher"
          >
            {isSubmitting ? 'ĐANG TẠO...' : 'TẠO PHIẾU TRẢ HÀNG'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   View 4: Chi tiết phiếu trả hàng (TH006 - TH012)
   Matching Images 1, 2, 3, 4, 5
   ========================================================================== */
function ReturnDetail({ returnId, returns, updateReturns }) {
  const navigate = useNavigate();

  const record = useMemo(() => {
    const list = returns && returns.length > 0 ? returns : PROTOTYPE_RETURNS;
    return list.find(
      (item) => String(item.id) === String(returnId) || String(item.rawId) === String(returnId)
    );
  }, [returnId, returns]);

  // State to toggle the TH007 section (triggered by the button in the red box!)
  const [showTH007, setShowTH007] = useState(false);

  // TH007 Form State
  const [th007ReceiptDate, setTh007ReceiptDate] = useState('11/03/2026 09:30:16 +07');
  const [th007Shipper, setTh007Shipper] = useState('');
  const [th007ReceivedChecked, setTh007ReceivedChecked] = useState(true);
  const [th007SelectedDevice, setTh007SelectedDevice] = useState('Chưa xác định — Để trống 0');
  const [th007Quantity, setTh007Quantity] = useState(1);
  const [th007AccessoryCount, setTh007AccessoryCount] = useState('Không có cáp nối tường, không nguyên seal');
  const [th007IdentifierSign, setTh007IdentifierSign] = useState('');
  const [th007Condition, setTh007Condition] = useState('');
  const [th007AccessoriesNote, setTh007AccessoriesNote] = useState('');
  const [th007InspectionResult, setTh007InspectionResult] = useState('');
  const [th007EvidenceUrls, setTh007EvidenceUrls] = useState('');

  // Accordion state for prototype scenarios
  const [scenariosOpen, setScenariosOpen] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState(UC027_SCENARIOS[0].code);
  const [scenarioConfirmed, setScenarioConfirmed] = useState(true);

  const [toast, setToast] = useState('');

  if (!record) {
    return (
      <div className="returns-page" style={{ padding: 40 }}>
        <h2>KHÔNG TÌM THẤY PHIẾU TRẢ HÀNG</h2>
        <p style={{ margin: '16px 0', color: '#6b7280' }}>
          Mã phiếu: <strong>{returnId}</strong> không tồn tại trong hệ thống.
        </p>
        <button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}>
          QUAY LẠI DANH SÁCH
        </button>
      </div>
    );
  }

  const totals = returnTotals(record);
  const contactNameText = record.khachHang || record.tenNguoiLienHe || 'Chưa có tên';
  const contactPhoneText = record.soDienThoai || record.sdtNguoiLienHe || 'Chưa có SĐT';

  // Handle reload TH006
  const handleReloadTH006 = () => {
    alert('Đã tải lại dữ liệu phiếu TH006 từ hệ thống.');
  };

  // Submit TH007 (Kiểm tra & tiếp nhận kiện)
  const handleSaveTH007 = () => {
    const updatedRecord = {
      ...record,
      th007Inspection: {
        receiptDate: th007ReceiptDate,
        shipper: th007Shipper,
        deviceReceived: th007SelectedDevice,
        quantity: th007Quantity,
        accessoryCount: th007AccessoryCount,
        identifier: th007IdentifierSign,
        condition: th007Condition,
        accessories: th007AccessoriesNote,
        inspectionResult: th007InspectionResult,
        evidence: th007EvidenceUrls,
      },
      custody: {
        location: 'Cửa hàng đang giữ kiện tiếp nhận (Custody)',
        hasInspection: true,
      },
    };

    const nextList = (returns || PROTOTYPE_RETURNS).map((it) =>
      it.id === record.id ? updatedRecord : it
    );
    updateReturns(nextList, 'th007_received', record.id);
    setShowTH007(false);
    setToast(`Đã ghi nhận tiếp nhận kiện TH007 cho phiếu ${record.id}`);
  };

  // Switch prototype scenario from bottom accordion
  const handleApplyScenario = () => {
    if (!scenarioConfirmed) {
      alert('Vui lòng tích xác nhận hiểu điều kiện mô phỏng.');
      return;
    }
    const found = UC027_SCENARIOS.find((s) => s.code === selectedScenario);
    if (found?.ticketId) {
      navigate(`${LIST_ROUTE}/${found.ticketId}`);
    } else {
      alert(`Đã chuẩn bị tình huống: ${selectedScenario}`);
    }
  };

  const firstItem = record.lineItems?.[0] || {
    sanPham: 'Webcam Logitech C920',
    phienBan: '1080p',
    dongGoc: 'ctth-004',
    slTra: 1,
    donGiaHoan: 1480000,
    thanhTienHoan: 1480000,
    vatPhamVatLy: '1 đơn vị: đối chiếu với danh sách hiện hành',
    vatPhamVatLyNote: 'Chưa có định danh / snapshot hiện hành. Chỉ ghi kiểm tra để xác minh; không tự tạo thiết bị.',
    tienHoanNote: 'Đơn giá: 1.480.000đ · không tính lại theo giá bán hiện tại',
    serials: [],
  };

  return (
    <div className="returns-page">
      {/* Toast */}
      {toast && (
        <div className="returns-toast" role="status">
          <HiOutlineCheck style={{ fontSize: 16 }} />
          <span>{toast}</span>
        </div>
      )}

      {/* Hero */}
      <section className="returns-hero">
        <div className="returns-hero__info">
          <div className="returns-hero__breadcrumb">ĐƠN HÀNG / KHÁCH TRẢ HÀNG / CHI TIẾT</div>
          <h1>
            <span>{record.id}</span>
            <span className="returns-badge-status">
              {record.trangThai === 'DA_HOAN_TIEN_CU' ? 'ĐÃ HOÀN TIỀN - NHẬN CŨ' : record.trangThai}
            </span>
          </h1>
          <div className="returns-hero__order-id">
            Đơn gốc: {record.orderId} · Liên hệ: {contactNameText} · {contactPhoneText}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}>
            QUAY LẠI DANH SÁCH
          </button>
          <button className="return-btn return-btn--outline" onClick={handleReloadTH006}>
            TẢI LẠI TH006
          </button>
        </div>
      </section>

      {/* Prototype Banner */}
      <div className="returns-proto-banner">
        <strong>PROTOTYPE TH006—TH012 ·</strong> Kiểm tra chỉ ghi tiếp nhận kiện. Chấp nhận nhập
        trả tạo biên bản mô phỏng, không sửa Inventory, Serial, Order hoặc Cashbook thật. Hoàn tiền
        chỉ ghi tiền đã giao ngoài hệ thống. Hủy / từ chối giữ quyền trả đến khi giao đủ hàng đang
        giữ. Quyền thao tác đọc từ TH006.
      </div>

      <div className="returns-create-container">
        {/* ========================================================
            BOX 1: TÌNH TRẠNG VẬT LÝ & NGHĨA VỤ
            ======================================================== */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>TÌNH TRẠNG VẬT LÝ & NGHĨA VỤ</h2>
          </div>
          <div className="return-section-box__body">
            {/* 4-column overview grid */}
            <div className="return-overview-grid">
              <div className="return-overview-item">
                <dt>HÀNG ĐANG Ở ĐÂU?</dt>
                <dd>
                  {record.custody?.location ||
                    'Chưa có sự kiện tiếp nhận kiện; chưa xác nhận cửa hàng đang giữ hàng.'}
                </dd>
              </div>
              <div className="return-overview-item">
                <dt>ĐÃ KIỂM TRA CHƯA?</dt>
                <dd>
                  {record.th007Inspection
                    ? 'Đã có biên bản TH007'
                    : 'Chưa có biên bản TH007'}
                </dd>
              </div>
              <div className="return-overview-item">
                <dt>ĐÃ CHẤP NHẬN NHẬP TRẢ?</dt>
                <dd>
                  <strong>
                    {record.accepted
                      ? 'ĐÃ CHẤP NHẬN NHẬP TRẢ'
                      : 'CHƯA CHẤP NHẬN NHẬP TRẢ'}
                  </strong>
                </dd>
              </div>
              <div className="return-overview-item">
                <dt>CÒN PHẢI HOÀN BAO NHIÊU?</dt>
                <dd>
                  {record.refund
                    ? 'Đã hoàn tất chứng từ hoàn'
                    : 'Chưa đối chiếu đầy đủ chứng từ hoàn'}
                </dd>
              </div>
            </div>

            {/* Việc cần làm tiếp & NÚT TRONG KHUNG ĐỎ (IMAGE 1 & 5) */}
            <div className="return-next-action-row">
              <div className="return-next-action-text">
                <dt>VIỆC CẦN LÀM TIẾP</dt>
                <dd>Ghi nhận kiện thực đến và kiểm tra thiết bị, tình trạng, phụ kiện.</dd>
              </div>
              {/* THE BUTTON IN THE USER'S RED BOX */}
              <button
                className="return-btn-highlight"
                onClick={() => setShowTH007((prev) => !prev)}
                id="btn-next-action-th007"
                title="Ghi nhận tiếp nhận kiện và mở biên bản kiểm tra TH007"
              >
                {showTH007 ? 'ĐÓNG TIẾP NHẬN' : 'TIẾP NHẬN KIỆN'}
              </button>
            </div>

            {/* Thao tác khác được TH006 cho phép */}
            <div className="return-other-actions-row">
              <div className="return-other-actions-label">THAO TÁC KHÁC ĐƯỢC TH006 CHO PHÉP</div>
              <div className="return-other-actions-btns">
                <button
                  className="return-btn return-btn--outline"
                  onClick={() => alert('Thao tác: HỦY YÊU CẦU')}
                >
                  HỦY YÊU CẦU
                </button>
                <button
                  className="return-btn return-btn--outline"
                  onClick={() => alert('Thao tác: TỪ CHỐI YÊU CẦU')}
                >
                  TỪ CHỐI YÊU CẦU
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            TH007 - TIẾP NHẬN KIỆN ĐỂ KIỂM TRA (IMAGE 5)
            Opens when user clicks the button in the red box!
            ======================================================== */}
        {showTH007 && (
          <section className="return-th007-box" id="section-th007-inspection">
            <div className="return-th007-header">
              <h2>TH007 - TIẾP NHẬN KIỆN ĐỂ KIỂM TRA</h2>
              <button
                className="return-btn return-btn--outline return-btn--small"
                onClick={() => setShowTH007(false)}
              >
                HỦY TIẾP NHẬN
              </button>
            </div>

            <div className="return-th007-body">
              <p className="return-th007-subtitle">
                Ghi nhận kiện thực đến tại điểm tiếp nhận. Chưa xác định thiết bị đồng nghĩa chưa
                tiếp nhận; không nhập kho, không đổi serial, không hoàn tiền sau thao tác này.
              </p>

              {/* Meta Row: Ngày thực tế & Người giao */}
              <div className="return-th007-meta-row">
                <div className="return-form-field">
                  <label>NGÀY TIẾP NHẬN THỰC TẾ</label>
                  <input
                    type="text"
                    value={th007ReceiptDate}
                    onChange={(e) => setTh007ReceiptDate(e.target.value)}
                  />
                </div>
                <div className="return-form-field">
                  <label>NGƯỜI GIAO</label>
                  <input
                    type="text"
                    value={th007Shipper}
                    onChange={(e) => setTh007Shipper(e.target.value)}
                    placeholder="Tên người giao hàng / shipper / khách..."
                  />
                </div>
              </div>

              {/* Item Card */}
              <div className="return-th007-item-card">
                {/* Left: Product & Snapshot Serials */}
                <div className="return-th007-item-left">
                  <div className="return-th007-item-title">{firstItem.sanPham}</div>
                  <div style={{ fontSize: 11, color: '#4b5563' }}>
                    {firstItem.phienBan || 'Bộ 2x16GB - Đen v1'}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#4b5563' }}>
                      THIẾT BỊ QUYỀN — CÓ THỂ ĐỐI CHIẾU
                    </span>
                    <div className="return-th007-device-list">
                      <div className="return-th007-device-card">
                        <strong>SERI-TH007-1A17-1</strong>
                        <span>Mã thiết bị: DI-04100-1122</span>
                        <span style={{ fontSize: 10 }}>Serial từ kiểm tra không được tự sinh</span>
                      </div>
                      <div className="return-th007-device-card">
                        <strong>SERI-TH007-1A17-2</strong>
                        <span>Mã thiết bị: DI-04100-1123</span>
                        <span style={{ fontSize: 10 }}>Serial từ kiểm tra không được tự sinh</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actual Intake Info */}
                <div className="return-th007-item-right">
                  <label className="return-th007-received-check">
                    <input
                      type="checkbox"
                      checked={th007ReceivedChecked}
                      onChange={(e) => setTh007ReceivedChecked(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#15803d' }}
                    />
                    <span>ĐÃ THỰC NHẬN</span>
                  </label>

                  <div className="return-form-field">
                    <label>THIẾT BỊ THỰC NHẬN</label>
                    <FilterDropdown
                      options={[
                        {
                          value: 'Chưa xác định — Để trống 0',
                          label: 'Chưa xác định — Để trống 0',
                        },
                        {
                          value: 'SERI-TH007-1A17-1',
                          label: 'SERI-TH007-1A17-1 (DI-04100-1122)',
                        },
                        {
                          value: 'SERI-TH007-1A17-2',
                          label: 'SERI-TH007-1A17-2 (DI-04100-1123)',
                        },
                      ]}
                      value={th007SelectedDevice}
                      onSelect={(val) => setTh007SelectedDevice(val)}
                      selectedDark={false}
                      aria-label="Thiết bị thực nhận"
                    />
                  </div>

                  <div className="return-th007-inputs-grid">
                    <div className="return-form-field">
                      <label>SỐ LƯỢNG THỰC NHẬN</label>
                      <input
                        type="number"
                        min="1"
                        value={th007Quantity}
                        onChange={(e) => setTh007Quantity(Number(e.target.value) || 1)}
                      />
                    </div>
                    <div className="return-form-field">
                      <label>SỐ PHỤ KIỆN THỰC NHẬN</label>
                      <input
                        type="text"
                        value={th007AccessoryCount}
                        onChange={(e) => setTh007AccessoryCount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="return-form-field">
                    <label>DẤU HIỆU NHẬN DẠNG</label>
                    <input
                      type="text"
                      value={th007IdentifierSign}
                      onChange={(e) => setTh007IdentifierSign(e.target.value)}
                      placeholder="Mã vạch, tem bảo hành hoặc ký hiệu..."
                    />
                  </div>

                  <div className="return-form-field">
                    <label>TÌNH TRẠNG THỰC TẾ</label>
                    <textarea
                      value={th007Condition}
                      onChange={(e) => setTh007Condition(e.target.value)}
                      placeholder="Tình trạng ngoại quan, trầy xước..."
                    />
                  </div>

                  <div className="return-form-field">
                    <label>PHỤ KIỆN THỰC NHẬN</label>
                    <textarea
                      value={th007AccessoriesNote}
                      onChange={(e) => setTh007AccessoriesNote(e.target.value)}
                      placeholder="Ghi chú chi tiết phụ kiện đi kèm..."
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Inspection Results & Evidence */}
              <div className="return-th007-meta-row">
                <div className="return-form-field">
                  <label>KẾT QUẢ KIỂM TRA</label>
                  <textarea
                    value={th007InspectionResult}
                    onChange={(e) => setTh007InspectionResult(e.target.value)}
                    placeholder="Nhập kết quả kiểm tra sơ bộ..."
                  />
                </div>
                <div className="return-form-field">
                  <label>BẰNG CHỨNG — MỖI DÒNG MỘT URL</label>
                  <textarea
                    value={th007EvidenceUrls}
                    onChange={(e) => setTh007EvidenceUrls(e.target.value)}
                    placeholder="https://... ảnh chụp hiện trạng"
                  />
                </div>
              </div>

              {/* Warning Banner */}
              <div className="return-warning-callout">
                <strong>CHƯA ĐỦ ĐỐI CHIẾU — VẪN CÓ THỂ GHI NHẬN KIỆN ĐỂ XÁC MINH</strong>
                <p style={{ margin: '4px 0 0', fontSize: 11 }}>
                  {firstItem.sanPham} chưa khớp snapshot giao hàng hiện hành.
                </p>
              </div>

              {/* Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="return-btn return-btn--black"
                  onClick={handleSaveTH007}
                  id="btn-save-th007"
                >
                  GHI NHẬN KIỆN — CHƯA NHẬP KHO
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            BOX 2: ĐƠN GỐC & THÔNG TIN YÊU CẦU
            ======================================================== */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>ĐƠN GỐC & THÔNG TIN YÊU CẦU</h2>
          </div>
          <div className="return-section-box__body">
            <div className="return-info-grid-3col">
              <div className="return-info-item">
                <dt>ĐƠN HÀNG</dt>
                <dd>{record.orderId}</dd>
              </div>
              <div className="return-info-item">
                <dt>NGƯỜI LIÊN HỆ</dt>
                <dd>{record.khachHang || record.tenNguoiLienHe || 'Chưa có bản chụp liên hệ'}</dd>
              </div>
              <div className="return-info-item">
                <dt>SỐ ĐIỆN THOẠI</dt>
                <dd>{record.soDienThoai || record.sdtNguoiLienHe || 'Chưa có dữ liệu'}</dd>
              </div>

              <div className="return-info-item">
                <dt>LÝ DO TRẢ</dt>
                <dd>{record.lyDoTra || 'Không phù hợp nhu cầu'}</dd>
              </div>
              <div className="return-info-item">
                <dt>GHI CHÚ</dt>
                <dd>{record.ghiChu || 'Chưa có ghi chú'}</dd>
              </div>
              <div className="return-info-item">
                <dt>NGÀY LẬP</dt>
                <dd>{record.displayDate || formatDisplayDate(record.createdAt)}</dd>
              </div>

              <div className="return-info-item">
                <dt>TỔNG TIỀN HOÀN ĐÃ LƯU</dt>
                <dd style={{ color: '#000', fontSize: 13 }}>{money(totals.amount)}</dd>
              </div>
              <div className="return-info-item">
                <dt>HÌNH THỨC HOÀN DỰ KIẾN</dt>
                <dd>{record.hinhThucHoanTienDuKien || record.hinhThucHoanTien || 'Tiền mặt'}</dd>
              </div>
              <div className="return-info-item">
                <dt>NGÀY HOÀN TẤT</dt>
                <dd>{record.ngayHoanTat || 'Chưa có sự kiện / dữ liệu'}</dd>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                className="return-btn return-btn--outline"
                onClick={() => navigate(`${ORDER_DETAIL_ROUTE}/${record.orderId}`)}
              >
                XEM ĐƠN HÀNG GỐC
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================
            BOX 3: DÒNG TRẢ & SNAPSHOT VẬT LÝ CẦN ĐỐI CHIẾU
            ======================================================== */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>DÒNG TRẢ & SNAPSHOT VẬT LÝ CẦN ĐỐI CHIẾU</h2>
          </div>
          <div className="return-section-box__body" style={{ padding: 0 }}>
            <div className="returns-table-scroll" style={{ border: 'none' }}>
              <table className="returns-table">
                <thead>
                  <tr>
                    <th>DÒNG GỐC / SẢN PHẨM</th>
                    <th style={{ width: 140 }}>SL BẢN CẦN TRẢ</th>
                    <th>VẬT PHẨM VẬT LÝ</th>
                    <th style={{ width: 220 }}>TIỀN HOÀN ĐÃ LƯU</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.lineItems || [firstItem]).map((line, idx) => (
                    <tr key={line.lineItemRef || idx}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 800 }}>{line.sanPham}</span>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>
                            {line.phienBan || 'Mặc định'}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'monospace',
                              color: '#374151',
                              marginTop: 4,
                            }}
                          >
                            {line.dongGoc || line.lineItemRef || 'ctth-004'}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 800 }}>{line.slTra}</td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          {line.vatPhamVatLy || `${line.slTra} đơn vị: đối chiếu với danh sách hiện hành`}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                          {line.vatPhamVatLyNote ||
                            'Chưa có định danh / snapshot hiện hành. Chỉ ghi kiểm tra để xác minh; không tự tạo thiết bị.'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 900, color: '#000' }}>
                          {money(line.thanhTienHoan || line.donGiaHoan)}
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                          {line.tienHoanNote ||
                            `Đơn giá: ${money(line.donGiaHoan)} · không tính lại theo giá bán hiện tại`}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================
            BOX 4: KIỂM TRA THỰC NHẬN & CUSTODY
            ======================================================== */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>KIỂM TRA THỰC NHẬN & CUSTODY</h2>
          </div>
          <div className="return-section-box__body">
            {record.th007Inspection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#15803d', fontWeight: 800 }}>
                  ✓ ĐÃ TIẾP NHẬN KIỆN TH007 ({record.th007Inspection.receiptDate})
                </div>
                <div style={{ fontSize: 12 }}>
                  <strong>Thiết bị thực nhận:</strong> {record.th007Inspection.deviceReceived} ·{' '}
                  <strong>Số lượng:</strong> {record.th007Inspection.quantity}
                </div>
                {record.th007Inspection.condition && (
                  <div style={{ fontSize: 12, color: '#4b5563' }}>
                    <strong>Hiện trạng:</strong> {record.th007Inspection.condition}
                  </div>
                )}
                {record.th007Inspection.inspectionResult && (
                  <div style={{ fontSize: 12, color: '#4b5563' }}>
                    <strong>Kết quả kiểm tra:</strong> {record.th007Inspection.inspectionResult}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>
                Chưa có TH007; không suy ra hàng đã đến chỉ từ trạng thái phiếu.
              </p>
            )}
          </div>
        </section>

        {/* ========================================================
            BOX 5: HÀNG ĐÃ CHẤP NHẬN NHẬP TRẢ
            ======================================================== */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>HÀNG ĐÃ CHẤP NHẬN NHẬP TRẢ</h2>
          </div>
          <div className="return-section-box__body">
            <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>
              CHƯA CHẤP NHẬN NHẬP TRẢ. Kiểm tra / giữ kiện không làm tăng tồn kho.
            </p>
          </div>
        </section>

        {/* ========================================================
            BOX 6: CHỨNG TỪ TIỀN, BÀN GIAO & LÝ DO ĐÓNG PHIẾU
            ======================================================== */}
        <section className="return-section-box">
          <div className="return-section-box__header">
            <h2>CHỨNG TỪ TIỀN, BÀN GIAO & LÝ DO ĐÓNG PHIẾU</h2>
          </div>
          <div className="return-section-box__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <dt style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', marginBottom: 4 }}>
                    PHIẾU HOÀN TIỀN
                  </dt>
                  <dd style={{ margin: 0, fontSize: 12, color: '#374151' }}>
                    {record.refund
                      ? `Đã hoàn tiền (${record.refund.phuongThuc})`
                      : 'Chưa có chứng từ hoàn tiền. Không tạo phiếu chi 0 đ.'}
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', marginBottom: 4 }}>
                    LÝ DO HỦY
                  </dt>
                  <dd style={{ margin: 0, fontSize: 12, color: '#374151' }}>
                    {record.cancelReason || 'Chưa có dữ liệu'}
                  </dd>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <dt style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', marginBottom: 4 }}>
                    BẰNG CHỨNG BÀN GIAO
                  </dt>
                  <dd style={{ margin: 0, fontSize: 12, color: '#374151' }}>
                    {record.handoverEvidence || 'Chưa có dữ liệu bàn giao'}
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', marginBottom: 4 }}>
                    LÝ DO TỪ CHỐI
                  </dt>
                  <dd style={{ margin: 0, fontSize: 12, color: '#374151' }}>
                    {record.rejectReason || 'Chưa có dữ liệu'}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            BOX 7: TÌNH HUỐNG MẪU UC-027 — CHỈ PROTOTYPE (IMAGE 3 & 4)
            ======================================================== */}
        <section className="return-scenarios-accordion">
          <div
            className="return-scenarios-header"
            onClick={() => setScenariosOpen((prev) => !prev)}
          >
            <h3>
              {scenariosOpen ? '▼' : '▶'} TÌNH HUỐNG MẪU UC-027 — CHỈ PROTOTYPE
            </h3>
            {scenariosOpen ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
          </div>

          {scenariosOpen && (
            <div className="return-scenarios-body">
              <p className="return-scenarios-subnote">
                Không tạo đơn hoặc sản phẩm khác. A → H → K dùng cùng một phiếu qua các bước; I → J
                tái dụng quyền trả sau hủy. G có thể dùng đơn vị còn lại. Nếu quyền đang được phiếu
                khác giữ hoặc thiếu dữ liệu, tình huống bị chặn thay vì reset. E hiện chưa có snapshot
                thay thế bảo hành đã xác minh.
              </p>

              <div className="return-scenarios-dropdown-wrap">
                <FilterDropdown
                  options={UC027_SCENARIOS.map((sc) => ({ value: sc.code, label: sc.code }))}
                  value={selectedScenario}
                  onSelect={(val) => setSelectedScenario(val)}
                  selectedDark={false}
                  direction="up"
                  aria-label="Tình huống mẫu"
                />
              </div>

              <label className="return-scenarios-confirm-check">
                <input
                  type="checkbox"
                  checked={scenarioConfirmed}
                  onChange={(e) => setScenarioConfirmed(e.target.checked)}
                />
                <span>
                  Tôi hiểu đây là chuỗi sự kiện mô phỏng trong cùng kho dữ liệu Return, không chuyển
                  tiền / nhập kho thật và không reset dữ liệu cũ.
                </span>
              </label>

              <div>
                <button
                  className="return-btn return-btn--outline"
                  onClick={handleApplyScenario}
                  id="btn-apply-prototype-scenario"
                >
                  CHUẨN BỊ / MỞ TÌNH HUỐNG MẪU
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
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
