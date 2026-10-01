// Admin customer screen: KhachTraHang.
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import useOrders from '../../../../context/useOrders';
import { subscribeToAdminSlice } from '../../../../sync/adminSync';
import {
  CUSTOMER_RETURNS_SYNC_SLICE, RETURN_STATUS, createReturnId, orderCustomerName,
  orderLineRef, orderPhone, readCustomerReturns, returnTotals, returnedQuantity, saveCustomerReturns,
} from '../../../../data/customerReturns';
import './KhachTraHang.css';

const LIST_ROUTE = '/admin/don-hang/khach-tra-hang';
const ORDER_DETAIL_ROUTE = '/admin/don-hang/danh-sach-don-hang';
const PAGE_SIZE = 8;
const STATUS_OPTIONS = ['Tất cả trạng thái', 'Chờ tiếp nhận', 'Đã nhận hàng', 'Đã hoàn tiền'];
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))}đ`;
const dateOnly = (value) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
const today = () => new Date().toISOString().slice(0, 10);
const statusLabel = (status) => ({ cho_tiep_nhan: 'Chờ tiếp nhận', da_nhan_hang: 'Đã nhận hàng', da_hoan_tien: 'Đã hoàn tiền' }[status] || status);
const statusFromLabel = (label) => ({ 'Chờ tiếp nhận': 'cho_tiep_nhan', 'Đã nhận hàng': 'da_nhan_hang', 'Đã hoàn tiền': 'da_hoan_tien' }[label]);
const guestName = (name) => name || 'Khách lẻ';

export default function KhachTraHang() {
  const { orders } = useOrders();
  const { orderId, returnId } = useParams();
  const [returns, setReturns] = useState(() => readCustomerReturns(orders));
  useEffect(() => subscribeToAdminSlice(CUSTOMER_RETURNS_SYNC_SLICE, () => setReturns(readCustomerReturns(orders))), [orders]);
  const updateReturns = (next, action, entityId) => { setReturns(next); saveCustomerReturns(next, action, entityId); };
  if (orderId) return <CreateReturn orderId={orderId} orders={orders} returns={returns} updateReturns={updateReturns} />;
  if (returnId) return <ReturnDetail returnId={returnId} orders={orders} returns={returns} updateReturns={updateReturns} />;
  return <ReturnList orders={orders} returns={returns} />;
}

function ReturnList({ orders, returns }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    const wantedStatus = statusFromLabel(status);
    return returns.filter((record) => {
      const matchesText = !term || [record.id, record.orderId, record.khachHang, record.soDienThoai].some((value) => normalize(value || '').includes(term));
      return matchesText && (!wantedStatus || record.trangThai === wantedStatus);
    });
  }, [query, returns, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return <div className="returns-page">
    <PageHero breadcrumb={['ĐƠN HÀNG', 'KHÁCH TRẢ HÀNG']} title="KHÁCH TRẢ HÀNG" subtitle="Quản lý phiếu trả, thu hồi hàng về kho và hoàn tiền cho khách"><button className="return-btn return-btn--black" onClick={() => setSelecting(true)}>+ CHỌN TRẢ HÀNG</button></PageHero>
    <div className="returns-toolbar"><label className="returns-search"><HiOutlineSearch /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm mã trả / mã đơn / tên / SĐT khách hàng..." /></label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Lọc trạng thái">{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
    <section className="returns-list-card"><div className="returns-table-scroll"><table className="returns-table returns-table--list"><thead><tr><th>MÃ TRẢ HÀNG</th><th>ĐƠN HÀNG GỐC</th><th>KHÁCH HÀNG</th><th>SỐ ĐIỆN THOẠI</th><th>TỔNG TIỀN HOÀN</th><th>HÌNH THỨC HOÀN</th><th>LÝ DO TRẢ</th><th>TRẠNG THÁI</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr></thead><tbody>
      {visible.map((record) => <tr key={record.id}><td><strong>{record.id}</strong></td><td><strong>{record.orderId}</strong></td><td className={!record.khachHang ? 'returns-guest' : ''}>{guestName(record.khachHang)}</td><td>{record.soDienThoai || '—'}</td><td className="returns-money">{money(returnTotals(record).amount)}</td><td>{record.hinhThucHoanTienDuKien}</td><td>{record.lyDoTra}</td><td><StatusBadge status={record.trangThai} /></td><td>{dateOnly(record.createdAt)}</td><td><button className="return-row-btn" onClick={() => navigate(`${LIST_ROUTE}/${record.id}`)}>XEM CHI TIẾT</button></td></tr>)}
      {!visible.length && <tr><td className="returns-empty" colSpan="10">Không tìm thấy phiếu trả hàng phù hợp.</td></tr>}
    </tbody></table></div><TablePagination totalItems={filtered.length} pageSize={PAGE_SIZE} currentPage={safePage} onPageChange={setPage} idPrefix="customer-return" /></section>
    {selecting && <SelectOrderModal orders={orders} onClose={() => setSelecting(false)} onSelect={(id) => navigate(`${LIST_ROUTE}/tao/${id}`)} />}
  </div>;
}

function SelectOrderModal({ orders, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const paidOrders = useMemo(() => { const term = normalize(query.trim()); return orders.filter((order) => order.payment === 'Đã thanh toán').filter((order) => !term || [order.id, order.customerName, order.recipient?.name, order.customerPhone, order.recipient?.phone].some((value) => normalize(value || '').includes(term))); }, [orders, query]);
  useEscape(onClose);
  return <ModalShell title="CHỌN ĐƠN HÀNG CẦN TRẢ" onClose={onClose} wide><label className="returns-modal-search"><HiOutlineSearch /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã đơn / khách hàng / người nhận..." /></label><div className="returns-modal-table-wrap"><table className="returns-table"><thead><tr><th>MÃ ĐƠN</th><th>LOẠI ĐƠN</th><th>KHÁCH HÀNG</th><th>SỐ ĐIỆN THOẠI</th><th>THANH TOÁN</th><th>TỔNG GIÁ TRỊ</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr></thead><tbody>
    {paidOrders.map((order) => <tr key={order.id}><td><strong>{order.id}</strong></td><td><TypeBadge type={order.type} /></td><td className={!orderCustomerName(order) ? 'returns-guest' : ''}>{guestName(orderCustomerName(order))}</td><td>{orderPhone(order) || '—'}</td><td><span className="return-paid-badge">Đã thanh toán</span></td><td className="returns-money returns-money--black">{money(order.total)}</td><td>{order.createdDate}</td><td><button className="return-btn return-btn--black return-btn--small" onClick={() => onSelect(order.id)}>CHỌN TRẢ HÀNG</button></td></tr>)}
    {!paidOrders.length && <tr><td className="returns-empty" colSpan="8">Không có đơn đã thanh toán phù hợp.</td></tr>}
  </tbody></table></div></ModalShell>;
}

function CreateReturn({ orderId, orders, returns, updateReturns }) {
  const navigate = useNavigate();
  const order = orders.find((item) => item.id === orderId);
  const available = useMemo(() => (order?.products || []).map((product, index) => { const lineItemRef = orderLineRef(product, index); const bought = Number(product.quantity || 0); return { product, lineItemRef, bought, remaining: Math.max(0, bought - returnedQuantity(returns, orderId, lineItemRef)) }; }), [order, orderId, returns]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [refundMethod, setRefundMethod] = useState('Tiền mặt');
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);
  if (!order) return <NotFound title="KHÔNG TÌM THẤY ĐƠN HÀNG" onBack={() => navigate(LIST_ROUTE)} />;
  if (order.payment !== 'Đã thanh toán') return <NotFound title="ĐƠN HÀNG CHƯA ĐỦ ĐIỀU KIỆN TRẢ" text="Chỉ có thể tạo phiếu trả cho đơn đã thanh toán." onBack={() => navigate(LIST_ROUTE)} />;
  const chosenRows = available.filter((item) => selected[item.lineItemRef]);
  const totalQuantity = chosenRows.reduce((sum, item) => sum + selected[item.lineItemRef], 0);
  const totalAmount = chosenRows.reduce((sum, item) => sum + selected[item.lineItemRef] * Number(item.product.unitPrice || 0), 0);
  const valid = reason.trim() && chosenRows.length > 0 && chosenRows.every((item) => selected[item.lineItemRef] >= 1 && selected[item.lineItemRef] <= item.remaining);
  const toggleLine = (item) => setSelected((current) => current[item.lineItemRef] ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== item.lineItemRef)) : { ...current, [item.lineItemRef]: item.remaining });
  const setQuantity = (item, value) => setSelected((current) => ({ ...current, [item.lineItemRef]: Math.min(item.remaining, Math.max(1, Number(value) || 1)) }));
  const create = () => { setSubmitted(true); if (!valid) return; const id = createReturnId(returns); const lineItems = chosenRows.map(({ product, lineItemRef, bought, remaining }) => ({ lineItemRef, sanPham: product.name, phienBan: product.variant || 'Mặc định', slDaMua: bought, slConDuocTra: remaining, slTra: selected[lineItemRef], donGiaHoan: Number(product.unitPrice || 0), thanhTienHoan: selected[lineItemRef] * Number(product.unitPrice || 0) })); const record = { id, orderId: order.id, orderType: order.type, khachHang: orderCustomerName(order), soDienThoai: orderPhone(order), lyDoTra: reason.trim(), lineItems, hinhThucHoanTienDuKien: refundMethod, ghiChu: note.trim(), trangThai: RETURN_STATUS.WAITING, createdAt: new Date().toISOString() }; updateReturns([record, ...returns], 'created', id); navigate(`${LIST_ROUTE}/${id}`, { state: { toast: `Đã tạo phiếu trả hàng ${id}` } }); };
  return <div className="returns-page returns-page--detail"><PageHero breadcrumb={['KHÁCH TRẢ HÀNG', 'TẠO PHIẾU TRẢ HÀNG']} title="TẠO PHIẾU TRẢ HÀNG"><button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}><HiOutlineArrowLeft /> QUAY LẠI</button></PageHero><div className="returns-create-meta"><strong>{order.id}</strong><OrderBadge value={order.status} /><span className="return-paid-badge">{order.payment}</span></div>
    <div className="returns-detail-grid"><div className="returns-detail-main"><section className="return-box return-reason"><label>LÝ DO TRẢ HÀNG *</label><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do trả hàng..." />{submitted && !reason.trim() && <FieldError>Vui lòng nhập lý do trả hàng.</FieldError>}</section>
      <Panel title="SẢN PHẨM CÓ THỂ TRẢ" flush><div className="returns-table-scroll"><table className="returns-table returns-products"><thead><tr><th>CHỌN</th><th>SẢN PHẨM</th><th>PHIÊN BẢN</th><th>GIÁ MUA</th><th>SL ĐÃ MUA</th><th>SL CÒN ĐƯỢC TRẢ</th><th>SL TRẢ</th><th>ĐƠN GIÁ HOÀN</th><th>THÀNH TIỀN HOÀN</th></tr></thead><tbody>{available.map((item) => { const quantity = selected[item.lineItemRef]; const checked = Boolean(quantity); return <tr key={item.lineItemRef} className={checked ? 'is-selected' : ''}><td><input type="checkbox" checked={checked} disabled={!item.remaining} onChange={() => toggleLine(item)} aria-label={`Chọn ${item.product.name}`} /></td><td><strong>{item.product.name}</strong></td><td><span className="returns-version">{item.product.variant || 'Mặc định'}</span></td><td>{money(item.product.unitPrice)}</td><td>{item.bought}</td><td className="returns-remaining">{item.remaining}</td><td>{checked ? <input className="returns-quantity" type="number" min="1" max={item.remaining} value={quantity} onChange={(event) => setQuantity(item, event.target.value)} /> : '—'}</td><td>{checked ? money(item.product.unitPrice) : '—'}</td><td className="returns-money returns-money--black">{checked ? money(quantity * Number(item.product.unitPrice || 0)) : '—'}</td></tr>; })}</tbody></table></div>{submitted && !chosenRows.length && <FieldError>Vui lòng chọn ít nhất một sản phẩm còn có thể trả.</FieldError>}</Panel>
      <section className="return-box"><label>HÌNH THỨC HOÀN TIỀN</label><RadioPair value={refundMethod} onChange={setRefundMethod} /></section><section className="return-box return-reason"><label>GHI CHÚ</label><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thêm (tùy chọn)..." /></section>
    </div><aside className="returns-detail-side"><SideCard title="KHÁCH HÀNG"><p className={!orderCustomerName(order) ? 'returns-guest' : ''}>{guestName(orderCustomerName(order))}</p></SideCard><SideCard title="TỔNG KẾT TRẢ HÀNG" dark><dl><div><dt>Tổng số lượng trả</dt><dd>{totalQuantity}</dd></div><div><dt>Tổng tiền hoàn dự kiến</dt><dd className="returns-money">{money(totalAmount)}</dd></div></dl></SideCard><button className="return-btn return-btn--black return-btn--wide" disabled={!valid} onClick={create}>TẠO PHIẾU TRẢ HÀNG</button></aside></div>
  </div>;
}

function ReturnDetail({ returnId, orders, returns, updateReturns }) {
  const navigate = useNavigate();
  const location = useLocation();
  const record = returns.find((item) => item.id === returnId);
  const order = orders.find((item) => item.id === record?.orderId);
  const [receiving, setReceiving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [toast, setToast] = useState(location.state?.toast || '');
  const itemPagination = useDetailTablePagination(record?.lineItems);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  if (!record) return <NotFound title="KHÔNG TÌM THẤY PHIẾU TRẢ HÀNG" onBack={() => navigate(LIST_ROUTE)} />;
  const totals = returnTotals(record);
  const receivedSummary = (record.receiveResult || []).reduce((sum, item) => ({ good: sum.good + item.slNguyenVen, bad: sum.bad + item.slLoi }), { good: 0, bad: 0 });
  const replaceRecord = (patch, action) => updateReturns(returns.map((item) => item.id === record.id ? { ...item, ...patch } : item), action, record.id);
  const confirmReceive = (result) => { replaceRecord({ receiveResult: result, trangThai: RETURN_STATUS.RECEIVED }, 'received'); setReceiving(false); setToast(`Đã xác nhận nhận hàng cho ${record.id}`); };
  const confirmRefund = (refund) => { replaceRecord({ refund, hinhThucHoanTienDuKien: refund.phuongThuc, trangThai: RETURN_STATUS.REFUNDED }, 'refunded'); setRefunding(false); setToast(`Đã hoàn tiền cho phiếu ${record.id}`); };
  return <div className="returns-page returns-page--detail"><PageHero breadcrumb={['KHÁCH TRẢ HÀNG', 'CHI TIẾT PHIẾU TRẢ HÀNG']} title="CHI TIẾT PHIẾU TRẢ HÀNG"><button className="return-btn return-btn--outline" onClick={() => navigate(LIST_ROUTE)}><HiOutlineArrowLeft /> QUAY LẠI</button></PageHero><div className="returns-create-meta"><strong>{record.id}</strong><StatusBadge status={record.trangThai} /></div>{toast && <div className="returns-toast" role="status">{toast}</div>}
    <div className="returns-detail-grid"><div className="returns-detail-main"><Panel title="THÔNG TIN TRẢ HÀNG"><dl className="returns-info-grid"><Info label="MÃ PHIẾU TRẢ">{record.id}</Info><Info label="ĐƠN HÀNG GỐC">{record.orderId}</Info><Info label="NGÀY TẠO">{dateOnly(record.createdAt)}</Info><Info label="LÝ DO TRẢ">{record.lyDoTra}</Info></dl></Panel>
      <Panel title="SẢN PHẨM TRẢ" flush><div className="returns-table-scroll"><table className="returns-table"><thead><tr><th>SẢN PHẨM</th><th>PHIÊN BẢN</th><th>SỐ LƯỢNG TRẢ</th><th>ĐƠN GIÁ HOÀN</th><th>THÀNH TIỀN HOÀN</th></tr></thead><tbody>{itemPagination.visibleItems.map((item) => <tr key={item.lineItemRef}><td><strong>{item.sanPham}</strong></td><td>{item.phienBan}</td><td>{item.slTra}</td><td className="returns-money returns-money--black">{money(item.donGiaHoan)}</td><td className="returns-money returns-money--black">{money(item.thanhTienHoan)}</td></tr>)}</tbody></table></div><DetailTablePagination totalItems={record.lineItems.length} currentPage={itemPagination.currentPage} onPageChange={itemPagination.onPageChange} idPrefix="return-items" /><footer className="return-panel-total"><span>TỔNG SỐ LƯỢNG TRẢ: <strong>{totals.quantity}</strong></span><span>TỔNG TIỀN HOÀN: <strong>{money(totals.amount)}</strong></span></footer></Panel>
      <Panel title="NHẬN HÀNG TRẢ"><div className="return-action-row">{record.receiveResult ? <div><span className="return-complete-badge">✓ ĐÃ NHẬN HÀNG</span><span className="return-action-summary">Nguyên vẹn: {receivedSummary.good} · Lỗi: {receivedSummary.bad}</span></div> : <p>Chưa nhận hàng trả về</p>}{!record.receiveResult && <button className="return-btn return-btn--black" onClick={() => setReceiving(true)}>NHẬN HÀNG</button>}</div></Panel>
      <Panel title="HOÀN TIỀN"><div className="return-action-row">{record.refund ? <span className="return-complete-badge">✓ ĐÃ HOÀN TẤT HOÀN TIỀN</span> : record.receiveResult ? <p>Sẵn sàng hoàn tiền — <strong>{money(totals.amount)}</strong></p> : <p>Cần nhận hàng trước khi hoàn tiền</p>}{record.receiveResult && !record.refund && <button className="return-btn return-btn--danger" onClick={() => setRefunding(true)}>HOÀN TIỀN</button>}</div></Panel>
    </div><aside className="returns-detail-side"><SideCard title="ĐƠN HÀNG GỐC"><strong>{record.orderId}</strong><button className="return-btn return-btn--outline return-btn--wide" disabled={!order} onClick={() => navigate(`${ORDER_DETAIL_ROUTE}/${record.orderId}`)}>XEM ĐƠN HÀNG</button></SideCard><SideCard title="KHÁCH HÀNG"><p className={!record.khachHang ? 'returns-guest' : ''}>{guestName(record.khachHang)}</p></SideCard><SideCard title="HÌNH THỨC HOÀN"><strong>{record.refund?.phuongThuc || record.hinhThucHoanTienDuKien}</strong></SideCard></aside></div>
    {receiving && <ReceiveModal record={record} onClose={() => setReceiving(false)} onConfirm={confirmReceive} />}{refunding && <RefundModal record={record} onClose={() => setRefunding(false)} onConfirm={confirmRefund} />}
  </div>;
}

function ReceiveModal({ record, onClose, onConfirm }) {
  const [good, setGood] = useState(() => Object.fromEntries(record.lineItems.map((item) => [item.lineItemRef, item.slTra])));
  useEscape(onClose);
  const change = (item, value) => setGood((current) => ({ ...current, [item.lineItemRef]: Math.min(item.slTra, Math.max(0, Number(value) || 0)) }));
  const result = record.lineItems.map((item) => ({ lineItemRef: item.lineItemRef, slNguyenVen: good[item.lineItemRef], slLoi: item.slTra - good[item.lineItemRef] }));
  return <ModalShell title={`NHẬN HÀNG TRẢ – ${record.id}`} onClose={onClose}><div className="returns-modal-table-wrap"><table className="returns-table"><thead><tr><th>SẢN PHẨM</th><th>PHIÊN BẢN</th><th>SL PHẢI NHẬN</th><th>SL NGUYÊN VẸN</th><th>SL LỖI</th></tr></thead><tbody>{record.lineItems.map((item) => <tr key={item.lineItemRef}><td><strong>{item.sanPham}</strong></td><td>{item.phienBan}</td><td>{item.slTra}</td><td><input className="returns-quantity" type="number" min="0" max={item.slTra} value={good[item.lineItemRef]} onChange={(event) => change(item, event.target.value)} /></td><td>{item.slTra - good[item.lineItemRef]}</td></tr>)}</tbody></table></div><ModalFooter onClose={onClose}><button className="return-btn return-btn--black" onClick={() => onConfirm(result)}>XÁC NHẬN NHẬN HÀNG</button></ModalFooter></ModalShell>;
}

function RefundModal({ record, onClose, onConfirm }) {
  const [method, setMethod] = useState(record.hinhThucHoanTienDuKien || 'Tiền mặt');
  const [refundDate, setRefundDate] = useState(today());
  const [transactionCode, setTransactionCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  useEscape(onClose);
  const valid = refundDate && confirmed && (method !== 'Chuyển khoản' || transactionCode.trim());
  const submit = () => { setSubmitted(true); if (valid) onConfirm({ phuongThuc: method, ngayHoanTien: refundDate, maGiaoDich: method === 'Chuyển khoản' ? transactionCode.trim() : undefined, xacNhanDuTien: true }); };
  return <ModalShell title="XÁC NHẬN HOÀN TIỀN" onClose={onClose}><div className="refund-modal-body"><div className="refund-info"><Info label="MÃ PHIẾU TRẢ">{record.id}</Info><Info label="KHÁCH HÀNG">{guestName(record.khachHang)}</Info><div className="refund-total"><span>TỔNG TIỀN HOÀN</span><strong>{money(returnTotals(record).amount)}</strong></div></div><label className="refund-label">PHƯƠNG THỨC HOÀN *</label><RadioPair value={method} onChange={setMethod} /><label className="refund-field"><span>NGÀY HOÀN TIỀN *</span><input type="date" value={refundDate} onChange={(event) => setRefundDate(event.target.value)} />{submitted && !refundDate && <FieldError>Vui lòng chọn ngày hoàn tiền.</FieldError>}</label>{method === 'Chuyển khoản' && <label className="refund-field"><span>MÃ GIAO DỊCH *</span><input value={transactionCode} onChange={(event) => setTransactionCode(event.target.value)} placeholder="Nhập mã giao dịch..." />{submitted && !transactionCode.trim() && <FieldError>Vui lòng nhập mã giao dịch.</FieldError>}</label>}<label className="refund-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>XÁC NHẬN ĐÃ HOÀN ĐỦ TIỀN CHO KHÁCH</span></label>{submitted && !confirmed && <FieldError>Vui lòng xác nhận đã hoàn đủ tiền cho khách.</FieldError>}</div><ModalFooter onClose={onClose}><button className="return-btn return-btn--danger" disabled={!valid} onClick={submit}>XÁC NHẬN HOÀN TIỀN</button></ModalFooter></ModalShell>;
}

function PageHero({ breadcrumb, title, subtitle, children }) { return <section className="returns-hero"><div><nav>{breadcrumb.map((item, index) => <span key={item}>{index > 0 && <i>›</i>}{item}</span>)}</nav><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children}</section>; }
function Panel({ title, children, flush }) { return <section className={`return-panel ${flush ? 'return-panel--flush' : ''}`}><header><span />{title}</header><div className="return-panel__body">{children}</div></section>; }
function SideCard({ title, dark, children }) { return <section className={`return-side-card ${dark ? 'return-side-card--dark' : ''}`}><h2>{title}</h2><div>{children}</div></section>; }
function Info({ label, children }) { return <div className="return-info"><dt>{label}</dt><dd>{children}</dd></div>; }
function FieldError({ children }) { return <small className="return-error">{children}</small>; }
function StatusBadge({ status }) { return <span className={`return-status return-status--${status}`}>{statusLabel(status)}</span>; }
function TypeBadge({ type }) { return <span className="return-type">{String(type || '').toUpperCase()}</span>; }
function OrderBadge({ value }) { return <span className="return-paid-badge">{String(value || '').toUpperCase()}</span>; }
function RadioPair({ value, onChange }) { return <div className="return-radios">{['Tiền mặt', 'Chuyển khoản'].map((item) => <label key={item}><input type="radio" checked={value === item} onChange={() => onChange(item)} />{item.toUpperCase()}</label>)}</div>; }
function ModalShell({ title, onClose, children, wide }) { return <div className="return-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`return-modal ${wide ? 'return-modal--wide' : ''}`} role="dialog" aria-modal="true"><header><h2>{title}</h2><button onClick={onClose} aria-label="Đóng"><HiOutlineX /></button></header>{children}</section></div>; }
function ModalFooter({ onClose, children }) { return <footer className="return-modal-footer"><button className="return-btn return-btn--outline" onClick={onClose}>HỦY</button>{children}</footer>; }
function NotFound({ title, text, onBack }) { return <div className="returns-not-found"><h1>{title}</h1>{text && <p>{text}</p>}<button className="return-btn return-btn--outline" onClick={onBack}>QUAY LẠI DANH SÁCH</button></div>; }
function useEscape(onClose) { useEffect(() => { const handler = (event) => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, [onClose]); }
