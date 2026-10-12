import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { apiRequest } from '../../../../auth/backendAuth';
import { money } from '../../orders/api/orderApi';
import { formatDateTimeVN } from '../../../../shared/services/mutationUtils';
import { PERIODS, CHANNELS, dateRange, validateDates, queryString, cashbookQuery, businessChartData } from '../dashboardModel';
import { mockWarrantyData, warrantyStatusLabels } from '../../warranty/data/mockData';
import '../styles/tongquat.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const ORDER_PATH = '/admin/don-hang/danh-sach-don-hang';
const INVENTORY_PATH = '/kho-hang/quan-ly-phien-ban';
const CASH_PATH = '/admin/so-quy-tien-mat/so-quy';
const RETURN_PATH = '/admin/don-hang/khach-tra-hang';
const PURCHASE_PATH = '/kho-hang/nhap-hang';
const CUSTOMER_PATH = '/admin/khach-hang-doi-tac/khach-hang';
const STATUS = {
  CHO_DUYET: 'Chờ duyệt', CHO_THANH_TOAN: 'Chờ thanh toán', CHO_DONG_GOI: 'Chờ đóng gói',
  CHO_LAY_HANG: 'Chờ giao / chờ lấy hàng', DANG_GIAO_HANG: 'Đang giao', GIAO_THAT_BAI: 'Giao thất bại',
  CHO_HOAN_HANG: 'Chờ hoàn hàng', TIEP_NHAN: 'Tiếp nhận', DANG_KIEM_TRA: 'Đang kiểm tra',
  DA_GUI_BAO_HANH: 'Đã gửi bảo hành', DANG_BAO_HANH: 'Đang bảo hành', DA_NHAN_LAI: 'Đã nhận lại',
  HOAN_TAT: 'Hoàn tất', HET_HANG: 'Hết hàng', DUOI_TOI_THIEU: 'Dưới mức tối thiểu', BINH_THUONG: 'Bình thường',
  TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', THE: 'Thẻ', KHAC: 'Khác',
};
const CHART_FIELDS = { doanh_thu_thuan: 'Doanh thu thuần', so_don: 'Số đơn', so_luong_ban: 'Số lượng bán', loi_nhuan_gop_uoc_tinh: 'Lợi nhuận gộp ước tính' };
const number = value => value == null ? '—' : Number(value).toLocaleString('vi-VN');
const date = value => value ? value.split('-').reverse().join('/') : '—';
const apiPath = (endpoint, params = {}) => `/api/v1/admin/dashboard/${endpoint}?${queryString(params)}`;
const filteredTo = (path, params) => `${path}?${queryString(params)}`;
const inventoryTo = (data, warning) => filteredTo(INVENTORY_PATH, { canh_bao: warning, kho_hang_id: data.kho_hang_id, loai_doi_tuong: 'PHIEN_BAN' });
const returnTo = status => filteredTo(RETURN_PATH, { trang_thai_tra_hang: status });

