import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import FilterDropdown from '../components/FilterDropdown';
import TablePagination from '../components/TablePagination';
import { getPurchaseOrders, getWarehouse, totalOrder } from '../data/purchaseOrders';
import {
  formatSupplierStatus,
  generateSupplierId,
  getSuppliers,
  saveSuppliers,
  SUPPLIER_SYNC_SLICE,
} from '../data/suppliers';
import { subscribeToAdminSlice } from '../sync/adminSync';
import './NhaCungCap.css';

const PAGE_SIZE = 10;
const LIST_PATH = '/admin/khach-hang-doi-tac/nha-cung-cap';
const FILTER_OPTIONS = ['Tất cả trạng thái hợp tác', 'Đang hợp tác', 'Ngừng hợp tác'];
const EMPTY_FORM = { id: '', tenNhaCungCap: '', soDienThoai: '', email: '', diaChi: '', trangThai: 'dang_hop_tac' };

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export default function NhaCungCap() {
  const location = useLocation();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState(() => getSuppliers());
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(FILTER_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const selectedId = location.state?.supplierId || '';
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedId);

  useEffect(() => subscribeToAdminSlice(SUPPLIER_SYNC_SLICE, () => setSuppliers(getSuppliers())), []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!showToast) return undefined;
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showToast]);
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

  const filtered = useMemo(() => suppliers.filter((supplier) => {
    const search = normalize(debouncedQuery.trim());
    const matchesSearch = !search || [supplier.id, supplier.tenNhaCungCap, supplier.soDienThoai].some((value) => normalize(value).includes(search));
    const matchesStatus = statusFilter === FILTER_OPTIONS[0]
      || (statusFilter === FILTER_OPTIONS[1] && supplier.trangThai === 'dang_hop_tac')
      || (statusFilter === FILTER_OPTIONS[2] && supplier.trangThai === 'ngung_hop_tac');
    return matchesSearch && matchesStatus;
  }), [suppliers, debouncedQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const openDetail = (supplierId) => navigate(LIST_PATH, { state: { supplierId } });
  const backToList = () => navigate(LIST_PATH, { replace: true, state: null });
  function closeModal() { setModalMode(''); setForm(EMPTY_FORM); setErrors({}); setShowConfirm(false); }
  const openCreate = () => { setForm(EMPTY_FORM); setErrors({}); setModalMode('create'); };
  const openEdit = () => {
    setForm({ ...selectedSupplier });
    setErrors({});
    setModalMode('edit');
  };

  const validate = () => {
    const nextErrors = {};
    const name = form.tenNhaCungCap.trim();
    const phone = form.soDienThoai.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    if (modalMode === 'create' && form.id.trim() && suppliers.some((supplier) => supplier.id.toLowerCase() === form.id.trim().toLowerCase())) nextErrors.id = 'Mã nhà cung cấp đã tồn tại';
    if (name.length < 2) nextErrors.tenNhaCungCap = 'Vui lòng nhập tên nhà cung cấp';
    if (!/^\+?[\d ]{8,14}$/.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 11) nextErrors.soDienThoai = 'Số điện thoại không hợp lệ';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Email không hợp lệ';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const persistForm = () => {
    const id = modalMode === 'create' ? (form.id.trim() || generateSupplierId(suppliers)) : form.id;
    const record = {
      id,
      tenNhaCungCap: form.tenNhaCungCap.trim(),
      soDienThoai: form.soDienThoai.trim(),
      email: form.email.trim(),
      diaChi: form.diaChi.trim(),
      trangThai: form.trangThai,
      createdAt: modalMode === 'create' ? new Date().toISOString() : selectedSupplier.createdAt,
    };
    const next = modalMode === 'create' ? [record, ...suppliers] : suppliers.map((item) => item.id === id ? record : item);
    saveSuppliers(next, modalMode === 'create' ? 'created' : 'updated', id);
    setSuppliers(next);
    closeModal();
    if (modalMode === 'create') {
      setQuery(''); setStatusFilter(FILTER_OPTIONS[0]); setPage(1); setShowToast(true);
    } else {
      openDetail(id); setShowToast(true);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    if (modalMode === 'edit' && selectedSupplier.trangThai === 'dang_hop_tac' && form.trangThai === 'ngung_hop_tac') {
      setShowConfirm(true);
      return;
    }
    persistForm();
  };

  function cancelConfirmation() {
    setShowConfirm(false);
    setForm((current) => ({ ...current, trangThai: selectedSupplier.trangThai }));
  }

  if (selectedId && !selectedSupplier) {
    return <main className="supplier-page supplier-not-found"><h1>KHÔNG TÌM THẤY NHÀ CUNG CẤP</h1><button className="supplier-btn supplier-btn--outline" onClick={backToList}>QUAY LẠI DANH SÁCH</button></main>;
  }

  return (
    <main className="supplier-page" role="main">
      {selectedSupplier ? (
        <SupplierDetail supplier={selectedSupplier} onBack={backToList} onEdit={openEdit} showToast={showToast} />
      ) : (
        <>
          <section className="supplier-hero">
            <div><Breadcrumb /><h1>DANH SÁCH NHÀ CUNG CẤP</h1><p>QUẢN LÝ ĐỐI TÁC CUNG ỨNG VÀ LỊCH SỬ NHẬP HÀNG</p></div>
            <button className="supplier-btn supplier-btn--black" onClick={openCreate}><HiOutlinePlus /><span>THÊM NHÀ CUNG CẤP</span></button>
          </section>
          {showToast && <SuccessToast message="Thêm nhà cung cấp thành công" />}
          <section className="supplier-toolbar">
            <label className="supplier-search" htmlFor="supplier-search"><HiOutlineSearch /><input id="supplier-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="TÌM MÃ / TÊN / SỐ ĐIỆN THOẠI NHÀ CUNG CẤP..." /></label>
            <FilterDropdown className="supplier-filter" options={FILTER_OPTIONS} value={statusFilter} onSelect={(value) => { setStatusFilter(value); setPage(1); }} />
          </section>
          <section className="supplier-list-content">
            <div className="supplier-table-wrap"><table className="supplier-table"><thead><tr><th>MÃ NHÀ CUNG CẤP</th><th>TÊN NHÀ CUNG CẤP</th><th>SỐ ĐIỆN THOẠI</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
              {visible.map((supplier) => <tr key={supplier.id} tabIndex={0} onClick={() => openDetail(supplier.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openDetail(supplier.id); }}><td className="supplier-code">{supplier.id}</td><td className="supplier-name">{supplier.tenNhaCungCap}</td><td>{supplier.soDienThoai}</td><td><SupplierStatus status={supplier.trangThai} /></td><td><button className="supplier-row-action" onClick={(event) => { event.stopPropagation(); openDetail(supplier.id); }}>XEM CHI TIẾT</button></td></tr>)}
              {!visible.length && <tr className="supplier-empty"><td colSpan="5">Không tìm thấy nhà cung cấp phù hợp.</td></tr>}
            </tbody></table></div>
            <div className="supplier-footer"><p>HIỂN THỊ {filtered.length ? start + 1 : 0}-{Math.min(start + PAGE_SIZE, filtered.length)} TRÊN TỔNG SỐ {filtered.length} NHÀ CUNG CẤP</p><TablePagination totalItems={filtered.length} pageSize={PAGE_SIZE} currentPage={safePage} onPageChange={setPage} idPrefix="supplier" /></div>
          </section>
        </>
      )}

      {modalMode && <SupplierFormModal mode={modalMode} form={form} errors={errors} onChange={(field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: '' })); }} onClose={closeModal} onSubmit={submit} />}
      {showConfirm && <DeactivateModal supplier={{ ...form, id: selectedSupplier.id }} onCancel={cancelConfirmation} onConfirm={persistForm} />}
    </main>
  );
}

