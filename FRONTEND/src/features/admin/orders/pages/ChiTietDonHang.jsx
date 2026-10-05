import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import { approveOrder, cancelOrder, confirmOrderPayment, confirmPickup, dateTime, exportOrder, getExportVariant, getOrder, getOrderHistory, getOrderOptions, getSerialRequirements, label, money, refundOrder, setPackingStatus, startFulfillment } from '../api/orderApi';
import { OrderStateBadge } from './DanhSachDonHang';
import './ChiTietDonHang.css';
import OrderModal from '../components/OrderModal';
import ExportOrderDialog from '../components/ExportOrderDialog';

const now = () => new Date().toISOString();

export default function ChiTietDonHang() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [dialog, setDialog] = useState(null);
  const [options, setOptions] = useState({ warehouses: [], partners: [] });
  const [state, setState] = useState({ loading: true, busy: false, error: '' });
  const load = useCallback(async (signal) => { try { const [detail, events] = await Promise.all([getOrder(orderId, signal), getOrderHistory(orderId, signal)]); setOrder(detail); setHistory(events); setState((s) => ({ ...s, loading: false, error: '' })); } catch (error) { if (error.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error: error.message })); } }, [orderId]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); getOrderOptions(controller.signal).then(setOptions).catch(() => {}); return () => controller.abort(); }, [load]);
  const products = useDetailTablePagination(order?.san_pham || []);
  const run = async (work) => { setState((s) => ({ ...s, busy: true, error: '' })); try { const result = await work(); if (result?.id) setOrder(result); await load(); setDialog(null); setState((s) => ({ ...s, busy: false })); } catch (error) { setState((s) => ({ ...s, busy: false, error: error.message })); } };
  useEffect(() => {
    if (!isCancelOpen) return undefined;
    const close = (event) => { if (event.key === 'Escape') setIsCancelOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isCancelOpen]);

  if (state.loading) return <section className="admin-order-detail admin-order-not-found"><h1>ĐANG TẢI ĐƠN HÀNG...</h1></section>;
  if (!order) return <section className="admin-order-detail admin-order-not-found"><h1>KHÔNG THỂ TẢI ĐƠN HÀNG</h1><p>{state.error}</p><button type="button" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}>QUAY LẠI DANH SÁCH</button></section>;

  const open = (type, title, fields = {}) => { setState((s) => ({ ...s, error: '' })); setDialog({ type, title, confirmed: false, ...fields }); };
  const approve = () => open('approve', 'DUYỆT ĐƠN');
  const fulfillment = () => {
    open('fulfillment', 'BẮT ĐẦU ĐÓNG GÓI', { partner: '', fee: String(order.phi_giao_hang || 0) });
  };
  const payment = () => open('payment', 'XÁC NHẬN THANH TOÁN');
  const cancel = () => run(async () => { await cancelOrder(order.id, cancelReason); setIsCancelOpen(false); setCancelReason(''); });
  const refund = () => open('refund', 'HOÀN TIỀN', { method: order.phuong_thuc_thanh_toan || 'TIEN_MAT', transaction: '' });
  const warehouseExport = async () => {
    try {
      setState((s) => ({ ...s, busy: true, error: '' }));
      const requirements = await getSerialRequirements(order.id);
      const variants = new Map(await Promise.all([...new Set((requirements.items || []).flatMap((line) => line.serial_requirements.map((item) => item.phien_ban_id)))].map(async (id) => [id, (await getExportVariant(id)).phien_ban])));
      const groups = (requirements.items || []).flatMap((line) => line.serial_requirements.map((requirement) => ({ lineId: line.chi_tiet_don_hang_id, ...requirement, name: variants.get(requirement.phien_ban_id)?.ten_phien_ban || `Phiên bản ${requirement.phien_ban_id}`, barcode: variants.get(requirement.phien_ban_id)?.ma_vach, selected: [] })));
      open('export', 'XUẤT KHO ĐƠN HÀNG', { warehouseId: options.warehouses[0]?.id || '', requirements: requirements.items || [], groups });
      setState((s) => ({ ...s, busy: false }));
    } catch (error) { setState((s) => ({ ...s, busy: false, error: error.message })); }
  };

  const beforeExport = order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' && order.trang_thai_don_hang !== 'HUY_HANG';
  const deliveries = order.phieu_giao_hang || [];
  const canPay = order.loai_don_hang === 'ONLINE' && order.trang_thai_don_hang !== 'HUY_HANG'
    && order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN';
  const submitAction = () => {
    if (dialog.type === 'payment') return run(() => confirmOrderPayment(order.id));
    if (!dialog.confirmed) return;
    const { type, partner, fee, method, transaction } = dialog;
    run(() => {
      if (type === 'approve') return approveOrder(order.id);
      if (type === 'pickup') return confirmPickup(order.id);
      if (type === 'packed' || type === 'cancelPacking') return setPackingStatus(order.id, type === 'packed' ? 'DA_DONG_GOI' : 'HUY_DONG_GOI');
      if (type === 'fulfillment') return startFulfillment(order.id, { doi_tac_van_chuyen_id: order.hinh_thuc_nhan_hang === 'GIAO_HANG' ? Number(partner) : null, phi_tra_doi_tac: order.hinh_thuc_nhan_hang === 'GIAO_HANG' ? Number(fee) : null });
      if (type === 'refund') return refundOrder(order.id, { phuong_thuc_hoan: method, ngay_hoan_tien: now(), ma_giao_dich: transaction.trim() || null });
    });
  };
  return <section className="admin-order-detail" aria-busy={state.busy}>
    <header className="order-detail-hero">
      <div>
        <nav aria-label="Breadcrumb nội dung"><span>ĐƠN HÀNG</span><span>›</span><span>DANH SÁCH ĐƠN HÀNG</span><span>›</span><strong>{order.ma_don_hang}</strong></nav>
        <div className="order-detail-heading"><h1>{order.ma_don_hang}</h1><OrderStateBadge value={order.loai_don_hang} /></div>
        <p>{dateTime(order.ngay_tao)}</p>
        <div className="order-detail-statuses"><OrderStateBadge value={order.trang_thai_don_hang} /><OrderStateBadge value={order.trang_thai_thanh_toan} /><OrderStateBadge value={order.trang_thai_dong_goi} /><OrderStateBadge value={order.trang_thai_xuat_kho} /></div>
      </div>
      <div className="order-detail-hero__actions">
        {order.loai_don_hang === 'ONLINE' && order.trang_thai_don_hang === 'CHO_DUYET' && <><Action disabled={state.busy} click={() => navigate(`/admin/don-hang/dat-hang-online/${order.id}`)}>CHỈNH SỬA ĐƠN</Action><Action disabled={state.busy} click={approve}>DUYỆT ĐƠN</Action></>}
        {order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG' && order.trang_thai_don_hang === 'CHO_LAY_HANG' && order.trang_thai_xuat_kho === 'DA_XUAT_KHO' && order.trang_thai_thanh_toan === 'DA_THANH_TOAN' && <Action disabled={state.busy} click={() => open('pickup', 'XÁC NHẬN ĐÃ NHẬN')}>XÁC NHẬN ĐÃ NHẬN</Action>}
        {beforeExport && order.loai_don_hang === 'ONLINE' && ['CHO_DUYET', 'CHO_THANH_TOAN', 'CHO_DONG_GOI'].includes(order.trang_thai_don_hang) && <Action danger disabled={state.busy} click={() => { setState((s) => ({ ...s, error: '' })); setIsCancelOpen(true); }}>HỦY ĐƠN HÀNG</Action>}
        {order.loai_don_hang === 'ONLINE' && order.trang_thai_xuat_kho === 'DA_XUAT_KHO' && ['CHO_DONG_GOI', 'CHO_LAY_HANG', 'DANG_GIAO_HANG'].includes(order.trang_thai_don_hang) && <button className="order-action order-action--back" type="button" disabled>ĐƠN ĐÃ XUẤT KHO - KHÔNG THỂ HỦY TRỰC TIẾP</button>}
        {order.trang_thai_don_hang === 'HUY_HANG' && order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' && order.trang_thai_thanh_toan === 'DA_THANH_TOAN' && <Action disabled={state.busy} click={refund}>HOÀN TIỀN</Action>}
        <button type="button" className="order-action order-action--back" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}><HiOutlineArrowLeft size={14} /> QUAY LẠI DANH SÁCH</button>
      </div>
    </header>
    {state.error && <p className="order-api-message order-api-message--error" role="alert">{state.error}</p>}
    <div className="order-detail-content">
      <div className="order-detail-main">
        <Panel title="SẢN PHẨM TRONG ĐƠN">
          <div className="order-products-table-wrap"><table className="order-products-table">
            <thead><tr><th>ẢNH</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>MÃ VẠCH</th><th>ĐƠN GIÁ</th><th>SL</th><th>THÀNH TIỀN</th></tr></thead>
            <tbody>{products.visibleItems.map((item) => <tr key={item.chi_tiet_don_hang_id}><td>—</td><td><strong>{item.ten_san_pham}</strong><span>{item.ten_phien_ban || '—'}</span></td><td>—</td><td className="align-right">{money(item.don_gia)}</td><td className="align-center">{item.so_luong}</td><td className="align-right"><strong>{money(item.thanh_tien)}</strong></td></tr>)}</tbody>
          </table></div>
          <DetailTablePagination totalItems={(order.san_pham || []).length} currentPage={products.currentPage} onPageChange={products.onPageChange} idPrefix="order-products" />
        </Panel>
        <Panel title="THANH TOÁN">
          <dl className="order-detail-kv"><Info text="PHƯƠNG THỨC">{label(order.phuong_thuc_thanh_toan)}</Info><Info text="TRẠNG THÁI"><OrderStateBadge value={order.trang_thai_thanh_toan} /></Info><Info text="MÃ GIAO DỊCH">{order.ma_giao_dich_thanh_toan || '—'}</Info></dl>
          {canPay && <div className="order-panel-actions"><Action disabled={state.busy} click={payment}>XÁC NHẬN THANH TOÁN</Action></div>}
        </Panel>
        <Panel title="ĐÓNG GÓI VÀ XUẤT KHO">
          <div className="order-fulfillment-grid"><div><span>ĐÓNG GÓI</span><OrderStateBadge value={order.trang_thai_dong_goi} /></div><div><span>XUẤT KHO</span><OrderStateBadge value={order.trang_thai_xuat_kho} /></div></div>
          {beforeExport && order.loai_don_hang === 'ONLINE' && order.trang_thai_don_hang === 'CHO_DONG_GOI' && ['CHUA_DONG_GOI', 'HUY_DONG_GOI'].includes(order.trang_thai_dong_goi) && <div className="order-panel-actions"><Action disabled={state.busy} click={fulfillment}>BẮT ĐẦU ĐÓNG GÓI</Action></div>}
          {beforeExport && order.trang_thai_dong_goi === 'DANG_DONG_GOI' && <div className="order-panel-actions"><Action disabled={state.busy} click={() => open('packed', 'HOÀN TẤT ĐÓNG GÓI')}>HOÀN TẤT ĐÓNG GÓI</Action><Action secondary disabled={state.busy} click={() => open('cancelPacking', 'HỦY ĐÓNG GÓI')}>HỦY ĐÓNG GÓI</Action></div>}
          {beforeExport && order.trang_thai_dong_goi === 'DA_DONG_GOI' && <div className="order-panel-actions"><Action disabled={state.busy} click={warehouseExport}>CHUẨN BỊ XUẤT KHO</Action><Action secondary disabled={state.busy} click={() => open('cancelPacking', 'HỦY ĐÓNG GÓI')}>HỦY ĐÓNG GÓI</Action></div>}
        </Panel>
        <Panel title="GIAO VẬN">
          {deliveries.length ? deliveries.map((item) => <dl className="order-detail-kv" key={item.id}>
            {deliveries.length > 1 && <Info text="MÃ PHIẾU">{item.ma_phieu_giao_hang}</Info>}
            <Info text="ĐƠN VỊ VẬN CHUYỂN">{item.ten_doi_tac_van_chuyen || options.partners.find((partner) => partner.id === item.doi_tac_van_chuyen_id)?.ten_doi_tac || '—'}</Info>
            <Info text="MÃ VẬN ĐƠN"><span className={item.ma_van_don ? '' : 'order-alert-text'}>{item.ma_van_don || 'CHƯA CÓ MÃ VẬN ĐƠN'}</span></Info>
            <Info text="TRẠNG THÁI">{label(item.trang_thai_giao_hang)}</Info>
            <Info text="PHÍ GIAO HÀNG">{money(order.phi_giao_hang)}</Info>
          </dl>) : <dl className="order-detail-kv"><Info text="ĐƠN VỊ VẬN CHUYỂN">—</Info><Info text="MÃ VẬN ĐƠN">—</Info><Info text="PHÍ GIAO HÀNG">{money(order.phi_giao_hang)}</Info></dl>}
        </Panel>
        <Panel title="LỊCH SỬ XỬ LÝ">{history.length ? <ol className="order-timeline">{history.map((event) => <li className="order-timeline__item" key={event.id}><time dateTime={event.ngay_thuc_hien}>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(event.ngay_thuc_hien))}</time><strong>{event.mo_ta}</strong><p>{event.nguoi_thuc_hien}</p><div className="order-detail-statuses"><OrderStateBadge value={event.trang_thai_don_hang} /><OrderStateBadge value={event.trang_thai_dong_goi} /><OrderStateBadge value={event.trang_thai_xuat_kho} /></div></li>)}</ol> : <p className="order-note">Chưa có lịch sử xử lý được ghi nhận.</p>}</Panel>
      </div>
      <aside className="order-detail-sidebar">
        <Panel title="KHÁCH HÀNG"><dl className="order-sidebar-kv"><Info text="HỌ TÊN">{order.ten_khach_hang || '—'}</Info><Info text="SỐ ĐIỆN THOẠI">{order.so_dien_thoai_khach_hang || '—'}</Info></dl></Panel>
        <Panel title="NGƯỜI NHẬN"><dl className="order-sidebar-kv"><Info text="TÊN NGƯỜI NHẬN">{order.ten_nguoi_nhan || '—'}</Info><Info text="SỐ ĐIỆN THOẠI">{order.sdt_nguoi_nhan || '—'}</Info><Info text="ĐỊA CHỈ GIAO HÀNG">{order.dia_chi_giao_hang || '—'}</Info></dl></Panel>
        <Panel title="TỔNG KẾT"><dl className="order-summary"><Info text="TIỀN HÀNG">{money(order.tong_tien_hang)}</Info><Info text="CHIẾT KHẤU">{order.tien_chiet_khau == null || Number(order.tien_chiet_khau) === 0 ? '—' : money(order.tien_chiet_khau)}</Info><Info text="PHÍ GIAO HÀNG">{money(order.phi_giao_hang)}</Info><div className="order-summary-total"><dt>KHÁCH PHẢI TRẢ</dt><dd>{money(order.tong_thanh_toan)}</dd></div></dl></Panel>
        <Panel title="KHUYẾN MẠI / ƯU ĐÃI"><p className="order-note">—</p></Panel>
        <Panel title="GHI CHÚ"><p className="order-note">{order.ghi_chu || 'Không có ghi chú.'}</p></Panel>
      </aside>
    </div>
    {isCancelOpen && <div className="order-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCancelOpen(false); }}>
      <section className="order-cancel-modal" role="alertdialog" aria-modal="true" aria-labelledby="cancel-order-title">
        <header><h2 id="cancel-order-title">HỦY ĐƠN HÀNG</h2></header>
        <div className="order-cancel-modal__body"><label htmlFor="cancel-reason">LÝ DO HỦY</label><textarea id="cancel-reason" required maxLength={255} disabled={state.busy} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Nhập lý do hủy đơn..." autoFocus /></div>
        {state.error && <p className="order-api-message order-api-message--error" role="alert">{state.error}</p>}
        <footer><button type="button" className="order-action order-action--back" disabled={state.busy} onClick={() => setIsCancelOpen(false)}>QUAY LẠI</button><button type="button" className="order-action order-action--confirm-cancel" disabled={state.busy || !cancelReason.trim()} onClick={cancel}>XÁC NHẬN HỦY ĐƠN</button></footer>
      </section>
    </div>}
    {dialog?.type === 'export' ? <ExportOrderDialog order={order} dialog={dialog} setDialog={setDialog} warehouses={options.warehouses} busy={state.busy} error={state.error} submit={(body) => run(() => exportOrder(order.id, body))} /> : dialog && <OrderActionDialog dialog={dialog} setDialog={setDialog} order={order} options={options} busy={state.busy} error={state.error} submit={submitAction} />}
  </section>;
}