// Mỗi vùng tải độc lập; hủy request cũ khi đổi bộ lọc để không trộn hai kỳ.
function useSection(path, refresh) {
  const [result, setResult] = useState({});
  const [attempt, setAttempt] = useState(0);
  const key = `${path}|${refresh}|${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(path, { signal: controller.signal }).then(data => {
      if (!data || typeof data !== 'object') throw new Error('Hệ thống trả về dữ liệu không hợp lệ.');
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, error: error.message, status: error.status });
    });
    return () => controller.abort();
  }, [path, key]);
  return { ...(result.key === key ? result : { loading: true }), retry: () => setAttempt(value => value + 1) };
}
function Content({ resource, children }) {
  if (resource.error) return <div className="tq-status tq-error" role="alert">{resource.error} <button type="button" className="btn-black-outline" onClick={resource.retry}>Thử lại</button></div>;
  if (resource.loading || !resource.data) return <p className="tq-status" role="status">Đang tải dữ liệu…</p>;
  return children(resource.data);
}
function Section({ title, note, to, resource, children, controls }) {
  return <section className="tq-card" aria-label={title}><div className="tq-card-header"><div><h2 className="tq-card-title">{title}</h2>{note && <p className="tq-note">{note}</p>}</div>
    {controls}{to && <Link className="tq-card-header-link" to={to}>Xem chi tiết →</Link>}</div><Content resource={resource}>{children}</Content></section>;
}
function Stat({ label, value, currency = false, note, to }) {
  const content = <><div className="tq-sub-label">{label}</div><div className="tq-sub-val">{currency ? money(value) : number(value)}</div>{note && <p className="tq-note">{note}</p>}</>;
  return to ? <Link className="tq-sub-box tq-stat-link" to={to}>{content}</Link> : <div className="tq-sub-box">{content}</div>;
}
function Table({ headers, items, children, empty }) {
  return <div className="tq-table-scroll"><table className="tq-table"><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>
    {items.length ? items.map(children) : <tr><td colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div>;
}
async function download(path, filename) {
  const blob = await apiRequest(path, { responseType: 'blob', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
  if (!blob.size) throw new Error('File báo cáo trống.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function CashFilters({ draft, onChange, onApply, error, busy }) {
  const input = (key, label, options) => <label key={key}>{label}{options ? <select value={draft[key] || ''} onChange={event => onChange(key, event.target.value)}><option value="">Tất cả</option>
    {Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select> : <input type="text" inputMode={key.endsWith('_id') ? 'numeric' : undefined} value={draft[key] || ''} onChange={event => onChange(key, event.target.value)} />}</label>;
  return <details className="tq-cash-filters"><summary>Bộ lọc riêng của Sổ quỹ</summary><p className="tq-note">Dùng khoảng ngày đang áp dụng. Bộ lọc này chỉ ảnh hưởng số dư cuối kỳ và bốn số tổng quan quỹ. Không lọc theo kênh bán.</p>
    <form onSubmit={onApply}><div className="tq-input-grid">
      {input('keyword', 'Từ khóa')}{input('loai_phieu', 'Loại phiếu', { THU: 'Thu', CHI: 'Chi' })}{input('loai_thu_chi_id', 'Mã định danh loại thu / chi')}
      {input('phuong_thuc_thanh_toan', 'Phương thức thanh toán', { TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', THE: 'Thẻ' })}
      {input('nhom_nguoi_nop_nhan', 'Nhóm người nộp / nhận', { KHACH_HANG: 'Khách hàng', NHAN_VIEN: 'Nhân viên', NHA_CUNG_CAP: 'Nhà cung cấp', DOI_TAC_GIAO_HANG: 'Đối tác giao hàng', KHAC: 'Khác' })}
      {input('nguoi_nop_nhan_id', 'Mã định danh khách hàng / nhân viên')}{input('nha_cung_cap_id', 'Mã định danh nhà cung cấp')}{input('doi_tac_van_chuyen_id', 'Mã định danh đối tác vận chuyển')}
      {input('ten_nguoi_nop_nhan', 'Tên người nộp / nhận')}{input('nguoi_tao_id', 'Mã định danh người tạo')}{input('nguon_tao', 'Nguồn tạo', { THU_CONG: 'Thủ công', TU_DONG: 'Tự động' })}
    </div>{error && <p className="tq-error" role="alert">{error}</p>}<button className="btn-black-excel" disabled={busy}>Áp dụng bộ lọc quỹ</button></form></details>;
}

export default function TongQuat() {
  const initial = () => ({ ...dateRange('THANG_NAY'), ky: 'THANG_NAY', kenh_ban: 'TAT_CA', nhom_theo: 'NGAY' });
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [filterError, setFilterError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [ranking, setRanking] = useState('SO_LUONG_BAN');
  const [cashDraft, setCashDraft] = useState({});
  const [cashFilters, setCashFilters] = useState({});
  const [cashError, setCashError] = useState('');
  const [exporting, setExporting] = useState('');
  const [exportError, setExportError] = useState('');
  const [chartField, setChartField] = useState('doanh_thu_thuan');
  const period = { ky: 'TUY_CHINH', tu_ngay: filters.tu_ngay, den_ngay: filters.den_ngay, kenh_ban: filters.kenh_ban };
  const channel = { kenh_ban: filters.kenh_ban };
  const summary = useSection(apiPath('summary', period), refresh);
  const tasks = useSection(apiPath('tasks', { ...channel, limit: 5 }), refresh);
  const chart = useSection(apiPath('business-chart', { ...period, nhom_theo: filters.nhom_theo }), refresh);
  const products = useSection(apiPath('top-products', { ...period, xep_hang_theo: ranking, limit: 5 }), refresh);
  const inventory = useSection(apiPath('inventory', { limit: 5 }), refresh);
  const slow = useSection(apiPath('slow-moving-products', { so_ngay_khong_ban: 30, limit: 5 }), refresh);
  const purchases = useSection(apiPath('purchases'), refresh);
  const customers = useSection(apiPath('customers', period), refresh);
  const cashflow = useSection(apiPath('cashflow', { ...period, nhom_theo: filters.nhom_theo }), refresh);
  const afterSales = useSection(apiPath('after-sales', channel), refresh);
  const promotions = useSection(apiPath('promotions'), refresh);
  const cashQuery = cashbookQuery({ ...cashFilters, tu_ngay: filters.tu_ngay, den_ngay: filters.den_ngay });
  const cash = useSection(`/api/v1/admin/cashbook/overview?${cashQuery}`, refresh);
  function apply(event) {
    event.preventDefault();
    try { validateDates(draft.tu_ngay, draft.den_ngay); setFilterError(''); setFilters({ ...draft }); setRefresh(value => value + 1); setExportError(''); }
    catch (error) { setFilterError(error.message); }
  }
  function choosePeriod(ky) {
    setDraft(current => ({ ...current, ky, ...(ky === 'TUY_CHINH' ? {} : dateRange(ky)), nhom_theo: ky === 'NAM_NAY' ? 'THANG' : 'NGAY' }));
  }
  function applyCash(event) {
    event.preventDefault();
    const values = Object.fromEntries(Object.entries(cashDraft).map(([key, value]) => [key, value.trim()]));
    if (Object.entries(values).some(([key, value]) => key.endsWith('_id') && value && (!/^[1-9]\d*$/.test(value) || BigInt(value) > 9223372036854775807n))) { setCashError('Mã định danh phải là số nguyên dương hợp lệ.'); return; }
    setCashError(''); setCashFilters(values); cash.retry(); setExportError('');
  }
  async function exportFile(kind) {
    setExporting(kind); setExportError('');
    try {
      const path = kind === 'cash' ? `/api/v1/admin/cashbook/export?${cashQuery}` : apiPath('export', { ...period, nhom_theo: filters.nhom_theo, xep_hang_theo: ranking, so_ngay_khong_ban: 30, limit: 5 });
      await download(path, `${kind === 'cash' ? 'So_quy' : 'Tong_quat'}_${filters.tu_ngay}_${filters.den_ngay}.xlsx`);
    } catch (error) { setExportError(`Xuất báo cáo không thành công, vui lòng thử lại. ${error.message}`); }
    finally { setExporting(''); }
  }
  const cashTo = `${CASH_PATH}?${cashQuery}`;
  const currentNote = `Hiện tại · ${CHANNELS[filters.kenh_ban]} · không phụ thuộc khoảng ngày`;
  const orderTo = status => filteredTo(ORDER_PATH, { trang_thai_don_hang: status, loai_don_hang: filters.kenh_ban === 'TAT_CA' ? '' : filters.kenh_ban });
  const deliveryTo = status => filteredTo('/admin/don-hang/quan-ly-giao-hang', { trang_thai_giao_hang: status });

  if (summary.status === 403) return <main className="tq-page"><div className="tq-status tq-error" role="alert"><h1>Bạn không có quyền xem Tổng quát.</h1><p>{summary.error}</p></div></main>;

  return <main className="tq-page">
    <div className="tq-header-section"><div><h1 className="tq-title">Tổng quát</h1><p className="tq-subtitle">Tổng hợp hoạt động kinh doanh và vận hành hệ thống</p></div><div className="tq-header-right">
      <div className="tq-update-time">{summary.data && !summary.loading && <>Cập nhật: {formatDateTimeVN(summary.data.cap_nhat_luc)}<br /></>}<strong>{date(filters.tu_ngay)} – {date(filters.den_ngay)} · {CHANNELS[filters.kenh_ban]}</strong></div>
      <div className="tq-filter-actions"><button className="btn-black-outline" onClick={() => setRefresh(value => value + 1)}>Tải lại</button><button className="btn-black-excel" disabled={Boolean(exporting)} onClick={() => exportFile('dashboard')}>{exporting === 'dashboard' ? 'Đang xuất…' : 'Xuất Excel Tổng quát'}</button></div>
    </div></div>{exportError && <p className="tq-error tq-status" role="alert">{exportError}</p>}
    <form className="tq-card tq-filters-card" onSubmit={apply}>
      <div className="tq-filter-row"><span className="tq-filter-label">Khoảng thời gian</span><div className="tq-btn-group">{Object.entries(PERIODS).map(([key, label]) => <button type="button" key={key} className={`tq-btn-filter ${draft.ky === key ? 'active-black' : ''}`} aria-pressed={draft.ky === key} onClick={() => choosePeriod(key)}>{label}</button>)}</div></div>
      <div className="tq-filter-row"><label>Từ ngày<input className="tq-date-input" type="date" value={draft.tu_ngay} onChange={event => setDraft({ ...draft, ky: 'TUY_CHINH', tu_ngay: event.target.value })} required /></label><label>Đến ngày<input className="tq-date-input" type="date" value={draft.den_ngay} onChange={event => setDraft({ ...draft, ky: 'TUY_CHINH', den_ngay: event.target.value })} required /></label>
        <label>Nhóm biểu đồ<select value={draft.nhom_theo} onChange={event => setDraft({ ...draft, nhom_theo: event.target.value })}><option value="NGAY">Theo ngày</option><option value="THANG">Theo tháng</option></select></label></div>
      <div className="tq-filter-row"><span className="tq-filter-label">Kênh bán</span><div className="tq-btn-group">{Object.entries(CHANNELS).map(([key, label]) => <button type="button" key={key} className={`tq-btn-filter ${draft.kenh_ban === key ? 'active-red' : ''}`} aria-pressed={draft.kenh_ban === key} onClick={() => setDraft({ ...draft, kenh_ban: key })}>{label}</button>)}</div>
        <div className="tq-filter-actions"><button className="btn-black-excel">Áp dụng</button><button type="button" className="btn-black-outline" onClick={() => { const value = initial(); setDraft(value); setFilters(value); setCashDraft({}); setCashFilters({}); setCashError(''); setFilterError(''); setExportError(''); setRefresh(value => value + 1); }}>Xóa bộ lọc</button></div></div>
      {filterError && <p className="tq-error" role="alert">{filterError}</p>}
    </form>

    <section className="tq-card" aria-label="Chỉ số chính"><div className="tq-kpi-main"><div className="tq-sales-kpis"><Content resource={summary}>{data => <><div className="tq-kpi-grid">
      {Object.entries({ doanh_thu_thuan: 'Doanh thu thuần', so_don: 'Số đơn', so_luong_ban: 'Số lượng bán', thuc_thu: 'Thực thu' }).map(([key, label]) => {
        const metric = data.kpi[key]; const rate = metric.ty_le_thay_doi;
        return <div className="tq-kpi-box" key={key}><div className="tq-kpi-label">{label}</div><div className="tq-kpi-value">{key === 'so_don' || key === 'so_luong_ban' ? number(metric.gia_tri) : money(metric.gia_tri)}</div><div className="tq-kpi-change">{rate == null ? 'Không có dữ liệu so sánh' : <span className={Number(rate) < 0 ? 'tq-text-red' : 'tq-text-green'}>{Number(rate) > 0 ? '↑ ' : Number(rate) < 0 ? '↓ ' : ''}{number(Math.abs(Number(rate)))}% so với kỳ trước</span>}</div><p className="tq-note">{key === 'thuc_thu' ? 'Trong kỳ · toàn cửa hàng · thu đã ghi nhận' : 'Trong kỳ · kênh đang chọn'}</p></div>;
      })}</div><p className="tq-note tq-scope">Kỳ trước: {date(data.ky_truoc.tu_ngay)} – {date(data.ky_truoc.den_ngay)}{data.bo_loc.ky_chua_ket_thuc && ' · Kỳ hiện tại chưa kết thúc'}. Doanh thu dựa trên đơn hoàn thành, đã thanh toán và đã xuất/hoàn kho theo quy tắc hệ thống.</p></>}</Content></div>
      <div className="tq-cash-kpi"><Content resource={cash}>{data => <Link className="tq-kpi-box tq-stat-link" to={cashTo}><div className="tq-kpi-label">Số dư quỹ cuối kỳ</div><div className="tq-kpi-value">{money(data.ton_quy)}</div><p className="tq-note">Cuối ngày {date(data.bo_loc.den_ngay)} · bộ lọc Sổ quỹ · toàn cửa hàng</p></Link>}</Content></div></div>
      <Content resource={summary}>{data => <div className="tq-kpi-sub-grid"><Stat label="Doanh thu bán hàng" value={data.kinh_doanh.doanh_thu_ban_hang} currency /><Stat label="Giá trị hàng trả" value={data.kinh_doanh.gia_tri_hang_tra} currency /><Stat label="Tổng giảm giá" value={data.kinh_doanh.tong_giam_gia} currency /><Stat label="Giá trị trung bình / đơn" value={data.kinh_doanh.gia_tri_trung_binh_don} currency /><Stat label="Lợi nhuận gộp ước tính" value={data.kinh_doanh.loi_nhuan_gop_uoc_tinh} currency note="Theo giá nhập hiện tại; chưa phải giá vốn lịch sử." /></div>}</Content>
    </section>

    <div className="tq-2col"><Section title="Việc cần xử lý" note={currentNote} to={orderTo()} resource={tasks}>{data => <>
      <p className="tq-scope">{number(data.so_don_can_xu_ly)} đơn cần xử lý · {number(data.tra_hang.tong_phieu_can_xu_ly)} phiếu trả hàng / hoàn tiền</p><div className="tq-todo-grid">
        {Object.entries(data.don_hang).map(([key, value]) => <Stat key={key} label={STATUS[key]} value={value} to={orderTo(key)} />)}{Object.entries(data.giao_hang).map(([key, value]) => <Stat key={key} label={STATUS[key]} value={value} to={deliveryTo(key)} />)}<Stat label="Trả hàng / hoàn tiền" value={data.tra_hang.tong_phieu_can_xu_ly} to={returnTo('CAN_XU_LY')} /></div>
      <div className="tq-priority-list"><h3 className="tq-priority-label">Cần ưu tiên · chờ từ {number(data.nguong_cho_phut)} phút</h3>{data.can_uu_tien.length ? data.can_uu_tien.map(item => <Link key={item.don_hang_id} className="tq-priority-row tq-stat-link" to={`${ORDER_PATH}/${item.don_hang_id}`}><span className="tq-priority-id">{item.ma_don_hang}</span><span className="tq-priority-type">{STATUS[item.trang_thai_don_hang]}</span><span className="tq-priority-time">{number(item.so_phut_tu_khi_tao)} phút</span></Link>) : <p>Không có đơn chờ quá ngưỡng.</p>}</div>
    </>}</Section><section className="tq-card tq-alert-card" aria-label="Cảnh báo quan trọng"><div className="tq-card-header"><div><h2 className="tq-card-title">Cảnh báo quan trọng</h2><p className="tq-note">Giá trị hiện tại</p></div></div>
      <Content resource={inventory}>{data => <div className="tq-alert-list"><Stat label="Hết hàng" value={data.so_sku_het_hang} note="Phiên bản đang kinh doanh · kho mặc định" to={inventoryTo(data, 'HET_HANG')} /><Stat label="Dưới mức tồn tối thiểu" value={data.so_sku_duoi_toi_thieu} to={inventoryTo(data, 'DUOI_TOI_THIEU')} /></div>}</Content>
      <Content resource={tasks}>{data => <div className="tq-alert-list"><Stat label="Đơn chờ quá lâu" value={data.so_don_cho_lau} to={filteredTo(ORDER_PATH, { cho_lau_phut: data.nguong_cho_phut, loai_don_hang: filters.kenh_ban === 'TAT_CA' ? '' : filters.kenh_ban })} /><Stat label="Giao hàng thất bại" value={data.giao_hang.GIAO_THAT_BAI} note="Số phiếu giao hàng" to={deliveryTo('GIAO_THAT_BAI')} /><Stat label="Chờ hoàn tiền" value={data.tra_hang.cho_hoan_tien} to={returnTo('CHO_HOAN_TIEN')} /></div>}</Content>
    </section></div>

    <div className="tq-2col"><Section title="Kinh doanh" note="Trong kỳ · so sánh kỳ trước có cùng số ngày" resource={chart}>{data => <div className="tq-chart-area">
      <div className="tq-chart-tabs">{Object.entries(CHART_FIELDS).map(([key, label]) => <button type="button" key={key} className={`tq-chart-tab ${chartField === key ? 'active' : ''}`} aria-pressed={chartField === key} onClick={() => setChartField(key)}>{label}</button>)}</div>
      <p className="tq-note">Đơn vị: {chartField === 'so_don' ? 'đơn' : chartField === 'so_luong_ban' ? 'sản phẩm' : 'đồng'}{chartField === 'loi_nhuan_gop_uoc_tinh' && ' · ước tính theo giá nhập hiện tại'}. Các mốc hai kỳ được ghép theo thứ tự.</p>
      <div className="tq-chart"><Line role="img" aria-label={`Biểu đồ ${CHART_FIELDS[chartField]}`} data={businessChartData(data, chartField)} options={{ responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { title: points => { const point = points[0]; const row = (point.datasetIndex === 0 ? data.ky_hien_tai : data.ky_truoc)[point.dataIndex]; return row ? `${date(row.tu_ngay)} – ${date(row.den_ngay)}` : 'Không có mốc tương ứng'; } } } }, scales: { y: { ticks: { callback: number } }, x: { ticks: { maxTicksLimit: 8 } } } }} /></div>
      <details><summary>Xem dữ liệu biểu đồ</summary><Table headers={['Kỳ', 'Từ ngày', 'Đến ngày', CHART_FIELDS[chartField]]} items={[...data.ky_hien_tai.map(item => ({ ...item, label: 'Hiện tại' })), ...data.ky_truoc.map(item => ({ ...item, label: 'Kỳ trước' }))]} empty="Không có dữ liệu biểu đồ.">{(item, i) => <tr key={i}><td>{item.label}</td><td>{date(item.tu_ngay)}</td><td>{date(item.den_ngay)}</td><td>{number(item[chartField])}</td></tr>}</Table></details>
    </div>}</Section><Section title="Cơ cấu kênh bán" note="Trong kỳ · kênh đang chọn" resource={summary}>{data => <div className="tq-channel-area">{data.co_cau_kenh.length ? data.co_cau_kenh.map(item => <div className="tq-channel-item" key={item.kenh_ban}><h3>{CHANNELS[item.kenh_ban]}</h3><Stat label="Doanh thu thuần" value={item.doanh_thu_thuan} currency /><Stat label="Số đơn" value={item.so_don} /><Stat label="Tỷ trọng doanh thu (%)" value={item.ty_trong_doanh_thu} /></div>) : <p>Không có đơn đủ điều kiện trong kỳ.</p>}</div>}</Section></div>

    <div className="tq-2col-equal"><Section title="Sản phẩm bán chạy" note="Trong kỳ · 5 phiên bản đứng đầu · tồn hiện tại" resource={products} controls={<label>Xếp hạng theo<select value={ranking} onChange={event => setRanking(event.target.value)}><option value="SO_LUONG_BAN">Số lượng bán</option><option value="DOANH_THU_THUAN">Doanh thu thuần</option></select></label>}>{data => <>
      <Table headers={['Hạng', 'Sản phẩm / phiên bản', 'Đã bán', 'Doanh thu thuần', 'Có thể bán / lắp', 'Cảnh báo']} items={data.items} empty="Không có sản phẩm bán chạy trong kỳ.">{item => <tr key={item.phien_ban_id}><td className="tq-rank">{item.hang}</td><td><span className="tq-prod-name">{item.ten_san_pham}</span><div className="tq-prod-var">{item.ten_phien_ban} · {item.ma_vach}</div></td><td>{number(item.so_luong_ban)}<div className="tq-note">Đã nhận trả: {number(item.so_luong_da_nhan_tra)}</div></td><td>{money(item.doanh_thu_thuan)}</td><td>{number(item.loai_san_pham === 'BO_PC' ? item.so_bo_co_the_lap : item.ton_co_the_ban)}<div className="tq-note">{item.loai_san_pham === 'BO_PC' ? 'Số bộ có thể lắp' : `Tồn thực tế: ${number(item.ton_thuc_te)}`}</div></td><td>{STATUS[item.canh_bao] || '—'}</td></tr>}</Table><p className="tq-note tq-scope">Hiển thị {data.items.length} / {number(data.tong_so)} phiên bản.</p>
    </>}</Section><Section title="Tồn kho & cảnh báo" note="Hiện tại · kho mặc định · không phụ thuộc thời gian/kênh bán" resource={inventory} to={INVENTORY_PATH}>{data => <>
      <div className="tq-kpi-sub-grid"><Stat label="Tổng tồn thực tế" value={data.tong_ton_thuc_te} /><Stat label="Có thể bán" value={data.tong_ton_co_the_ban} /><Stat label="Hết hàng" value={data.so_sku_het_hang} /><Stat label="Dưới mức tối thiểu" value={data.so_sku_duoi_toi_thieu} /><Stat label="Giá trị tồn theo giá nhập hiện tại" value={data.gia_tri_ton_theo_gia_nhap_hien_tai} currency /><Stat label="Sản phẩm đang kinh doanh" value={data.so_san_pham_dang_kinh_doanh} /><Stat label="Phiên bản đang kinh doanh" value={data.so_phien_ban_dang_kinh_doanh} /></div>
      <Table headers={['Sản phẩm / phiên bản', 'Tồn thực tế', 'Có thể bán', 'Mức tối thiểu', 'Cảnh báo']} items={data.canh_bao.items} empty="Không có cảnh báo tồn kho.">{item => <tr key={item.phien_ban_id}><td>{item.ten_san_pham}<div className="tq-prod-var">{item.ten_phien_ban}</div></td><td>{number(item.ton_thuc_te)}</td><td>{number(item.ton_co_the_ban)}</td><td>{number(item.muc_ton_toi_thieu)}</td><td>{STATUS[item.canh_bao]}</td></tr>}</Table><p className="tq-note tq-scope">Hiển thị {data.canh_bao.items.length} / {number(data.canh_bao.tong_so)} cảnh báo.</p>
    </>}</Section></div>
    <Section title="Tồn lâu / chưa phát sinh bán" note="Hiện tại · kho mặc định · ngưỡng 30 ngày · 5 phiên bản đứng đầu" resource={slow}>{data => <>
      <Table headers={['Sản phẩm / phiên bản', 'Tồn thực tế', 'Lần xuất bán gần nhất', 'Số ngày không bán']} items={data.items} empty="Không có sản phẩm tồn lâu theo ngưỡng này.">{item => <tr key={item.phien_ban_id}><td>{item.ten_san_pham}<div className="tq-prod-var">{item.ten_phien_ban}</div></td><td>{number(item.ton_thuc_te)}</td><td>{item.lan_xuat_ban_gan_nhat ? formatDateTimeVN(item.lan_xuat_ban_gan_nhat) : 'Chưa có lịch sử xuất bán'}</td><td>{number(item.so_ngay_khong_ban)}</td></tr>}</Table><p className="tq-note tq-scope">Hiển thị {data.items.length} / {number(data.tong_so)} phiên bản.</p>
    </>}</Section>

    <div className="tq-bottom-grid"><Section title="Nhập hàng & nhà cung cấp" note="Giá trị hiện tại" to={PURCHASE_PATH} resource={purchases}>{data => <><div className="tq-kpi-sub-grid"><Stat label="Đơn nhập chờ duyệt" value={data.cho_duyet} /><Stat label="Chờ nhập kho" value={data.cho_nhap_kho} /><Stat label="Nhập chưa đủ" value={data.nhap_chua_du} /><Stat label="Đơn chưa trả" value={data.don_chua_tra} /><Stat label="Đơn trả một phần" value={data.don_tra_mot_phan} /></div><p className="tq-note tq-scope">Số tiền công nợ chính xác chưa có hệ thống hỗ trợ.</p></>}</Section>
      <Section title="Khách hàng" note="Theo khoảng ngày/kênh đang chọn, trừ các giá trị ghi rõ phạm vi" to={CUSTOMER_PATH} resource={customers}>{data => <><div className="tq-kpi-sub-grid"><Stat label="Tổng khách hàng" value={data.tong_khach_hang_hien_tai} note="Hiện tại · toàn cửa hàng" /><Stat label="Khách mới trong kỳ" value={data.khach_moi_trong_ky} note="Toàn cửa hàng · không lọc theo kênh" /><Stat label="Có mua trong kỳ" value={data.khach_co_mua_trong_ky} /><Stat label="Khách quay lại" value={data.khach_quay_lai} note="Có từ 2 đơn hợp lệ trong lịch sử đến cuối kỳ" /><Stat label="Số đơn khách lẻ" value={data.so_don_khach_le} /></div>
        <div className="tq-scope"><h3 className="tq-sub-label">Khách giá trị cao nhất trong kỳ</h3>{data.khach_gia_tri_cao_nhat ? <Link to={`${CUSTOMER_PATH}/${data.khach_gia_tri_cao_nhat.khach_hang_id}`}>{data.khach_gia_tri_cao_nhat.ho_ten} · {money(data.khach_gia_tri_cao_nhat.gia_tri_mua_thuan)} · {number(data.khach_gia_tri_cao_nhat.so_don)} đơn</Link> : 'Không có khách mua hàng đủ điều kiện trong kỳ.'}</div>
      </>}</Section><Section title="Nhân viên" note="Hiện tại · toàn cửa hàng" to="/admin/nhan-vien/danh-sach" resource={summary}>{data => <Stat label="Nhân viên đang hoạt động" value={data.hien_tai.nhan_vien_dang_hoat_dong} note="Tài khoản hoạt động; không phải số nhân viên theo ca." />}</Section>
    </div>

    <section className="tq-card" aria-label="Sổ quỹ & thanh toán"><div className="tq-card-header"><div><h2 className="tq-card-title">Sổ quỹ & thanh toán</h2><p className="tq-note">Quỹ toàn cửa hàng · chỉ phiếu đã ghi nhận · ngày tiền là ngày ghi nhận</p></div><Link className="tq-card-header-link" to={cashTo}>Xem Sổ quỹ →</Link></div>
      <CashFilters draft={cashDraft} onChange={(key, value) => setCashDraft({ ...cashDraft, [key]: value })} onApply={applyCash} error={cashError} busy={cash.loading} />
      <Content resource={cash}>{data => <><div className="tq-kpi-sub-grid"><Stat label="Số dư đầu kỳ" value={data.so_du_dau_ky} currency /><Stat label="Tổng thu trong kỳ" value={data.tong_thu} currency /><Stat label="Tổng chi trong kỳ" value={data.tong_chi} currency /><Stat label="Số dư cuối kỳ" value={data.ton_quy} currency /></div>
        <p className="tq-note tq-scope">{date(data.bo_loc.tu_ngay)} – {date(data.bo_loc.den_ngay)} · Đầu kỳ + thu − chi = cuối kỳ. Thu không đồng nghĩa doanh thu; COD chưa nộp không vào quỹ.</p><div className="tq-scope"><button className="btn-black-outline" disabled={Boolean(exporting)} onClick={() => exportFile('cash')}>{exporting === 'cash' ? 'Đang xuất…' : 'Xuất Excel Sổ quỹ theo bộ lọc riêng'}</button></div>
      </>}</Content><div className="tq-card-header"><h3 className="tq-card-title">Thanh toán toàn cửa hàng</h3></div>
      <Content resource={cashflow}>{data => <><p className="tq-note tq-scope">Phần này dùng khoảng ngày chung; bộ lọc riêng Sổ quỹ không áp dụng. Tiền đơn chưa thu/COD là hiện tại, theo kênh đang chọn.</p><div className="tq-kpi-sub-grid"><Stat label="Số dư quỹ hiện tại" value={data.so_du_quy_hien_tai} currency /><Stat label="Chênh lệch thu − chi trong kỳ" value={data.trong_ky.chenh_lech} currency />
        {data.thu_theo_phuong_thuc.map(item => <Stat key={item.phuong_thuc} label={`Thu trong kỳ · ${STATUS[item.phuong_thuc] || 'Phương thức khác'}`} value={item.so_tien} currency />)}<Stat label="Giá trị đơn chưa thanh toán" value={data.don_hang_hien_tai.gia_tri_chua_thanh_toan} currency note="Hiện tại · chưa phải tiền đã vào quỹ" /><Stat label="COD đang vận chuyển" value={data.don_hang_hien_tai.cod_dang_van_chuyen} currency note="Hiện tại · chưa phải tiền đã vào quỹ" /></div>
        <details className="tq-scope"><summary>Dòng tiền trong kỳ</summary><Table headers={['Từ ngày', 'Đến ngày', 'Tổng thu', 'Tổng chi']} items={data.bieu_do} empty="Không có dữ liệu dòng tiền.">{item => <tr key={item.tu_ngay}><td>{date(item.tu_ngay)}</td><td>{date(item.den_ngay)}</td><td>{money(item.tong_thu)}</td><td>{money(item.tong_chi)}</td></tr>}</Table></details>
      </>}</Content><p className="tq-note tq-scope">Excel Tổng quát dùng bộ lọc thời gian/kênh và số dư quỹ hiện tại. Để xuất bốn số quỹ và bộ lọc riêng, chọn Xuất Excel Sổ quỹ.</p>
    </section>
    <div className="tq-2col-equal"><Section title="Bảo hành & trả hàng" note={currentNote} resource={afterSales}>{data => <><h3 className="tq-subheading">Bảo hành · dữ liệu mẫu</h3><p className="tq-note tq-scope">Dùng cùng dữ liệu mẫu với trang Bảo hành, không lọc theo kênh và không thuộc Excel Tổng quát.</p><div className="tq-kpi-sub-grid">{Object.entries(warrantyStatusLabels).map(([key, label]) => <Stat key={key} label={STATUS[key]} value={mockWarrantyData.filter(item => item.status === label).length} to={filteredTo('/admin/bao-hanh', { trang_thai: key })} />)}</div><h3 className="tq-subheading">Trả hàng</h3><div className="tq-kpi-sub-grid"><Stat label="Chờ tiếp nhận" value={data.tra_hang.CHO_TIEP_NHAN} to={returnTo('CHO_TIEP_NHAN')} /><Stat label="Đã nhận hàng" value={data.tra_hang.DA_NHAN_HANG} to={returnTo('DA_NHAN_HANG')} /><Stat label="Đã hoàn tiền" value={data.tra_hang.DA_HOAN_TIEN} to={returnTo('DA_HOAN_TIEN')} /><Stat label="Chờ hoàn tiền" value={data.tra_hang.cho_hoan_tien} to={returnTo('CHO_HOAN_TIEN')} /><Stat label="Giá trị chờ hoàn tiền" value={data.tra_hang.gia_tri_cho_hoan_tien} currency /></div></>}</Section>
      <Section title="Khuyến mại" note="Hiện tại · toàn cửa hàng" to="/admin/khuyen-mai/danh-sach-khuyen-mai" resource={promotions}>{data => <><div className="tq-kpi-sub-grid"><Stat label="Đang trong thời gian áp dụng" value={data.dang_trong_thoi_gian_ap_dung} /><Stat label="Còn lượt áp dụng" value={data.con_luot_ap_dung} /><Stat label="Sắp bắt đầu" value={data.sap_bat_dau} note={`Trong ${number(data.nguong_sap_den_ngay)} ngày tới`} /><Stat label="Sắp kết thúc" value={data.sap_ket_thuc} note={`Trong ${number(data.nguong_sap_den_ngay)} ngày tới`} /><Stat label="Tổng lượt đã dùng" value={data.tong_luot_da_dung_luy_ke} note="Lũy kế · không phụ thuộc khoảng ngày" /></div><p className="tq-note tq-scope">Thống kê đơn và giá trị giảm theo từng chương trình trong kỳ chưa có hệ thống hỗ trợ.</p></>}</Section>
    </div>
    <nav className="tq-quick-access" aria-label="Truy cập nhanh"><h2 className="tq-qa-title">Truy cập nhanh</h2><div className="tq-qa-links"><Link className="tq-qa-link" to="/admin/don-hang/dat-hang-online">Tạo đơn Online →</Link><Link className="tq-qa-link" to={`${PURCHASE_PATH}/tao-moi`}>Tạo đơn nhập →</Link><Link className="tq-qa-link" to="/admin/so-quy-tien-mat/tao-phieu-thu">Tạo phiếu thu →</Link><Link className="tq-qa-link" to="/admin/so-quy-tien-mat/tao-phieu-chi">Tạo phiếu chi →</Link></div></nav>
  </main>;
}
