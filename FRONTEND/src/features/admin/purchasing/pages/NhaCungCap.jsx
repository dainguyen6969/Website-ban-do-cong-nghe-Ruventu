import AdminHelp from '../../../../shared/components/ui/AdminHelp';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineExternalLink,
  HiOutlineScale,
  HiOutlineSearch,
  HiOutlineTrendingDown,
  HiOutlineTrendingUp,
  HiOutlineX,
} from 'react-icons/hi';
import FilterDropdown, { FormDropdown } from '../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import LoadingSpinner from '../../../../shared/components/ui/LoadingSpinner';
import { cashbookService } from '../../../../shared/services/cashbookService';
import {
  createSupplier,
  getSupplierDetail,
  getSupplierPage,
  SUPPLIER_STATUS,
  updateSupplier,
} from '../api/supplierApi';

import { canOpenAdminPath, hasAdminPermission } from '../../../../auth/roleModel';
import { useAdminPermissions } from '../../../../shared/components/ui/PermissionGate';

import './NhaCungCap.css';
import AdminPageAction from '../../../../shared/components/ui/AdminPageAction';

const PAGE_SIZE = 10;
const LIST_PATH = '/admin/khach-hang-doi-tac/nha-cung-cap';
const FILTER_OPTIONS = ['Tất cả trạng thái hợp tác', 'Đang hợp tác', 'Ngừng hợp tác'];
const FILTER_STATUS = {
  [FILTER_OPTIONS[1]]: SUPPLIER_STATUS.active,
  [FILTER_OPTIONS[2]]: SUPPLIER_STATUS.inactive,
};
const EMPTY_FORM = {
  code: '',
  tenNhaCungCap: '',
  soDienThoai: '',
  email: '',
  diaChi: '',
  trangThai: SUPPLIER_STATUS.active,
};
const IMPORT_STATUS = {
  DAT_HANG: 'Đặt hàng',
  DA_DUYET: 'Đã duyệt',
  NHAP_MOT_PHAN: 'Nhập một phần',
  DA_NHAP_KHO: 'Đã nhập kho',
  HOAN_TRA_MOT_PHAN: 'Hoàn trả một phần',
  HOAN_TRA_TOAN_BO: 'Hoàn trả toàn bộ',
  HUY: 'Đã hủy',
};
const money = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const messageOf = (error) => error?.message || 'Không thể kết nối tới backend. Vui lòng thử lại.';
const formatSupplierStatus = (status) =>
  status === SUPPLIER_STATUS.active ? 'ĐANG HỢP TÁC' : 'NGỪNG HỢP TÁC';
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