function Breadcrumb({ detail = false }) {
  return <nav className="supplier-crumbs" aria-label="Breadcrumb nội dung"><span>KHÁCH HÀNG &amp; ĐỐI TÁC</span><span>/</span><span>NHÀ CUNG CẤP</span>{detail && <><span>/</span><strong>CHI TIẾT NHÀ CUNG CẤP</strong></>}</nav>;
}

function SupplierDetail({ supplier, onBack, onEdit, showToast }) {
  const navigate = useNavigate();
  const orders = getPurchaseOrders().filter((order) => order.supplierId === supplier.id);
  return <>
    <section className="supplier-hero supplier-detail-hero"><div><Breadcrumb detail /><div className="supplier-detail-meta"><span>{supplier.id}</span><SupplierStatus status={supplier.trangThai} /></div><h1>{supplier.tenNhaCungCap}</h1></div><div className="supplier-detail-actions"><button className="supplier-btn supplier-btn--outline" onClick={onBack}><HiOutlineArrowLeft /> QUAY LẠI</button><button className="supplier-btn supplier-btn--black" onClick={onEdit}>CHỈNH SỬA</button></div></section>
    <section className="supplier-detail-content">
      {showToast && <SuccessToast message="Cập nhật nhà cung cấp thành công" />}
      <SupplierPanel title="THÔNG TIN NHÀ CUNG CẤP"><dl className="supplier-info"><Info label="TRẠNG THÁI">{formatSupplierStatus(supplier.trangThai)}</Info><Info label="MÃ NHÀ CUNG CẤP">{supplier.id}</Info><Info label="TÊN NHÀ CUNG CẤP">{supplier.tenNhaCungCap}</Info><Info label="SỐ ĐIỆN THOẠI">{supplier.soDienThoai}</Info><Info label="EMAIL">{supplier.email || '—'}</Info><Info label="ĐỊA CHỈ">{supplier.diaChi || '—'}</Info></dl></SupplierPanel>
      <SupplierPanel title="LỊCH SỬ NHẬP HÀNG"><div className="supplier-history-wrap"><table className="supplier-history"><thead><tr><th>MÃ ĐƠN NHẬP</th><th>TRẠNG THÁI ĐƠN</th><th>NHẬN HÀNG</th><th>GIÁ TRỊ</th><th>CHI NHÁNH / KHO</th><th>NGÀY TẠO</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><button type="button" className="partner-order-link" onClick={() => navigate(`/kho-hang/nhap-hang/${order.id}`)}>{order.id}</button></td><td>{order.status.toUpperCase()}</td><td>{order.items.some((item) => item.received > 0) ? 'ĐÃ NHẬN' : 'CHƯA NHẬN'}</td><td>{money(totalOrder(order))}</td><td>{getWarehouse(order.warehouseId)?.name || '—'}</td><td>{order.createdAt}</td></tr>)}{!orders.length && <tr className="supplier-empty"><td colSpan="6">Chưa có lịch sử nhập hàng</td></tr>}</tbody></table></div></SupplierPanel>
    </section>
  </>;
}

