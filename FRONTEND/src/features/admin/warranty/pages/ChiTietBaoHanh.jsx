import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, SquareCheck as CheckCircle2, ChevronRight, ClipboardCheck, FileText, History, MessageSquareText as Info, Package, Phone, RefreshCw, Truck, Wallet } from 'lucide-react';
import { getWarranty, warrantyError } from '../api/warrantyApi';
import { displayDate, money, statusLabels, quoteLabels, paymentLabels, refundLabels } from '../data/warrantyContract';
import { actions, fieldOptions, initialActionValues } from '../data/warrantyActions';
import { custodyBlocker, custodyLabels, eventLabels, workflowGuide } from '../data/warrantyExperience';
import { WarrantyBadge, WarrantyFields, WarrantyPanel, WarrantyTable } from '../components/WarrantyShell';
import WarrantyActionForm from '../components/WarrantyActionForm';
import WarrantySnapshot, { displayValue } from '../components/WarrantySnapshot';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import '../styles/warrantyShell.css';

const tabs = [ ['Tổng quan', FileText], ['Xử lý & giao nhận', Truck], ['Báo giá & thanh toán', Wallet], ['Đổi bảo hành', Package], ['Lịch sử', History] ];
const groups = {
  1: { inspection: 'Kiểm tra & kết luận', custody: 'Giao nhận thiết bị', work: 'Công việc & tiến độ', handover: 'Trả khách & hoàn tất' },
  2: { quotes: 'Báo giá cho khách', invoice: 'Hóa đơn & nghĩa vụ', money: 'Thu, chi & hoàn tiền' },
  3: { plan: 'Phương án đổi', items: 'Thiết bị thay thế', settlement: 'Đối soát nhà cung cấp' },
};
const groupNotes = {
  inspection: 'Ghi lỗi, hướng xử lý và chi phí.',
  custody: 'Đối chiếu thiết bị, phụ kiện và chứng từ.',
  work: 'Miễn phí: có kết luận. Có phí: khách duyệt báo giá.',
  handover: 'Sẵn sàng trả → Khách nhận thực tế → Bàn giao & hoàn tất.',
  quotes: 'Lập báo giá và ghi quyết định của khách.',
  invoice: 'Đối chiếu hóa đơn và khoản còn phải trả.',
  money: 'Ghi đúng số tiền thực thu, chi hoặc hoàn.',
  plan: 'Chọn hàng thay thế và xin duyệt.',
  items: 'Giữ chỗ, xuất hoặc nhận hàng đổi.',
  settlement: 'Đối chiếu hàng bù và tiền với đơn vị.',
};
const stages = ['Tiếp nhận', 'Kiểm tra', 'Xử lý / nhận về', 'Chờ trả khách', 'Hoàn tất'];

