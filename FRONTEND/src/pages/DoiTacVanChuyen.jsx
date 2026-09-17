import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import FilterDropdown from '../components/FilterDropdown';
import TablePagination from '../components/TablePagination';
import {
  formatPartnerStatus,
  formatPartnerType,
  generateShippingPartnerId,
  getShippingPartners,
  saveShippingPartners,
  SHIPPING_PARTNER_SYNC_SLICE,
} from '../data/shippingPartners';
import { subscribeToAdminSlice } from '../sync/adminSync';
import useOrders from '../context/useOrders';
import { formatMoney as formatOrderMoney } from '../data/mockOrders';
import './DoiTacVanChuyen.css';

const ROUTE = '/admin/khach-hang-doi-tac/doi-tac-van-chuyen';
const PAGE_SIZE = 10;
const TYPE_OPTIONS = ['Tất cả loại', 'Ship cửa hàng', 'Ship cá nhân'];
const STATUS_OPTIONS = ['Tất cả trạng thái', 'Hoạt động', 'Ngừng hoạt động'];
const DELIVERY_STATUS_OPTIONS = ['Tất cả trạng thái', 'Chờ giao', 'Đã nhận hàng', 'Đang giao', 'Giao thành công', 'Giao thất bại', 'Chờ hoàn hàng', 'Đã hoàn hàng', 'Hủy giao hàng'];
const ELIGIBLE_ORDER_STATUSES = ['Đang giao hàng', 'Chờ lấy hàng', 'Hoàn thành'];
const EMPTY_FORM = { tenDoiTac: '', soDienThoai: '', loaiDoiTac: '', email: '', diaChi: '', ghiChu: '' };

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const formatDateTime = (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export default function DoiTacVanChuyen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [partners, setPartners] = useState(() => getShippingPartners());
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(TYPE_OPTIONS[0]);
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [pendingAction, setPendingAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const selectedId = location.state?.partnerId || '';
  const selectedPartner = partners.find((partner) => partner.id === selectedId);

  useEffect(() => subscribeToAdminSlice(SHIPPING_PARTNER_SYNC_SLICE, () => setPartners(getShippingPartners())), []);
  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);
  useEffect(() => {
    if (!showAdd && !pendingAction) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (pendingAction) setPendingAction(null);
      else closeAddModal();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  });

  const filtered = useMemo(() => partners.filter((partner) => {
    const search = normalize(query.trim());
    const matchesSearch = !search || [partner.tenDoiTac, partner.soDienThoai].some((value) => normalize(value).includes(search));
    const matchesType = typeFilter === TYPE_OPTIONS[0] || formatPartnerType(partner.loaiDoiTac) === typeFilter;
    const matchesStatus = statusFilter === STATUS_OPTIONS[0]
      || (statusFilter === STATUS_OPTIONS[1] && partner.trangThai === 'hoat_dong')
      || (statusFilter === STATUS_OPTIONS[2] && partner.trangThai === 'ngung_hoat_dong');
    return matchesSearch && matchesType && matchesStatus;
  }), [partners, query, typeFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function closeAddModal() {
    setShowAdd(false);
    setForm(EMPTY_FORM);
    setErrors({});
  }
  const openDetail = (partnerId) => {
    setSuccessMessage('');
    navigate(ROUTE, { state: { partnerId } });
  };
  const backToList = () => {
    setSuccessMessage('');
    navigate(ROUTE, { replace: true, state: null });
  };
  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const validateForm = () => {
    const nextErrors = {};
    const phone = form.soDienThoai.trim();
    const digits = phone.replace(/\D/g, '');
    if (form.tenDoiTac.trim().length < 2) nextErrors.tenDoiTac = 'Vui lòng nhập tên đối tác';
    if (!/^\+?[\d ]{8,14}$/.test(phone) || digits.length < 8 || digits.length > 11) nextErrors.soDienThoai = 'Số điện thoại không hợp lệ';
    if (!form.loaiDoiTac) nextErrors.loaiDoiTac = 'Vui lòng chọn loại đối tác';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Email không hợp lệ';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const addPartner = (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const id = generateShippingPartnerId(partners);
    const now = new Date().toISOString();
    const partner = { id, ...form, tenDoiTac: form.tenDoiTac.trim(), soDienThoai: form.soDienThoai.trim(), email: form.email.trim(), diaChi: form.diaChi.trim(), ghiChu: form.ghiChu.trim(), trangThai: 'hoat_dong', createdAt: now, updatedAt: now };
    const next = [partner, ...partners];
    saveShippingPartners(next, 'created', id);
    setPartners(next);
    closeAddModal();
    setPage(1); setQuery(''); setTypeFilter(TYPE_OPTIONS[0]); setStatusFilter(STATUS_OPTIONS[0]);
    setSuccessMessage(`ĐÃ THÊM ĐỐI TÁC ${id} THÀNH CÔNG`);
  };
  const confirmAction = () => {
    if (!pendingAction) return;
    const status = pendingAction.action === 'suspend' ? 'ngung_hoat_dong' : 'hoat_dong';
    const next = partners.map((partner) => partner.id === pendingAction.partner.id ? { ...partner, trangThai: status, updatedAt: new Date().toISOString() } : partner);
    saveShippingPartners(next, status === 'hoat_dong' ? 'restored' : 'suspended', pendingAction.partner.id);
    setPartners(next);
    setPendingAction(null);
    setSuccessMessage(status === 'hoat_dong' ? 'ĐÃ KHÔI PHỤC ĐỐI TÁC' : 'ĐÃ NGỪNG HOẠT ĐỘNG ĐỐI TÁC');
  };

  if (selectedId && !selectedPartner) return <main className="partner-page partner-not-found"><h1>KHÔNG TÌM THẤY ĐỐI TÁC VẬN CHUYỂN</h1><button className="partner-btn partner-btn--outline" onClick={backToList}>QUAY LẠI DANH SÁCH</button></main>;

  return <main className="partner-page" role="main">
    {selectedPartner ? <PartnerDetail partner={selectedPartner} successMessage={successMessage} onBack={backToList} onAction={(action) => setPendingAction({ action, partner: selectedPartner })} /> : <>
      <section className="partner-hero"><div><PartnerBreadcrumb /><h1>ĐỐI TÁC VẬN CHUYỂN</h1><p>QUẢN LÝ ĐỐI TÁC GIAO HÀNG VÀ LỊCH SỬ PHIẾU GIAO</p></div><button className="partner-btn partner-btn--black" onClick={() => setShowAdd(true)}><HiOutlinePlus /><span>THÊM ĐỐI TÁC</span></button></section>
      {successMessage && <SuccessBanner message={successMessage} />}
      <section className="partner-toolbar"><label className="partner-search" htmlFor="partner-search"><HiOutlineSearch /><input id="partner-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo tên hoặc số điện thoại..." /></label><FilterDropdown className="partner-filter" options={TYPE_OPTIONS} value={typeFilter} onSelect={(value) => { setTypeFilter(value); setPage(1); }} /><FilterDropdown className="partner-filter" options={STATUS_OPTIONS} value={statusFilter} onSelect={(value) => { setStatusFilter(value); setPage(1); }} /></section>
      <section className="partner-list-content"><div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>MÃ ĐỐI TÁC</th><th>TÊN ĐỐI TÁC</th><th>SỐ ĐIỆN THOẠI</th><th>EMAIL</th><th>LOẠI ĐỐI TÁC</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{visible.map((partner) => <tr key={partner.id} tabIndex={0} onClick={() => openDetail(partner.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openDetail(partner.id); }}><td className="partner-code">{partner.id}</td><td className="partner-name">{partner.tenDoiTac}</td><td>{partner.soDienThoai}</td><td className={!partner.email ? 'partner-muted' : ''}>{partner.email || '—'}</td><td><PartnerTypeBadge type={partner.loaiDoiTac} /></td><td><PartnerStatusBadge status={partner.trangThai} /></td><td><div className="partner-row-actions"><button className="partner-row-btn" onClick={(event) => { event.stopPropagation(); openDetail(partner.id); }}>XEM CHI TIẾT</button><button className={`partner-row-btn partner-row-btn--${partner.trangThai === 'hoat_dong' ? 'danger' : 'success'}`} onClick={(event) => { event.stopPropagation(); setPendingAction({ action: partner.trangThai === 'hoat_dong' ? 'suspend' : 'restore', partner }); }}>{partner.trangThai === 'hoat_dong' ? 'NGỪNG' : 'KHÔI PHỤC'}</button></div></td></tr>)}{!visible.length && <tr className="partner-empty"><td colSpan="7">Không tìm thấy đối tác phù hợp.</td></tr>}</tbody></table></div><div className="partner-footer"><p>HIỂN THỊ {filtered.length ? start + 1 : 0}-{Math.min(start + PAGE_SIZE, filtered.length)} TRÊN TỔNG SỐ {filtered.length} ĐỐI TÁC</p><TablePagination totalItems={filtered.length} pageSize={PAGE_SIZE} currentPage={safePage} onPageChange={setPage} idPrefix="shipping-partner" /></div></section>
    </>}
    {showAdd && <AddPartnerModal form={form} errors={errors} onChange={updateField} onClose={closeAddModal} onSubmit={addPartner} />}
    {pendingAction && <ConfirmActionModal action={pendingAction.action} partner={pendingAction.partner} onCancel={() => setPendingAction(null)} onConfirm={confirmAction} />}
  </main>;
}

function PartnerBreadcrumb({ partnerId }) { return <nav className="partner-crumbs" aria-label="Breadcrumb nội dung"><span>KHÁCH HÀNG &amp; ĐỐI TÁC</span><span>/</span><span>ĐỐI TÁC VẬN CHUYỂN</span>{partnerId && <><span>/</span><strong>{partnerId}</strong></>}</nav>; }
function SuccessBanner({ message }) { return <div className="supplier-toast partner-success" role="status">{message}</div>; }
function PartnerStatusBadge({ status }) { return <span className={`partner-status partner-status--${status}`}>{formatPartnerStatus(status)}</span>; }
function PartnerTypeBadge({ type }) { return <span className={`partner-type partner-type--${type}`}>{formatPartnerType(type)}</span>; }
function PartnerPanel({ title, headerTools, children }) { return <section className="partner-panel"><header><h2><span />{title}</h2>{headerTools}</header>{children}</section>; }
function InfoRow({ label, children }) { return <div><dt>{label}</dt><dd>{children}</dd></div>; }

function PartnerDetail({ partner, successMessage, onBack, onAction }) {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState(DELIVERY_STATUS_OPTIONS[0]);
  const partnerOrders = useMemo(() => orders.filter((order) => {
    const sequence = Number(order.id.split('-').pop()) || 0;
    const shippingPartnerId = order.shippingPartnerId === undefined
      ? (sequence % 4 === 0 ? null : `DTVC${String(((sequence - 1) % 6) + 1).padStart(6, '0')}`)
      : order.shippingPartnerId;
    return shippingPartnerId === partner.id && ELIGIBLE_ORDER_STATUSES.includes(order.status);
  }), [orders, partner.id]);
  const deliveries = useMemo(() => {
    const search = normalize(historySearch.trim());
    return partnerOrders
      .filter((order) => !search || [deliveryReceiptId(order), order.trackingCode, order.id].some((value) => normalize(value || '').includes(search)))
      .filter((order) => historyStatus === DELIVERY_STATUS_OPTIONS[0] || deliveryFilterValue(order.delivery) === historyStatus);
  }, [partnerOrders, historySearch, historyStatus]);
  const filtersActive = Boolean(historySearch.trim()) || historyStatus !== DELIVERY_STATUS_OPTIONS[0];
  const active = partner.trangThai === 'hoat_dong';
  const tools = <div className="partner-history-tools"><label className="partner-history-search"><HiOutlineSearch /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Tìm mã phiếu, mã vận đơn hoặc mã đơn hàng..." /></label><FilterDropdown className="partner-history-filter" options={DELIVERY_STATUS_OPTIONS} value={historyStatus} onSelect={setHistoryStatus} /></div>;
  const openOrder = (orderId) => navigate(`/admin/don-hang/danh-sach-don-hang/${orderId}`);
  return <><section className="partner-hero partner-detail-hero"><div><PartnerBreadcrumb partnerId={partner.id} /><div className="partner-detail-meta"><span>{partner.id}</span><PartnerStatusBadge status={partner.trangThai} /></div><h1>{partner.tenDoiTac}</h1></div><div className="partner-detail-actions"><button className="partner-btn partner-btn--outline" onClick={onBack}><HiOutlineArrowLeft /> QUAY LẠI</button><button className={`partner-btn partner-btn--outline-${active ? 'danger' : 'success'}`} onClick={() => onAction(active ? 'suspend' : 'restore')}>{active ? 'NGỪNG HOẠT ĐỘNG' : 'KHÔI PHỤC HOẠT ĐỘNG'}</button></div></section><section className="partner-detail-content">{successMessage && <SuccessBanner message={successMessage} />}<PartnerPanel title="THÔNG TIN ĐỐI TÁC"><dl className="partner-info"><InfoRow label="MÃ ĐỐI TÁC">{partner.id}</InfoRow><InfoRow label="TÊN ĐỐI TÁC">{partner.tenDoiTac}</InfoRow><InfoRow label="SỐ ĐIỆN THOẠI">{partner.soDienThoai}</InfoRow><InfoRow label="LOẠI ĐỐI TÁC">{formatPartnerType(partner.loaiDoiTac)}</InfoRow><InfoRow label="EMAIL">{partner.email || '—'}</InfoRow><InfoRow label="ĐỊA CHỈ">{partner.diaChi || '—'}</InfoRow><InfoRow label="GHI CHÚ">{partner.ghiChu || '—'}</InfoRow><InfoRow label="TRẠNG THÁI">{formatPartnerStatus(partner.trangThai)}</InfoRow><InfoRow label="NGÀY TẠO">{formatDateTime(partner.createdAt)}</InfoRow><InfoRow label="CẬP NHẬT CUỐI">{formatDateTime(partner.updatedAt)}</InfoRow></dl></PartnerPanel><PartnerPanel title="LỊCH SỬ GIAO HÀNG" headerTools={tools}><div className="partner-history-wrap"><table className="partner-history"><thead><tr><th>MÃ PHIẾU</th><th>MÃ VẬN ĐƠN</th><th>MÃ ĐƠN HÀNG</th><th>TRẠNG THÁI GIAO</th><th>THU HỘ COD</th><th>PHÍ ĐỐI TÁC</th><th>GHI CHÚ</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr></thead><tbody>{deliveries.map((order) => <tr key={order.id}><td><strong>{deliveryReceiptId(order)}</strong></td><td>{order.trackingCode || '—'}</td><td><button className="partner-order-link" onClick={() => openOrder(order.id)}>{order.id}</button></td><td><DeliveryStatusBadge status={order.delivery} /></td><td className="partner-money">{order.payment === 'Chưa thanh toán' ? formatOrderMoney(order.total) : '—'}</td><td className="partner-money">{order.shippingFee ? formatOrderMoney(order.shippingFee) : '—'}</td><td>{order.note && order.note !== '—' ? order.note : '—'}</td><td>{order.createdDate} {order.createdTime}</td><td><button className="partner-view-order" onClick={() => openOrder(order.id)}>XEM</button></td></tr>)}{!deliveries.length && <tr className="partner-empty"><td colSpan="9">{filtersActive ? 'Không có phiếu giao hàng phù hợp với bộ lọc.' : 'Đối tác chưa có phiếu giao hàng.'}</td></tr>}</tbody></table></div></PartnerPanel></section></>;
}

function deliveryReceiptId(order) {
  return `PGH${String(Number(order.id.split('-').pop()) || 0).padStart(7, '0')}`;
}

function deliveryFilterValue(status) {
  if (status === 'Chờ lấy hàng') return 'Chờ giao';
  if (status === 'Đã giao') return 'Giao thành công';
  return status;
}

function DeliveryStatusBadge({ status }) {
  const variant = status === 'Giao thành công' || status === 'Đã nhận hàng' || status === 'Đã hoàn hàng' || status === 'Đã giao' ? 'green'
    : status === 'Đang giao' ? 'blue'
      : status === 'Giao thất bại' || status === 'Hủy giao hàng' ? 'red'
        : status === 'Chờ hoàn hàng' ? 'orange' : 'amber';
  return <span className={`order-state-badge order-state-badge--${variant}`}>{status || '—'}</span>;
}

function AddPartnerModal({ form, errors, onChange, onClose, onSubmit }) {
  return <div className="partner-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="partner-modal" role="dialog" aria-modal="true" aria-labelledby="add-partner-title"><header><h2 id="add-partner-title"><span />THÊM ĐỐI TÁC VẬN CHUYỂN</h2><button onClick={onClose} type="button" aria-label="Đóng"><HiOutlineX /></button></header><form onSubmit={onSubmit} noValidate><PartnerField label="TÊN ĐỐI TÁC *" value={form.tenDoiTac} onChange={(value) => onChange('tenDoiTac', value)} placeholder="Nguyễn Văn Minh" error={errors.tenDoiTac} autoFocus /><PartnerField label="SỐ ĐIỆN THOẠI *" value={form.soDienThoai} onChange={(value) => onChange('soDienThoai', value)} placeholder="0901 234 567" error={errors.soDienThoai} inputMode="tel" /><label className={`partner-form-field ${errors.loaiDoiTac ? 'partner-form-field--error' : ''}`}><span>LOẠI ĐỐI TÁC *</span><select value={form.loaiDoiTac} onChange={(event) => onChange('loaiDoiTac', event.target.value)}><option value="">-- Chọn loại đối tác --</option><option value="ship_cua_hang">Ship cửa hàng</option><option value="ship_ca_nhan">Ship cá nhân</option></select>{errors.loaiDoiTac && <small>{errors.loaiDoiTac}</small>}</label><PartnerField label="EMAIL" value={form.email} onChange={(value) => onChange('email', value)} placeholder="contact@example.com" error={errors.email} inputMode="email" /><PartnerField label="ĐỊA CHỈ" value={form.diaChi} onChange={(value) => onChange('diaChi', value)} placeholder="Địa chỉ liên hệ" /><PartnerField textarea label="GHI CHÚ" value={form.ghiChu} onChange={(value) => onChange('ghiChu', value)} placeholder="Ghi chú thêm..." /><footer><button type="button" className="partner-btn partner-btn--outline" onClick={onClose}>HỦY</button><button type="submit" className="partner-btn partner-btn--black">LƯU ĐỐI TÁC</button></footer></form></section></div>;
}
function PartnerField({ label, value, onChange, error, textarea, ...props }) { const Control = textarea ? 'textarea' : 'input'; return <label className={`partner-form-field ${error ? 'partner-form-field--error' : ''}`}><span>{label}</span><Control value={value} onChange={(event) => onChange(event.target.value)} {...props} />{error && <small>{error}</small>}</label>; }

function ConfirmActionModal({ action, partner, onCancel, onConfirm }) {
  const suspending = action === 'suspend';
  return <div className="partner-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className={`partner-confirm partner-confirm--${suspending ? 'suspend' : 'restore'}`} role="alertdialog" aria-modal="true"><header><h2>{suspending ? 'Ngừng hoạt động đối tác?' : 'Khôi phục hoạt động đối tác?'}</h2></header><div className="partner-confirm__body"><strong>{partner.id} - {partner.tenDoiTac}</strong><p>{suspending ? 'Đối tác sẽ không còn được chọn cho các phiếu giao hàng mới. Lịch sử giao hàng và các phiếu đã được gán vẫn được giữ nguyên.' : 'Đối tác sẽ có thể được lựa chọn lại cho các nghiệp vụ giao hàng mới.'}</p></div><footer><button className="partner-btn partner-btn--outline" onClick={onCancel}>HỦY</button><button className={`partner-btn partner-btn--${suspending ? 'danger' : 'success'}`} onClick={onConfirm}>{suspending ? 'XÁC NHẬN NGỪNG' : 'KHÔI PHỤC'}</button></footer></section></div>;
}