function Action({ children, click, danger = false, secondary = false, disabled = false }) { return <button type="button" disabled={disabled} className={`order-action ${danger ? 'order-action--danger' : secondary ? 'order-action--secondary' : 'order-action--black'}`} onClick={click}>{children}</button>; }
function Panel({ title, children }) { return <section className="order-detail-panel"><h2><span />{title}</h2>{children}</section>; }
function Info({ text, children }) { return <div><dt>{text}</dt><dd>{children}</dd></div>; }

function OrderActionDialog({ dialog, setDialog, order, options, busy, error, submit }) {
  const change = (key, value) => setDialog((current) => ({ ...current, [key]: value }));
  const payment = dialog.type === 'payment';
  const monetary = dialog.type === 'refund';
  const shipping = dialog.type === 'fulfillment' && order.hinh_thuc_nhan_hang === 'GIAO_HANG';
  const field = (caption, key, type = 'text', extra = {}) => <label className="order-operation-field"><span>{caption}</span><input type={type} value={dialog[key]} onChange={(event) => change(key, event.target.value)} {...extra} /></label>;
  return <OrderModal title={dialog.title} close={() => setDialog(null)} busy={busy} submit={submit} error={error} disabled={!payment && !dialog.confirmed}>
    <p>{order.ma_don_hang} · {money(order.tong_thanh_toan)}</p>
    {shipping && options.partners.length === 0 && <p role="status">Chưa có đối tác vận chuyển. Chưa thể bắt đầu đóng gói đơn giao hàng.</p>}
    {shipping && <><label className="order-operation-field"><span>ĐƠN VỊ VẬN CHUYỂN</span><select required value={dialog.partner} onChange={(event) => change('partner', event.target.value)}><option value="">— Chọn đối tác —</option>{options.partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.ten_doi_tac || partner.ten || partner.ma_doi_tac}</option>)}</select></label>{field('PHÍ TRẢ ĐỐI TÁC (đ)', 'fee', 'number', { min: 0, step: 1, required: true })}</>}
    {monetary && <><label className="order-operation-field"><span>PHƯƠNG THỨC</span><select value={dialog.method} onChange={(event) => change('method', event.target.value)}>{['TIEN_MAT', 'CHUYEN_KHOAN', 'THE'].map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></label>{dialog.method !== 'TIEN_MAT' && field('MÃ GIAO DỊCH', 'transaction', 'text', { required: true, maxLength: 255, pattern: '.*\\S.*' })}</>}
    {!payment && <label className="order-operation-confirm"><input type="checkbox" checked={dialog.confirmed} onChange={(event) => change('confirmed', event.target.checked)} />{dialog.type === 'refund' ? 'Xác nhận đã hoàn tiền cho khách' : 'Xác nhận thực hiện thao tác'}</label>}
  </OrderModal>;
}