export default function NhaCungCap() {
  const location = useLocation();
  const navigate = useNavigate();

  const access = useAdminPermissions()?.access;
  const canCreateSupplier = hasAdminPermission(access, 'nha_cung_cap', 'them');
  const canEditSupplier = hasAdminPermission(access, 'nha_cung_cap', 'sua');

  const selectedId = location.state?.supplierId || '';
  const [suppliers, setSuppliers] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(FILTER_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [modalMode, setModalMode] = useState('');

  const canSubmitSupplier =
    modalMode === 'create' ? canCreateSupplier : modalMode === 'edit' && canEditSupplier;

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (selectedId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    getSupplierPage(
      { keyword: debouncedQuery, status: FILTER_STATUS[statusFilter], page, limit: PAGE_SIZE },
      controller.signal
    )
      .then((data) => {
        setSuppliers(data.items);
        setTotalItems(data.totalItems);
        if (page > Math.max(1, data.totalPages)) setPage(Math.max(1, data.totalPages));
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(messageOf(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, page, reloadKey, selectedId, statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedSupplier(null);
      setDetailPage(1);
      setDetailError('');
      return undefined;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError('');
    getSupplierDetail(selectedId, detailPage, controller.signal)
      .then(setSelectedSupplier)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setSelectedSupplier(null);
          setDetailError(messageOf(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [detailPage, reloadKey, selectedId]);

  useEffect(() => {
    if (!modalMode && !showConfirm) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (showConfirm) cancelConfirmation();
      else closeModal();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  });

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  const openDetail = (supplierId) => {
    setDetailPage(1);
    navigate(LIST_PATH, { state: { supplierId } });
  };
  const backToList = () => navigate(LIST_PATH, { replace: true, state: null });
  function closeModal() {
    setModalMode('');
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError('');
    setShowConfirm(false);
  }
  const openCreate = () => {
    if (!canCreateSupplier) return;

    setForm(EMPTY_FORM);
    setErrors({});
    setServerError('');
    setModalMode('create');
  };
  const openEdit = () => {
    if (!canEditSupplier || !selectedSupplier) return;

    setForm({
      code: selectedSupplier.code,
      tenNhaCungCap: selectedSupplier.tenNhaCungCap,
      soDienThoai: selectedSupplier.soDienThoai,
      email: selectedSupplier.email,
      diaChi: selectedSupplier.diaChi,
      trangThai: selectedSupplier.trangThai,
    });
    setErrors({});
    setServerError('');
    setModalMode('edit');
  };

  const validate = () => {
    const next = {};
    if (
      modalMode === 'create' &&
      form.code.trim() &&
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/.test(form.code.trim())
    )
      next.code = 'Mã chỉ gồm chữ, số, gạch ngang hoặc gạch dưới';
    if (!form.tenNhaCungCap.trim()) next.tenNhaCungCap = 'Vui lòng nhập tên nhà cung cấp';
    if (!/^\+?[0-9]{9,15}$/.test(form.soDienThoai.replace(/\s/g, '')))
      next.soDienThoai = 'Số điện thoại phải có 9–15 chữ số';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Email không hợp lệ';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persistForm = async () => {
    if (!canSubmitSupplier) return;

    setShowConfirm(false);
    setSaving(true);
    setServerError('');
    try {
      if (modalMode === 'create') {
        await createSupplier(form);
        closeModal();
        setQuery('');
        setStatusFilter(FILTER_OPTIONS[0]);
        setPage(1);
        setToast('Thêm nhà cung cấp thành công');
      } else {
        await updateSupplier(selectedSupplier.id, form);
        closeModal();
        setToast('Cập nhật nhà cung cấp thành công');
      }
      reload();
    } catch (error) {
      setServerError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmitSupplier) return;

    if (!validate()) return;
    if (
      modalMode === 'edit' &&
      selectedSupplier.trangThai === SUPPLIER_STATUS.active &&
      form.trangThai === SUPPLIER_STATUS.inactive
    ) {
      setShowConfirm(true);
      return;
    }
    persistForm();
  };

  function cancelConfirmation() {
    setShowConfirm(false);
    setForm((current) => ({ ...current, trangThai: selectedSupplier.trangThai }));
  }

  if (selectedId && (detailLoading || detailError || !selectedSupplier)) {
    if (detailLoading) {
      return (
        <main className="supplier-page">
          <LoadingSpinner text="Đang tải dữ liệu nhà cung cấp..." fullPage />
        </main>
      );
    }
    return (
      <main className="supplier-page supplier-not-found">
        <h1>KHÔNG THỂ TẢI NHÀ CUNG CẤP</h1>
        <p role="alert">{detailError}</p>
        <button className="supplier-btn supplier-btn--outline" onClick={backToList}>
          QUAY LẠI DANH SÁCH
        </button>
      </main>
    );
  }

  const start = totalItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  return (
    <main className="supplier-page admin-list-page" role="main">
      {selectedSupplier ? (
        <SupplierDetail
          supplier={selectedSupplier}
          page={detailPage}
          onPageChange={setDetailPage}
          onBack={backToList}
          onEdit={openEdit}
          canEdit={canEditSupplier}
          toast={toast}
        />
      ) : (
        <>
          <section className="supplier-hero">
            <div>
              <Breadcrumb />
              <div className="admin-heading-with-help">
                <h1>DANH SÁCH NHÀ CUNG CẤP</h1>
                <AdminHelp>QUẢN LÝ ĐỐI TÁC CUNG ỨNG VÀ LỊCH SỬ NHẬP HÀNG</AdminHelp>
              </div>
            </div>
            <AdminPageAction
              variant="primary"
              icon="add"
              disabled={!canCreateSupplier}
              onClick={openCreate}
            >
              <span>THÊM NHÀ CUNG CẤP</span>
            </AdminPageAction>
          </section>
          {toast && <SuccessToast message={toast} />}
          <section className="supplier-toolbar admin-toolbar">
            <label className="supplier-search admin-toolbar-search" htmlFor="supplier-search">
              <HiOutlineSearch />
              <input
                id="supplier-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="TÌM MÃ / TÊN / SỐ ĐIỆN THOẠI NHÀ CUNG CẤP..."
              />
            </label>
            <FilterDropdown
              className="supplier-filter"
              options={FILTER_OPTIONS}
              value={statusFilter}
              onSelect={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
          </section>
          <section className="supplier-list-content admin-list-body">
            {loadError && <NetworkError message={loadError} onRetry={reload} />}
            <div
              className="supplier-table-wrap admin-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Bảng danh sách"
            >
              <table className="supplier-table admin-data-table">
                <thead>
                  <tr>
                    <th>MÃ NHÀ CUNG CẤP</th>
                    <th>TÊN NHÀ CUNG CẤP</th>
                    <th>SỐ ĐIỆN THOẠI</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {!loadError &&
                    suppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        tabIndex={0}
                        onClick={() => openDetail(supplier.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') openDetail(supplier.id);
                        }}
                      >
                        <td className="supplier-code">{supplier.code}</td>
                        <td className="supplier-name">{supplier.tenNhaCungCap}</td>
                        <td>{supplier.soDienThoai}</td>
                        <td>
                          <SupplierStatus status={supplier.trangThai} />
                        </td>
                        <td>
                          <button
                            className="supplier-row-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetail(supplier.id);
                            }}
                          >
                            XEM CHI TIẾT
                          </button>
                        </td>
                      </tr>
                    ))}
                  {!loadError && !suppliers.length && (
                    <tr className="supplier-empty">
                      <td colSpan="5" style={{ padding: 24, textAlign: 'center' }}>
                        {loading ? (
                          <LoadingSpinner text="Đang tải danh sách nhà cung cấp..." size="md" />
                        ) : (
                          'Không tìm thấy nhà cung cấp phù hợp.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="supplier-footer admin-table-footer">
              <p>
                HIỂN THỊ {start}-{Math.min(page * PAGE_SIZE, totalItems)} TRÊN TỔNG SỐ {totalItems}{' '}
                NHÀ CUNG CẤP
              </p>
              <TablePagination
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
                currentPage={page}
                onPageChange={setPage}
                idPrefix="supplier"
              />
            </div>
          </section>
        </>
      )}
      {canSubmitSupplier && modalMode && (
        <SupplierFormModal
          mode={modalMode}
          form={form}
          errors={errors}
          serverError={serverError}
          saving={saving}
          onChange={(field, value) => {
            setForm((current) => ({ ...current, [field]: value }));
            setErrors((current) => ({ ...current, [field]: '' }));
            setServerError('');
          }}
          onClose={closeModal}
          onSubmit={submit}
        />
      )}
      {canEditSupplier && showConfirm && (
        <DeactivateModal
          supplier={{ ...form, code: selectedSupplier.code }}
          saving={saving}
          onCancel={cancelConfirmation}
          onConfirm={persistForm}
        />
      )}
    </main>
  );
}

function Breadcrumb({ detail = false, onBack }) {
  return (
    <nav className="supplier-crumbs" aria-label="Breadcrumb nội dung">
      <Link to="/admin/khach-hang-doi-tac/khach-hang">KHÁCH HÀNG &amp; ĐỐI TÁC</Link>
      <span>/</span>
      {detail ? (
        <a
          href="#danh-sach"
          onClick={(e) => {
            e.preventDefault();
            if (onBack) onBack();
          }}
        >
          NHÀ CUNG CẤP
        </a>
      ) : (
        <span>NHÀ CUNG CẤP</span>
      )}
      {detail && (
        <>
          <span>/</span>
          <strong>CHI TIẾT NHÀ CUNG CẤP</strong>
        </>
      )}
    </nav>
  );
}

function SupplierDetail({ supplier, page, onPageChange, onBack, onEdit, canEdit, toast }) {
  const navigate = useNavigate();
  const access = useAdminPermissions()?.access;
  const canViewPurchases = hasAdminPermission(access, 'nhap_hang', 'xem');
  const canViewCashbook = hasAdminPermission(access, 'so_quy', 'xem');
  return (
    <>
      <section className="supplier-hero supplier-detail-hero">
        <div>
          <Breadcrumb detail onBack={onBack} />
          <div className="supplier-detail-meta">
            <span>{supplier.code}</span>
            <SupplierStatus status={supplier.trangThai} />
          </div>
          <h1>{supplier.tenNhaCungCap}</h1>
        </div>
        <div className="supplier-detail-actions">
          <AdminPageAction icon="back" onClick={onBack}>QUAY LẠI</AdminPageAction>
          <AdminPageAction variant="operation" icon="edit" disabled={!canEdit} onClick={onEdit}>CHỈNH SỬA</AdminPageAction>
        </div>
      </section>
      <section className="supplier-detail-content">
        {toast && <SuccessToast message={toast} />}
        <SupplierPanel title="THÔNG TIN NHÀ CUNG CẤP">
          <dl className="supplier-info">
            <Info label="TRẠNG THÁI">{formatSupplierStatus(supplier.trangThai)}</Info>
            <Info label="MÃ NHÀ CUNG CẤP">{supplier.code}</Info>
            <Info label="TÊN NHÀ CUNG CẤP">{supplier.tenNhaCungCap}</Info>
            <Info label="SỐ ĐIỆN THOẠI">{supplier.soDienThoai}</Info>
            <Info label="EMAIL">{supplier.email || '—'}</Info>
            <Info label="ĐỊA CHỈ">{supplier.diaChi || '—'}</Info>
          </dl>
        </SupplierPanel>
        <SupplierPanel title="LỊCH SỬ NHẬP HÀNG">
          <div className="supplier-history-wrap">
            <div
              className="admin-table-scroll admin-table-scroll--embedded"
              tabIndex={0}
              role="region"
              aria-label="Bảng dữ liệu liên quan"
            >
              <table className="supplier-history admin-data-table admin-data-table--records">
                <thead>
                  <tr>
                    <th>MÃ ĐƠN NHẬP</th>
                    <th>TRẠNG THÁI ĐƠN</th>
                    <th>THANH TOÁN</th>
                    <th>GIÁ TRỊ</th>
                    <th>NGÀY TẠO</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <button
                          type="button"
                          className="partner-order-link"
                          disabled={!canViewPurchases}
                          onClick={() => navigate(`/kho-hang/nhap-hang/${order.id}`)}
                        >
                          {order.code}
                        </button>
                      </td>
                      <td>
                        {(IMPORT_STATUS[order.importStatus] || order.importStatus).toUpperCase()}
                      </td>
                      <td>{order.paymentStatus.replaceAll('_', ' ')}</td>
                      <td>{money(order.total)}</td>
                      <td>{order.createdAtLabel}</td>
                    </tr>
                  ))}
                  {!supplier.orders.length && (
                    <tr className="supplier-empty">
                      <td colSpan="5">Chưa có lịch sử nhập hàng</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <TablePagination
            totalItems={supplier.orderTotal}
            pageSize={5}
            currentPage={page}
            onPageChange={onPageChange}
            idPrefix="supplier-orders"
          />
        </SupplierPanel>
        {canViewCashbook && (
          <SupplierCashbookPanel
            supplierId={supplier.id}
            orders={supplier.orders}
            access={access}
          />
        )}
      </section>
    </>
  );
}

function SupplierCashbookPanel({ supplierId, orders = [], access }) {
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

  const fetchVouchers = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        nha_cung_cap_id: supplierId,
        tu_ngay: '2020-01-01',
        den_ngay: '2035-12-31',
        page: Math.max(0, page - 1),
        limit: 5,
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
      console.error('Lỗi khi tải phiếu thu chi của nhà cung cấp:', err);
      setError('Không thể kết nối hoặc tải sổ quỹ nhà cung cấp.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId, page, typeFilter]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleTabChange = (nextType) => {
    if (nextType === typeFilter) return;
    setTypeFilter(nextType);
    setPage(1);
  };

  const getDocPath = (docCode) => {
    const code = docCode?.trim();
    if (!code) return null;

    const matched = orders.find((order) => order.code === code);
    if (matched) return `/kho-hang/nhap-hang/${matched.id}`;
    if (code.startsWith('DN')) return '/kho-hang/nhap-hang';
    if (code.startsWith('TH')) return '/kho-hang/thu-hoi';
    return null;
  };

  const handleVoucherClick = (item) => {
    if (item.loai_phieu === 'CHI') {
      navigate(`/admin/so-quy-tien-mat/phieu-chi/${item.id}`);
    } else {
      navigate(`/admin/so-quy-tien-mat/phieu-thu/${item.id}`);
    }
  };

  return (
    <SupplierPanel title="SỔ QUỸ: PHIẾU THU & PHIẾU CHI LIÊN QUAN">
      <div className="supplier-cashbook-stats">
        <div className="supplier-stat-card supplier-stat-card--chi">
          <div className="supplier-stat-icon supplier-stat-icon--chi">
            <HiOutlineTrendingDown />
          </div>
          <div className="supplier-stat-content">
            <span className="supplier-stat-title">TỔNG TIỀN ĐÃ CHI</span>
            <span className="supplier-stat-subtitle">Thanh toán tiền nhập hàng</span>
            <strong className="supplier-stat-value text-red">-{money(summary.tongChi)}</strong>
          </div>
        </div>

        <div className="supplier-stat-card supplier-stat-card--thu">
          <div className="supplier-stat-icon supplier-stat-icon--thu">
            <HiOutlineTrendingUp />
          </div>
          <div className="supplier-stat-content">
            <span className="supplier-stat-title">TỔNG TIỀN THU HOÀN</span>
            <span className="supplier-stat-subtitle">Tiền NCC hoàn lại khi trả hàng</span>
            <strong className="supplier-stat-value text-green">+{money(summary.tongThu)}</strong>
          </div>
        </div>

        <div className="supplier-stat-card supplier-stat-card--net">
          <div className="supplier-stat-icon supplier-stat-icon--net">
            <HiOutlineScale />
          </div>
          <div className="supplier-stat-content">
            <span className="supplier-stat-title">CHÊNH LỆCH THỰC CHI</span>
            <span className="supplier-stat-subtitle">Tổng chi trừ thu hoàn</span>
            <strong className="supplier-stat-value text-dark">
              {money(summary.tongChi - summary.tongThu)}
            </strong>
          </div>
        </div>
      </div>

      <div className="supplier-cashbook-tabs">
        <div className="supplier-cashbook-tabs-group">
          <button
            type="button"
            className={`supplier-cashbook-tab ${typeFilter === 'ALL' ? 'supplier-cashbook-tab--active' : ''}`}
            onClick={() => handleTabChange('ALL')}
          >
            TẤT CẢ
            {typeFilter === 'ALL' && (
              <span className="supplier-cashbook-tab-count">{totalElements}</span>
            )}
          </button>
          <button
            type="button"
            className={`supplier-cashbook-tab ${typeFilter === 'CHI' ? 'supplier-cashbook-tab--active' : ''}`}
            onClick={() => handleTabChange('CHI')}
          >
            PHIẾU CHI (XUẤT QUỸ)
            {typeFilter === 'CHI' && (
              <span className="supplier-cashbook-tab-count">{totalElements}</span>
            )}
          </button>
          <button
            type="button"
            className={`supplier-cashbook-tab ${typeFilter === 'THU' ? 'supplier-cashbook-tab--active' : ''}`}
            onClick={() => handleTabChange('THU')}
          >
            PHIẾU THU (NHẬP QUỸ)
            {typeFilter === 'THU' && (
              <span className="supplier-cashbook-tab-count">{totalElements}</span>
            )}
          </button>
        </div>
      </div>

      <div className="supplier-history-wrap">
        <table className="supplier-history">
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
                <td colSpan="9" style={{ padding: 24, textAlign: 'center' }}>
                  <LoadingSpinner text="Đang tải dữ liệu phiếu thu / phiếu chi..." size="md" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="9" className="supplier-table-error">
                  <span>{error}</span>
                  <button type="button" onClick={fetchVouchers} className="supplier-btn-retry">
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
                const docPath = getDocPath(item.ma_chung_tu_tham_chieu);
                const canOpenDoc = Boolean(docPath && canOpenAdminPath(access, docPath));
                return (
                  <tr key={item.id}>
                    <td>{(page - 1) * 5 + idx + 1}</td>
                    <td>
                      <button
                        type="button"
                        className="partner-order-link"
                        onClick={() => handleVoucherClick(item)}
                        title="Xem chi tiết phiếu"
                      >
                        {item.ma_phieu}
                        <HiOutlineExternalLink style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                      </button>
                    </td>
                    <td>
                      <span
                        className={`supplier-cashbook-badge ${
                          isChi ? 'supplier-cashbook-badge--chi' : 'supplier-cashbook-badge--thu'
                        }`}
                      >
                        {isChi ? 'PHIẾU CHI' : 'PHIẾU THU'}
                      </span>
                    </td>
                    <td>
                      {item.ma_chung_tu_tham_chieu ? (
                        <button
                          type="button"
                          className="supplier-doc-link"
                          disabled={!canOpenDoc}
                          onClick={() => {
                            if (canOpenDoc) navigate(docPath);
                          }}
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
                        className={`supplier-cashbook-amount ${
                          isChi ? 'supplier-cashbook-amount--chi' : 'supplier-cashbook-amount--thu'
                        }`}
                      >
                        {isChi ? `-${money(amount)}` : `+${money(amount)}`}
                      </span>
                    </td>
                    <td>{formatDateTime(item.ngay_ghi_nhan)}</td>
                    <td>
                      <span
                        className={`supplier-cashbook-badge ${
                          item.trang_thai === 'DA_GHI_NHAN' || item.trang_thai === 'DA_GHI_SO'
                            ? 'supplier-cashbook-badge--success'
                            : item.trang_thai === 'HUY'
                              ? 'supplier-cashbook-badge--cancelled'
                              : 'supplier-cashbook-badge--default'
                        }`}
                      >
                        {item.trang_thai === 'DA_GHI_NHAN' || item.trang_thai === 'DA_GHI_SO'
                          ? 'ĐÃ GHI SỔ'
                          : item.trang_thai === 'HUY'
                            ? 'ĐÃ HỦY'
                            : item.trang_thai}
                      </span>
                    </td>
                    <td className="supplier-col-notes" title={item.mo_ta || ''}>
                      {item.mo_ta || '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="supplier-empty">
                <td colSpan="9">
                  Chưa có phiếu thu hoặc phiếu chi nào phát sinh với nhà cung cấp này
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        totalItems={totalElements}
        pageSize={5}
        currentPage={page}
        onPageChange={setPage}
        idPrefix="supplier-cashbook"
      />
    </SupplierPanel>
  );
}

function SupplierPanel({ title, children }) {
  return (
    <section className="supplier-panel">
      <h2>
        <span />
        {title}
      </h2>
      {children}
    </section>
  );
}
function Info({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
function SupplierStatus({ status }) {
  return (
    <span className={`supplier-status supplier-status--${status}`}>
      {formatSupplierStatus(status)}
    </span>
  );
}
function SuccessToast({ message }) {
  return (
    <div className="supplier-toast" role="status">
      {message}
    </div>
  );
}
function NetworkError({ message, onRetry }) {
  return (
    <div className="supplier-network-error" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        THỬ LẠI
      </button>
    </div>
  );
}

function SupplierFormModal({
  mode,
  form,
  errors,
  serverError,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  const creating = mode === 'create';
  return (
    <div
      className="supplier-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className={`supplier-modal ${creating ? 'supplier-modal--create' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-modal-title"
      >
        <header>
          <h2 id="supplier-modal-title">
            <span />
            {creating ? 'THÊM NHÀ CUNG CẤP' : 'CẬP NHẬT NHÀ CUNG CẤP'}
          </h2>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Đóng">
            <HiOutlineX />
          </button>
        </header>
        <form onSubmit={onSubmit} noValidate>
          <fieldset disabled={saving}>
            <legend>THÔNG TIN NHÀ CUNG CẤP</legend>
            <FormField
              label={`MÃ NHÀ CUNG CẤP (${creating ? 'TÙY CHỌN' : 'KHÔNG ĐỔI ĐƯỢC'})`}
              value={form.code}
              onChange={(value) => onChange('code', value)}
              placeholder="Để trống để hệ thống tự sinh mã"
              error={errors.code}
              disabled={!creating}
            />
            <FormField
              label="TÊN NHÀ CUNG CẤP *"
              value={form.tenNhaCungCap}
              onChange={(value) => onChange('tenNhaCungCap', value)}
              placeholder="Công ty ABC"
              error={errors.tenNhaCungCap}
              autoFocus
            />
            <div className="supplier-form-grid">
              <FormField
                label="SỐ ĐIỆN THOẠI *"
                value={form.soDienThoai}
                onChange={(value) => onChange('soDienThoai', value)}
                placeholder="0901 234 567"
                error={errors.soDienThoai}
                inputMode="tel"
              />
              <FormField
                label="EMAIL"
                value={form.email}
                onChange={(value) => onChange('email', value)}
                placeholder="contact@example.com"
                error={errors.email}
                inputMode="email"
              />
            </div>
          </fieldset>
          <fieldset disabled={saving}>
            <legend>ĐỊA CHỈ</legend>
            <FormField
              textarea
              label="ĐỊA CHỈ"
              value={form.diaChi}
              onChange={(value) => onChange('diaChi', value)}
              placeholder="123 Nguyễn Trãi, Hà Nội"
            />
            {!creating && (
              <label className="supplier-form-field">
                <span>TRẠNG THÁI HỢP TÁC</span>
                <FormDropdown
                  aria-label="TRẠNG THÁI HỢP TÁC"
                  value={form.trangThai}
                  onChange={(event) => onChange('trangThai', event.target.value)}
                >
                  <option value={SUPPLIER_STATUS.active}>Đang hợp tác</option>
                  <option value={SUPPLIER_STATUS.inactive}>Ngừng hợp tác</option>
                </FormDropdown>
              </label>
            )}
          </fieldset>
          {serverError && (
            <p className="supplier-form-error" role="alert">
              {serverError}
            </p>
          )}
          <footer>
            <button
              type="button"
              className="supplier-btn supplier-btn--outline"
              disabled={saving}
              onClick={onClose}
            >
              HỦY
            </button>
            <button type="submit" className="supplier-btn supplier-btn--black" disabled={saving}>
              {saving ? 'ĐANG LƯU...' : creating ? 'LƯU NHÀ CUNG CẤP' : 'CẬP NHẬT'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function FormField({ label, value, onChange, error, textarea, ...props }) {
  const Control = textarea ? 'textarea' : 'input';
  return (
    <label className={`supplier-form-field ${error ? 'supplier-form-field--error' : ''}`}>
      <span>{label}</span>
      <Control value={value} onChange={(event) => onChange(event.target.value)} {...props} />
      {error && <small>{error}</small>}
    </label>
  );
}

function DeactivateModal({ supplier, saving, onCancel, onConfirm }) {
  return (
    <div className="supplier-modal-backdrop supplier-modal-backdrop--confirm">
      <section className="supplier-confirm" role="alertdialog" aria-modal="true">
        <header>
          <h2>NGỪNG HỢP TÁC VỚI NHÀ CUNG CẤP?</h2>
        </header>
        <div>
          <strong>
            {supplier.code} - {supplier.tenNhaCungCap}
          </strong>
          <p>Nhà cung cấp sẽ không còn được phép chọn khi tạo đơn nhập hàng mới.</p>
          <p>Các đơn nhập và lịch sử cũ vẫn được giữ nguyên.</p>
        </div>
        <footer>
          <button
            className="supplier-btn supplier-btn--outline"
            disabled={saving}
            onClick={onCancel}
          >
            HỦY
          </button>
          <button
            className="supplier-btn supplier-btn--danger"
            disabled={saving}
            onClick={onConfirm}
          >
            {saving ? 'ĐANG LƯU...' : 'XÁC NHẬN NGỪNG HỢP TÁC'}
          </button>
        </footer>
      </section>
    </div>
  );
}