function SupplierPanel({ title, children }) { return <section className="supplier-panel"><h2><span />{title}</h2>{children}</section>; }
function Info({ label, children }) { return <div><dt>{label}</dt><dd>{children}</dd></div>; }
function SupplierStatus({ status }) { return <span className={`supplier-status supplier-status--${status}`}>{formatSupplierStatus(status)}</span>; }
function SuccessToast({ message }) { return <div className="supplier-toast" role="status">{message}</div>; }

function SupplierFormModal({ mode, form, errors, onChange, onClose, onSubmit }) {
  const creating = mode === 'create';
  return <div className="supplier-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`supplier-modal ${creating ? 'supplier-modal--create' : ''}`} role="dialog" aria-modal="true" aria-labelledby="supplier-modal-title"><header><h2 id="supplier-modal-title"><span />{creating ? 'THÊM NHÀ CUNG CẤP' : 'CẬP NHẬT NHÀ CUNG CẤP'}</h2><button type="button" onClick={onClose} aria-label="Đóng"><HiOutlineX /></button></header><form onSubmit={onSubmit} noValidate><fieldset><legend>THÔNG TIN NHÀ CUNG CẤP</legend>
    <FormField label={`MÃ NHÀ CUNG CẤP (${creating ? 'TÙY CHỌN' : 'KHÔNG ĐỔI ĐƯỢC'})`} value={form.id} onChange={(value) => onChange('id', value)} placeholder="Để trống để hệ thống tự sinh mã" error={errors.id} disabled={!creating} />
    <FormField label="TÊN NHÀ CUNG CẤP *" value={form.tenNhaCungCap} onChange={(value) => onChange('tenNhaCungCap', value)} placeholder="Công ty ABC" error={errors.tenNhaCungCap} autoFocus />
    <div className="supplier-form-grid"><FormField label="SỐ ĐIỆN THOẠI *" value={form.soDienThoai} onChange={(value) => onChange('soDienThoai', value)} placeholder="0901 234 567" error={errors.soDienThoai} inputMode="tel" /><FormField label="EMAIL" value={form.email} onChange={(value) => onChange('email', value)} placeholder="contact@example.com" error={errors.email} inputMode="email" /></div>
  </fieldset><fieldset><legend>ĐỊA CHỈ</legend><FormField textarea label="ĐỊA CHỈ" value={form.diaChi} onChange={(value) => onChange('diaChi', value)} placeholder="123 Nguyễn Trãi, Hà Nội" />{!creating && <label className="supplier-form-field"><span>TRẠNG THÁI HỢP TÁC</span><select value={form.trangThai} onChange={(event) => onChange('trangThai', event.target.value)}><option value="dang_hop_tac">Đang hợp tác</option><option value="ngung_hop_tac">Ngừng hợp tác</option></select></label>}</fieldset><footer><button type="button" className="supplier-btn supplier-btn--outline" onClick={onClose}>HỦY</button><button type="submit" className="supplier-btn supplier-btn--black">{creating ? 'LƯU NHÀ CUNG CẤP' : 'CẬP NHẬT'}</button></footer></form></section></div>;
}

function FormField({ label, value, onChange, error, textarea, ...props }) {
  const Control = textarea ? 'textarea' : 'input';
  return <label className={`supplier-form-field ${error ? 'supplier-form-field--error' : ''}`}><span>{label}</span><Control value={value} onChange={(event) => onChange(event.target.value)} {...props} />{error && <small>{error}</small>}</label>;
}

function DeactivateModal({ supplier, onCancel, onConfirm }) {
  return <div className="supplier-modal-backdrop supplier-modal-backdrop--confirm"><section className="supplier-confirm" role="alertdialog" aria-modal="true"><header><h2>NGỪNG HỢP TÁC VỚI NHÀ CUNG CẤP?</h2></header><div><strong>{supplier.id} - {supplier.tenNhaCungCap}</strong><p>Nhà cung cấp sẽ không còn được phép chọn khi tạo đơn nhập hàng mới.</p><p>Các đơn nhập và lịch sử cũ vẫn được giữ nguyên.</p></div><footer><button className="supplier-btn supplier-btn--outline" onClick={onCancel}>HỦY</button><button className="supplier-btn supplier-btn--danger" onClick={onConfirm}>XÁC NHẬN NGỪNG HỢP TÁC</button></footer></section></div>;
}
