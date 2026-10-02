import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import { approveOrder, cancelOrder, confirmOrderPayment, confirmPickup, dateTime, exportOrder, getOrder, getOrderOptions, getSerialCandidates, getSerialRequirements, label, money, refundOrder, setPackingStatus, startFulfillment } from '../api/orderApi';
import { OrderStateBadge } from './DanhSachDonHang';
import './ChiTietDonHang.css';

const ask = (message, initial = '') => window.prompt(message, initial)?.trim();
const now = () => new Date().toISOString();

export default function ChiTietDonHang() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [options, setOptions] = useState({ warehouses: [], partners: [] });
  const [state, setState] = useState({ loading: true, busy: false, error: '', success: '' });
  const load = useCallback(async (signal) => { try { setOrder(await getOrder(orderId, signal)); setState((s) => ({ ...s, loading: false, error: '' })); } catch (error) { if (error.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error: error.message })); } }, [orderId]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); getOrderOptions(controller.signal).then(setOptions).catch(() => {}); return () => controller.abort(); }, [load]);
  const products = useDetailTablePagination(order?.san_pham || []);
  const run = async (work, success) => { setState((s) => ({ ...s, busy: true, error: '', success: '' })); try { await work(); await load(); setState((s) => ({ ...s, busy: false, success })); } catch (error) { setState((s) => ({ ...s, busy: false, error: error.message })); } };

  if (state.loading) return <section className="admin-order-detail admin-order-not-found"><h1>ĐANG TẢI ĐƠN HÀNG...</h1></section>;
  if (!order) return <section className="admin-order-detail admin-order-not-found"><h1>KHÔNG THỂ TẢI ĐƠN HÀNG</h1><p>{state.error}</p><button type="button" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}>QUAY LẠI DANH SÁCH</button></section>;

  const approve = () => window.confirm('Xác nhận duyệt đơn hàng?') && run(() => approveOrder(order.id), 'Đã duyệt đơn hàng.');
  const fulfillment = () => {
    if (order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG') return window.confirm('Bắt đầu xử lý đơn nhận tại cửa hàng?') && run(() => startFulfillment(order.id, { doi_tac_van_chuyen_id: null, phi_tra_doi_tac: null }), 'Đã bắt đầu xử lý đơn.');
    const partner = ask(`Nhập ID đối tác vận chuyển:\n${options.partners.map((item) => `${item.id}: ${item.ten_doi_tac || item.ten || item.ma_doi_tac}`).join('\n')}`);
    const fee = ask('Nhập phí trả đối tác (đ):', String(order.phi_giao_hang || 0));
    if (partner && fee != null) run(() => startFulfillment(order.id, { doi_tac_van_chuyen_id: Number(partner), phi_tra_doi_tac: Number(fee) }), 'Đã bắt đầu xử lý giao hàng.');
  };
  const payment = () => {
    const deliveryId = order.phieu_giao_hang?.length ? ask('Để trống nếu thu từ khách; nhập ID phiếu giao hàng nếu shipper nộp COD:') : '';
    const method = ask('Phương thức: TIEN_MAT, CHUYEN_KHOAN hoặc THE', order.phuong_thuc_thanh_toan || 'TIEN_MAT');
    const amount = ask('Số tiền đã nhận (đ):', String(order.tong_thanh_toan || ''));
    const transaction = method !== 'TIEN_MAT' ? ask('Mã giao dịch:') : null;
    if (method && Number(amount) > 0) run(() => confirmOrderPayment(order.id, { nguon_thu: deliveryId ? 'DOI_TAC_GIAO_HANG' : 'KHACH_HANG', ...(deliveryId ? { phieu_giao_hang_id: Number(deliveryId) } : {}), phuong_thuc_thanh_toan: method, so_tien_thanh_toan: Number(amount), ngay_thanh_toan: now(), ma_giao_dich_thanh_toan: transaction || null, xac_nhan_da_nhan_tien: true }), 'Đã ghi nhận thanh toán.');
  };
  const cancel = () => { const reason = ask('Nhập lý do hủy đơn:'); if (reason) run(() => cancelOrder(order.id, reason), 'Đã hủy đơn hàng.'); };
  const refund = () => { const method = ask('Phương thức hoàn: TIEN_MAT, CHUYEN_KHOAN hoặc THE', order.phuong_thuc_thanh_toan || 'TIEN_MAT'); const code = method !== 'TIEN_MAT' ? ask('Mã giao dịch hoàn tiền:') : null; if (method) run(() => refundOrder(order.id, { phuong_thuc_hoan: method, ngay_hoan_tien: now(), ma_giao_dich: code || null }), 'Đã ghi nhận hoàn tiền.'); };
  const warehouseExport = async () => {
    try {
      setState((s) => ({ ...s, busy: true, error: '', success: '' }));
      const requirements = await getSerialRequirements(order.id);
      const items = [];
      for (const line of requirements.items || []) {
        const serials = [];
        for (const requirement of line.serial_requirements || []) {
          const candidates = await getSerialCandidates(order.id, { chi_tiet_don_hang_id: line.chi_tiet_don_hang_id, phien_ban_id: requirement.phien_ban_id, page: 0, limit: 100 });
          const choice = ask(`Chọn đúng ${requirement.so_luong_can_serial} serial cho phiên bản ${requirement.phien_ban_id}. Nhập ID, cách nhau bằng dấu phẩy:\n${(candidates.items || []).map((item) => `${item.id}: ${item.so_serial}`).join('\n')}`);
          const ids = (choice || '').split(',').map(Number).filter(Number.isFinite);
          if (ids.length !== requirement.so_luong_can_serial) throw new Error(`Phải chọn đúng ${requirement.so_luong_can_serial} serial.`);
          serials.push({ phien_ban_id: requirement.phien_ban_id, serial_ids: ids });
        }
        items.push({ chi_tiet_don_hang_id: line.chi_tiet_don_hang_id, serials });
      }
      const warehouseId = ask(`Nhập ID kho xuất:\n${options.warehouses.map((item) => `${item.id}: ${item.name}`).join('\n')}`, String(options.warehouses[0]?.id || ''));
      if (!warehouseId) throw new Error('Chưa chọn kho xuất.');
      await exportOrder(order.id, { kho_hang_id: Number(warehouseId), items }); await load(); setState((s) => ({ ...s, busy: false, success: 'Đã xuất kho toàn bộ đơn hàng.' }));
    } catch (error) { setState((s) => ({ ...s, busy: false, error: error.message })); }
  };

  const beforeExport = order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' && order.trang_thai_don_hang !== 'HUY_HANG';
  return <section className="admin-order-detail">
    <header className="order-detail-hero"><div><nav>ĐƠN HÀNG › DANH SÁCH ĐƠN HÀNG › <strong>{order.ma_don_hang}</strong></nav><div className="order-detail-heading"><h1>{order.ma_don_hang}</h1><OrderStateBadge value={order.loai_don_hang} /></div><p>{dateTime(order.ngay_tao)}</p><div className="order-detail-statuses"><OrderStateBadge value={order.trang_thai_don_hang} /><OrderStateBadge value={order.trang_thai_thanh_toan} /><OrderStateBadge value={order.trang_thai_dong_goi} /><OrderStateBadge value={order.trang_thai_xuat_kho} /></div></div><div className="order-detail-hero__actions"><button type="button" className="order-action order-action--back" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}><HiOutlineArrowLeft /> QUAY LẠI DANH SÁCH</button></div></header>
    {state.error && <p className="order-api-message order-api-message--error">{state.error}</p>}{state.success && <p className="order-api-message order-api-message--success">{state.success}</p>}
    <div className="order-lifecycle-actions">
      {order.loai_don_hang === 'ONLINE' && order.trang_thai_don_hang === 'CHO_DUYET' && <Action click={() => navigate(`/admin/don-hang/dat-hang-online/${order.id}`)}>CHỈNH SỬA ĐƠN</Action>}
      {order.loai_don_hang === 'ONLINE' && order.trang_thai_don_hang === 'CHO_DUYET' && <Action click={approve}>DUYỆT ĐƠN</Action>}
      {order.trang_thai_don_hang === 'CHO_DONG_GOI' && ['CHUA_DONG_GOI', 'HUY_DONG_GOI'].includes(order.trang_thai_dong_goi) && <Action click={fulfillment}>BẮT ĐẦU XỬ LÝ</Action>}
      {beforeExport && order.trang_thai_dong_goi === 'DANG_DONG_GOI' && <><Action click={() => run(() => setPackingStatus(order.id, 'DA_DONG_GOI'), 'Đã hoàn tất đóng gói.')}>HOÀN TẤT ĐÓNG GÓI</Action><Action click={() => run(() => setPackingStatus(order.id, 'HUY_DONG_GOI'), 'Đã hủy đóng gói.')}>HỦY ĐÓNG GÓI</Action></>}
      {beforeExport && order.trang_thai_dong_goi === 'DA_DONG_GOI' && <Action click={warehouseExport}>XUẤT KHO / CHỌN SERIAL</Action>}
      {order.trang_thai_don_hang !== 'CHO_DUYET' && order.trang_thai_don_hang !== 'HUY_HANG' && (order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN' || (order.phieu_giao_hang || []).some((item) => item.trang_thai_giao_hang === 'GIAO_THANH_CONG' && Number(item.tien_thu_ho_cod) > 0)) && <Action click={payment}>XÁC NHẬN THANH TOÁN / COD</Action>}
      {order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG' && order.trang_thai_xuat_kho === 'DA_XUAT_KHO' && order.trang_thai_thanh_toan === 'DA_THANH_TOAN' && order.trang_thai_don_hang !== 'HOAN_THANH' && <Action click={() => window.confirm('Xác nhận khách đã nhận hàng?') && run(() => confirmPickup(order.id), 'Đã xác nhận khách nhận hàng.')}>XÁC NHẬN ĐÃ NHẬN</Action>}
      {beforeExport && <Action danger click={cancel}>HỦY ĐƠN HÀNG</Action>}
      {order.trang_thai_don_hang === 'HUY_HANG' && order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' && order.trang_thai_thanh_toan === 'DA_THANH_TOAN' && <Action click={refund}>HOÀN TIỀN</Action>}
    </div>
    <div className="order-detail-content"><div className="order-detail-main">
      <Panel title="SẢN PHẨM TRONG ĐƠN"><div className="order-products-table-wrap"><table className="order-products-table"><thead><tr><th>SẢN PHẨM / PHIÊN BẢN</th><th>MÃ SP</th><th>ĐƠN GIÁ</th><th>SL</th><th>VAT</th><th>CHIẾT KHẤU</th><th>THÀNH TIỀN</th></tr></thead><tbody>{products.visibleItems.map((item) => <tr key={item.chi_tiet_don_hang_id}><td><strong>{item.ten_san_pham}</strong><span>{item.ten_phien_ban || '—'}</span></td><td>{item.ma_san_pham || '—'}</td><td>{money(item.don_gia)}</td><td>{item.so_luong}</td><td>{item.thue_vat == null ? '—' : item.thue_vat}</td><td>{money(item.tien_chiet_khau)}</td><td><strong>{money(item.thanh_tien)}</strong></td></tr>)}</tbody></table></div><DetailTablePagination totalItems={(order.san_pham || []).length} currentPage={products.currentPage} onPageChange={products.onPageChange} idPrefix="order-products" /></Panel>
      <Panel title="SERIAL ĐÃ XUẤT"><SimpleTable headers={['SERIAL', 'PHIÊN BẢN', 'TRẠNG THÁI']} rows={(order.serials || []).map((item) => [item.so_serial, item.phien_ban_id, label(item.trang_thai)])} /></Panel>
      <Panel title="PHIẾU GIAO HÀNG"><SimpleTable headers={['MÃ PHIẾU', 'MÃ VẬN ĐƠN', 'TRẠNG THÁI', 'COD', 'PHÍ ĐỐI TÁC']} rows={(order.phieu_giao_hang || []).map((item) => [item.ma_phieu_giao_hang, item.ma_van_don || '—', label(item.trang_thai_giao_hang), money(item.tien_thu_ho_cod), money(item.phi_tra_doi_tac)])} /></Panel>
      <Panel title="THANH TOÁN"><dl className="order-detail-kv"><Info text="PHƯƠNG THỨC">{label(order.phuong_thuc_thanh_toan)}</Info><Info text="TRẠNG THÁI"><OrderStateBadge value={order.trang_thai_thanh_toan} /></Info><Info text="MÃ GIAO DỊCH">{order.ma_giao_dich_thanh_toan || '—'}</Info></dl></Panel>
    </div><aside className="order-detail-sidebar"><Panel title="KHÁCH HÀNG"><dl className="order-sidebar-kv"><Info text="HỌ TÊN">{order.ten_khach_hang || 'Khách lẻ'}</Info><Info text="SỐ ĐIỆN THOẠI">{order.so_dien_thoai_khach_hang || '—'}</Info></dl></Panel><Panel title="NGƯỜI NHẬN"><dl className="order-sidebar-kv"><Info text="HỌ TÊN">{order.ten_nguoi_nhan || '—'}</Info><Info text="SỐ ĐIỆN THOẠI">{order.sdt_nguoi_nhan || '—'}</Info><Info text="HÌNH THỨC">{label(order.hinh_thuc_nhan_hang)}</Info><Info text="ĐỊA CHỈ">{order.dia_chi_giao_hang || '—'}</Info></dl></Panel><Panel title="TỔNG KẾT"><dl className="order-summary"><Info text="TIỀN HÀNG">{money(order.tong_tien_hang)}</Info><Info text="CHIẾT KHẤU">{money(order.tien_chiet_khau)}</Info><Info text="VAT">{money(order.tong_tien_vat)}</Info><Info text="PHÍ GIAO HÀNG">{money(order.phi_giao_hang)}</Info><div className="order-summary-total"><dt>KHÁCH PHẢI TRẢ</dt><dd>{money(order.tong_thanh_toan)}</dd></div></dl></Panel><Panel title="GHI CHÚ"><p className="order-note">{order.ghi_chu || '—'}</p></Panel></aside></div>
    {state.busy && <div className="order-busy">ĐANG XỬ LÝ...</div>}
  </section>;
}

function Action({ children, click, danger = false }) { return <button type="button" className={`order-action ${danger ? 'order-action--danger' : 'order-action--black'}`} onClick={click}>{children}</button>; }
function Panel({ title, children }) { return <section className="order-detail-panel"><h2><span />{title}</h2>{children}</section>; }
function Info({ text, children }) { return <div><dt>{text}</dt><dd>{children}</dd></div>; }
function SimpleTable({ headers, rows }) { return <div className="order-products-table-wrap"><table className="order-products-table"><thead><tr>{headers.map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length}>Chưa có dữ liệu.</td></tr>}</tbody></table></div>; }