export default function ChiTietBaoHanh() {
  const { id } = useParams();
  return <WarrantyDetail key={id} id={id} />;
}
function WarrantyDetail({ id }) {
  const navigate = useNavigate(), workbench = useRef(null);
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [tab, setTab] = useState(0), [group, setGroup] = useState('inspection');
  const [locked, setLocked] = useState(false);
  const [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const [quoteVersion, setQuoteVersion] = useState(null), [form, setForm] = useState(null), [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState(''), [lastResult, setLastResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    getWarranty(id, page - 1, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(warrantyError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, page, reload]);
  useEffect(() => { if (form) workbench.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [form]);
  const changeTab = value => { setTab(value); setGroup(Object.keys(groups[value] || {})[0] || ''); setForm(null); };
  if (!data) return <div className="w-shell"><div className="w-shell-content"><div className="w-empty-state"><ClipboardCheck size={36} /><h1>{error ? 'Chưa tải được phiếu bảo hành' : 'Đang tải hồ sơ…'}</h1><p role={error ? 'alert' : 'status'}>{error || 'Vui lòng chờ trong giây lát.'}</p><div className="w-shell-actions"><button className="w-shell-button" onClick={() => setReload(value => value + 1)}>Thử lại</button><button className="w-shell-button" disabled={locked} onClick={() => navigate('/admin/bao-hanh/danh-sach')}>Về danh sách</button></div></div></div></div>;
  const quote = data.bao_gia.find(item => item.phien_ban === Number(quoteVersion)) || data.bao_gia.at(-1);
  const invoice = data.hoa_don, plan = data.phuong_an_doi, custody = data.noi_dang_giu, guide = workflowGuide(data);
  const invoices = [invoice, ...(data.hoa_don_da_huy || [])].filter(Boolean);
  const open = operation => {
    const version = quote?.phien_ban, key = `${operation.key}:${version ?? ''}`;
    setDrafts(current => current[key] ? current : { ...current, [key]: initialActionValues(operation, data, version) });
    setForm({ operation, key, version }); setMessage('');
  };
  const unavailable = operation => {
    if (loading || error) return 'Tải lại dữ liệu trước khi ghi nhận.';
    if (data.trang_thai_xu_ly === 'HOAN_TAT' && !operation.afterComplete) return 'Phiếu đã hoàn tất, không mở lại xử lý thiết bị.';
    if (operation.endpoint === 'quote-events' && !quote) return 'Cần lập báo giá trước.';
    if (operation.key === 'SEND_QUOTE' && quote?.trang_thai !== 'NHAP') return 'Chỉ gửi báo giá đang là bản nháp.';
    if (['ACCEPT_QUOTE', 'REJECT_QUOTE', 'WITHDRAW_QUOTE'].includes(operation.key) && quote?.trang_thai !== 'CHO_PHAN_HOI') return 'Dùng cho báo giá đang chờ khách phản hồi.';
    if (operation.key === 'BAT_DAU_KIEM_TRA' && data.trang_thai_xu_ly !== 'TIEP_NHAN') return 'Chỉ bắt đầu từ phiếu mới tiếp nhận.';
    if (operation.key === 'KIEM_TRA_TIEP' && !['DA_NHAN_LAI', 'CHO_TRA_KHACH'].includes(data.trang_thai_xu_ly)) return 'Dùng sau khi nhận lại hoặc cần kiểm tra lại trước khi trả.';
    if (operation.endpoint === 'invoice' && !invoice) return 'Chưa có hóa đơn hiệu lực. Hóa đơn được lập khi khách đồng ý báo giá.';
    if (['THU_KHACH', 'HOAN_KHACH'].includes(operation.key) && !invoices.length) return 'Cần có hóa đơn để ghi giao dịch.';
    if (operation.group === 'plan' && operation.key !== 'PLAN_CREATE' && !plan?.phien_ban) return 'Cần lập phương án đổi trước.';
    return custodyBlocker(operation.key, data);
  };
  const followGuide = () => {
    const nextTab = guide.group === 'plan' ? 3 : 1;
    setTab(nextTab); setGroup(guide.group); setForm(null);
    const operation = actions.find(item => item.key === guide.action);
    if (operation && !unavailable(operation)) open(operation);
  };
  const saved = result => {
    setLocked(false); setLastResult(result); setMessage(result?.trang_thai_xu_ly === 'HOAN_TAT' ? 'Đã bàn giao cho khách và hoàn tất phiếu. Các khoản hoàn tiền, đối soát còn lại vẫn được theo dõi.' : 'Đã lưu thành công. Đang cập nhật tình trạng và việc cần làm tiếp theo.');
    setDrafts(current => { const next = { ...current }; delete next[form.key]; return next; });
    setForm(null); setPage(1); setReload(value => value + 1);
    if (result?.canh_bao) setMessage(`Đã ghi nhận. ${[].concat(result.canh_bao).map(item => typeof item === 'string' ? item : item.message || item.noi_dung || '').join(' ')}`);
  };
  const historyTable = <><WarrantyTable columns={['Thời điểm', 'Hoạt động', 'Nội dung', 'Tham chiếu']} rows={(data.lich_su?.items || []).map(event => [displayDate(event.ngay_tao), eventLabels[event.loai_su_kien] || actions.find(item => item.key === event.loai_su_kien)?.label || displayValue(event.loai_su_kien), event.noi_dung, `#${event.id} · Nhân viên #${event.nguoi_thuc_hien_id}`])} empty="Chưa có hoạt động được lưu." /><TablePagination totalItems={data.lich_su?.pagination?.total_elements || 0} pageSize={20} currentPage={page} onPageChange={setPage} idPrefix="warranty-history" /></>;
  const invoiceTable = <WarrantyTable columns={['Hóa đơn', 'Hiệu lực', 'Báo giá', 'Tổng tiền', 'Phải thu hiệu lực', 'Đã thu', 'Đã hoàn', 'Còn thu', 'Còn hoàn']} rows={invoices.map(item => [`${item.ma_hoa_don} / #${item.id}`, item.trang_thai === 'HUY' ? 'Đã hủy' : displayValue(item.trang_thai), item.phien_ban_bao_gia, money(item.tong_tien), money(item.khoan_phai_thu_hieu_luc), money(item.da_thu), money(item.da_hoan), money(item.con_phai_thu), money(item.con_phai_hoan)])} empty="Chưa có hóa đơn. Hóa đơn được tạo khi khách đồng ý báo giá." />;
  const conclusions = <>{data.ket_luan?.length ? [...data.ket_luan].reverse().map(item => <article key={item.lich_su_id} className="w-conclusion"><div className="w-shell-title-row"><strong>{item.noi_dung}</strong><span className="w-reference-tag">Kết luận #{item.lich_su_id}</span></div><WarrantyTable columns={['Hạng mục', 'Điều kiện', 'Bên chịu phí', 'Căn cứ / hướng xử lý']} rows={(item.hang_muc || []).map(row => [row.ma_hang_muc, <WarrantyBadge key={row.ma_hang_muc} tone={row.dieu_kien_bao_hanh === 'DU_DIEU_KIEN' ? 'green' : 'amber'}>{fieldOptions.dieu_kien_bao_hanh[row.dieu_kien_bao_hanh] || row.dieu_kien_bao_hanh}</WarrantyBadge>, fieldOptions.ben_chiu_phi[row.ben_chiu_phi] || row.ben_chiu_phi, [row.noi_dung_xu_ly, row.can_cu, row.ly_do].filter(Boolean).join(' · ')])} empty="Chưa có hạng mục." /></article>) : <div className="w-empty-inline"><ClipboardCheck size={24} /><p>Chưa có kết luận. Ghi nhận kết quả kiểm tra để làm căn cứ xử lý.</p></div>}</>;
  const delivery = <>{custody && <div className="w-custody-banner"><Truck size={22} /><div><strong>{custodyLabels[custody.loai] || 'Chưa xác định nơi giữ'}</strong><p>{custody.ten || (custody.loai === 'KHACH_HANG' ? 'Thiết bị đã bàn giao cho khách.' : custody.nha_cung_cap_id ? `Nhà cung cấp #${custody.nha_cung_cap_id}` : custodyLabels[custody.loai] || 'Chưa xác định nơi giữ')}</p></div></div>}<ol className="w-delivery-timeline">{(data.giao_nhan || []).map(item => <li key={item.lich_su_id}><span className="w-timeline-dot" /><div><strong>{eventLabels[item.su_kien] || item.su_kien}</strong><p>{displayDate(item.ngay)}</p><small>Thiết bị #{item.thiet_bi_id} · Tham chiếu #{item.lich_su_id}</small></div></li>)}</ol></>;
  return <div className="w-shell">
    <header className="w-shell-hero"><div><p className="w-shell-breadcrumb">BẢO HÀNH <ChevronRight size={12} /> CHI TIẾT PHIẾU</p><div className="w-shell-title-row"><h1>{data.ma_phieu}</h1><WarrantyBadge>{statusLabels[data.trang_thai_xu_ly] || data.trang_thai_xu_ly}</WarrantyBadge></div><p>{data.nguoi_lien_he?.ten || 'Chưa có tên liên hệ'} <span className="w-text-divider">/</span> {data.thiet_bi?.so_serial || data.thiet_bi?.ma_theo_doi || 'Thiết bị không có serial'}</p></div><div className="w-shell-actions"><button className="w-shell-button" disabled={locked} onClick={() => { setForm(null); setReload(value => value + 1); }}><RefreshCw size={15} /> Tải lại</button><button className="w-shell-button" disabled={locked} onClick={() => navigate('/admin/bao-hanh/danh-sach')}><ArrowLeft size={15} /> Danh sách phiếu</button></div></header>
    {message && <p className="w-intake-message" role="status"><CheckCircle2 size={18} />{message}</p>}{error && <p className="w-shell-error" role="alert">{error}</p>}{loading && <p className="w-loading" role="status">Đang cập nhật hồ sơ…</p>}
    <div className="w-detail-overview"><div className="w-process" aria-label="Vị trí hiện tại trong quy trình">{stages.map((label, index) => <div key={label} className={guide.step === index ? 'is-current' : ''} aria-current={guide.step === index ? 'step' : undefined}><span>{index + 1}</span><strong>{label}</strong>{index < stages.length - 1 && <ChevronRight size={16} />}</div>)}</div>
      <div className="w-next-step"><div><span className="w-eyebrow">Việc tiếp theo</span><h2>{guide.title}</h2><p>{guide.text}</p></div>{guide.group && <button className="w-shell-button w-shell-button--black" disabled={locked || loading || Boolean(error)} onClick={followGuide}>{guide.action ? actions.find(item => item.key === guide.action)?.label : 'Mở nhóm xử lý'}<ArrowRight size={17} /></button>}</div>
      <div className="w-summary-strip"><div><span>Đang giữ thiết bị<strong>{custodyLabels[custody?.loai] || 'Chưa xác định'}</strong></span></div><div><span>Tiếp nhận<strong>{displayDate(data.ngay_tiep_nhan)}</strong></span></div><div><span>Khách còn phải trả<strong>{invoice ? money(invoice.con_phai_thu) : 'Chưa có hóa đơn'}</strong></span></div></div>
    </div>
    <nav className="w-shell-tabs" aria-label="Các nhóm thông tin phiếu bảo hành">{tabs.map(([label, Icon], index) => <button type="button" key={label} aria-current={tab === index ? 'page' : undefined} disabled={locked} onClick={() => changeTab(index)}><Icon size={17} />{label}</button>)}</nav>
    <div className="w-shell-content"><div className="w-detail-controls">
      {groups[tab] && <div className="w-group-nav" aria-label="Nhóm thao tác">{Object.entries(groups[tab]).map(([key, label]) => <button type="button" key={key} aria-pressed={group === key} disabled={locked} onClick={() => { setGroup(key); setForm(null); }}>{label}</button>)}</div>}
      <details className="w-reference-details w-workflow-help"><summary>Xem luồng xử lý</summary>
        <p><strong>Tại cửa hàng:</strong> Tiếp nhận → Bắt đầu kiểm tra → Ghi kết luận → Bắt đầu công việc miễn phí → Kiểm tra thiết bị thực tế → Sẵn sàng trả → Bàn giao & hoàn tất.</p>
        <p><strong>Khách chịu phí:</strong> Sau kết luận, lập báo giá → Gửi khách → Khách đồng ý → Thu cọc nếu có → Bắt đầu công việc có phí.</p>
        <p><strong>Gửi đơn vị:</strong> Gửi thiết bị → Đơn vị đã nhận → Xử lý → Nhận lại thiết bị → Kiểm tra tiếp → Sẵn sàng trả.</p>
        <p><strong>Đổi thiết bị:</strong> Lập phương án → Phê duyệt và khách đồng ý → Xuất hoặc nhận hàng đổi → Kiểm tra → Sẵn sàng trả.</p>
        <p>Sẵn sàng trả là chờ khách nhận. Sau khi khách nhận thực tế, chọn Bàn giao & hoàn tất.</p>
      </details>
    </div><div className="w-shell-detail-grid"><main>
      {groups[tab] && <div ref={workbench} className="w-workbench"><WarrantyPanel title={groups[tab][group]} note={groupNotes[group]}>{form && form.operation.group === group ? <WarrantyActionForm key={form.key} operation={form.operation} detail={data} quoteVersion={form.version} values={drafts[form.key]} setValues={values => setDrafts(current => ({ ...current, [form.key]: values }))} close={() => setForm(null)} saved={saved} onLockChange={setLocked} /> : <><div className="w-operation-grid">{actions.filter(operation => operation.group === group && !unavailable(operation)).map(operation => <button className="w-operation-card" key={operation.key} onClick={() => open(operation)}><span><strong>{operation.label}</strong></span><ChevronRight size={17} /></button>)}</div>{actions.filter(operation => operation.group === group).every(operation => unavailable(operation)) && <p className="w-form-guide"><Info size={18} />Chưa có thao tác phù hợp. Xem điều kiện bên dưới hoặc kiểm tra bước trước.</p>}<details className="w-unavailable"><summary>Điều kiện của các thao tác khác</summary>{actions.filter(operation => operation.group === group && unavailable(operation)).map(operation => <div key={operation.key}><strong>{operation.label}</strong><p>{unavailable(operation)}</p></div>)}</details></>}</WarrantyPanel></div>}
      {lastResult && <details className="w-saved-result"><summary><CheckCircle2 size={17} /> Thao tác vừa lưu — xem thông tin tham chiếu</summary><WarrantySnapshot value={lastResult} /></details>}
      {tab === 0 && <><WarrantyPanel title="Thông tin tiếp nhận" note="Đối chiếu tình trạng ban đầu trước khi bắt đầu xử lý."><WarrantyFields fields={ [['Lý do tiếp nhận', data.tiep_nhan?.ly_do], ['Tình trạng khi nhận', data.tiep_nhan?.tinh_trang], ['Phụ kiện đi kèm', (data.tiep_nhan?.phu_kien || []).map(item => `${item.ten} × ${item.so_luong}`).join(', ') || 'Không ghi nhận phụ kiện'], ['Kết quả hiện tại', displayValue(data.ket_qua_xu_ly)]] } /><div className="w-intake-photos">{(data.tiep_nhan?.anh_urls || []).map(url => /^(https?:\/\/|\/(?!\/))/.test(url) && <figure key={url}><a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh tiếp nhận đã lưu" /></a></figure>)}</div></WarrantyPanel><WarrantyPanel title="Kết luận kiểm tra">{conclusions}</WarrantyPanel><WarrantyPanel title="Giao nhận thiết bị">{delivery}</WarrantyPanel></>}
      {tab === 1 && <>{group === 'inspection' && <><WarrantyPanel title="Kết luận đã lưu">{conclusions}</WarrantyPanel><WarrantyPanel title="Chi phí đơn vị đã xác nhận"><WarrantySnapshot value={data.chi_phi_don_vi} /></WarrantyPanel></>}{group === 'custody' && <WarrantyPanel title="Lịch sử giao nhận">{delivery}</WarrantyPanel>}{group === 'work' && <WarrantyPanel title="Hoạt động đã ghi nhận">{historyTable}</WarrantyPanel>}{group === 'handover' && <WarrantyPanel title="Lưu ý trước khi trả khách"><div className="w-form-guide"><Info size={20} /><p>“Sẵn sàng trả” là bước chuẩn bị, chưa phải bàn giao thực tế. Đối chiếu đúng thiết bị, phụ kiện, tình trạng và các nghĩa vụ thanh toán.</p></div><p className="w-shell-note">Khi khách nhận thực tế, chọn BÀN GIAO & HOÀN TẤT. Tiền phải thu cần thanh toán đủ hoặc có duyệt công nợ hợp lệ.</p></WarrantyPanel>}</>}
      {tab === 2 && <><div className="w-finance-cards"><div><span>Khách còn phải trả</span><strong>{money(invoice?.con_phai_thu)}</strong></div><div><span>Cần hoàn cho khách</span><strong>{money(invoice?.con_phai_hoan)}</strong></div><div><span>Báo giá đang xem</span><strong>{quoteLabels[quote?.trang_thai] || 'Chưa có'}</strong></div></div>{group === 'quotes' && <WarrantyPanel title="Báo giá đã lưu"><div className="w-shell-actions">{data.bao_gia.map(item => <button type="button" key={item.phien_ban} className={`w-shell-button ${quote?.phien_ban === item.phien_ban ? 'w-shell-button--black' : ''}`} onClick={() => { setQuoteVersion(item.phien_ban); setForm(null); }}>Phiên bản {item.phien_ban}</button>)}</div><WarrantySnapshot value={quote} /></WarrantyPanel>}{group === 'invoice' && <WarrantyPanel title="Hóa đơn & nghĩa vụ" note="Hóa đơn hủy vẫn giữ lịch sử tiền và các khoản cần hoàn.">{invoiceTable}<p className="w-shell-note">{paymentLabels[invoice?.trang_thai_thanh_toan]} · {refundLabels[invoice?.trang_thai_hoan_tien]}</p></WarrantyPanel>}{group === 'money' && <><WarrantyPanel title="Giao dịch tiền"><WarrantyTable columns={['Tham chiếu', 'Giao dịch', 'Số tiền', 'Phiếu thu / chi']} rows={(data.giao_dich_tien || []).map(item => [`#${item.id}`, actions.find(operation => operation.key === item.loai)?.label || item.loai, money(item.so_tien), item.phieu_thu_chi_id])} empty="Chưa có giao dịch tiền được ghi nhận." /></WarrantyPanel><WarrantyPanel title="Chi phí đơn vị"><WarrantySnapshot value={data.chi_phi_don_vi} /></WarrantyPanel></>}</>}
      {tab === 3 && <WarrantyPanel title="Thông tin đã lưu"><WarrantySnapshot value={group === 'settlement' ? data.doi_soat_nha_cung_cap : plan} />{group === 'items' && delivery}</WarrantyPanel>}
      {tab === 4 && <WarrantyPanel title="Lịch sử hoạt động" note="Các hoạt động đã được ghi nhận trên phiếu, mới nhất ở đầu danh sách.">{historyTable}</WarrantyPanel>}
    </main><aside><WarrantyPanel title="Khách hàng & đơn gốc"><div className="w-contact-card"><div><strong>{data.nguoi_lien_he?.ten || 'Chưa có tên'}</strong><p><Phone size={14} />{data.nguoi_lien_he?.sdt || 'Chưa có số điện thoại'}</p></div></div><WarrantyFields fields={ [['Đơn mua hàng', data.don_hang?.ma_don_hang]] } />{data.don_hang?.id && <button type="button" className="w-shell-button w-full-width" disabled={locked} onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${data.don_hang.id}`)}>Xem đơn mua hàng<ChevronRight size={15} /></button>}</WarrantyPanel><WarrantyPanel title="Thiết bị đang theo dõi"><div className="w-device-card"><strong>{data.thiet_bi_hien_hanh?.so_serial || data.thiet_bi?.so_serial || data.thiet_bi?.ma_theo_doi}</strong></div><WarrantyFields fields={ [['Hạn bảo hành', displayDate(data.thiet_bi_hien_hanh?.han_bao_hanh || data.thiet_bi?.han_bao_hanh)], ['Nơi đang giữ', custodyLabels[custody?.loai] || 'Chưa xác định']] } /><details className="w-reference-details"><summary>Thông tin đối chiếu thiết bị</summary><WarrantySnapshot value={data.thiet_bi} />{data.thiet_bi_hien_hanh?.id !== data.thiet_bi?.id && <WarrantySnapshot value={data.thiet_bi_hien_hanh} />}</details></WarrantyPanel></aside></div></div>
  </div>;
}
