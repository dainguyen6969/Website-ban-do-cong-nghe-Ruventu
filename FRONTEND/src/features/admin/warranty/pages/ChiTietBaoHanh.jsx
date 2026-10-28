import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import OrderModal from '../../orders/components/OrderModal';
import { mockWarrantyData } from '../data/mockData';
import { dateKey, nextStatus, statusLabels, updateMockStatus } from '../data/warrantyModel';
import { WarrantyBadge, WarrantyFields, WarrantyPanel, WarrantyTable } from '../components/WarrantyShell';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import '../styles/warrantyShell.css';

const tabs = ['TỔNG QUAN', 'XỬ LÝ & GIAO NHẬN', 'BÁO GIÁ & THANH TOÁN', 'ĐỔI HÀNG & ĐỐI SOÁT', 'LỊCH SỬ'];
const statusActions = {
  'TIẾP NHẬN': 'BẮT ĐẦU KIỂM TRA', 'ĐANG KIỂM TRA': 'GỬI THIẾT BỊ',
  'ĐÃ GỬI BẢO HÀNH': 'ĐƠN VỊ ĐÃ NHẬN', 'ĐANG BẢO HÀNH': 'NHẬN LẠI THIẾT BỊ',
  'ĐÃ NHẬN LẠI': 'SẴN SÀNG TRẢ', 'CHỜ TRẢ KHÁCH': 'BÀN GIAO THIẾT BỊ',
};
const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const date = value => dateKey(value) ? value : 'Chưa xác định';

export default function ChiTietBaoHanh() {
  const { id } = useParams();
  return <WarrantyDetail key={id} id={id} />;
}

function WarrantyDetail({ id }) {
  const navigate = useNavigate();
  const [data, setData] = useState(() => {
    const item = mockWarrantyData.find(record => record.id === id);
    return item ? { ...item } : null;
  });
  const [tab, setTab] = useState(0);
  const historyPagination = useDetailTablePagination(data?.history);
  const [transition, setTransition] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [draftForm, setDraftForm] = useState('');
  // shortcut: operational forms keep local drafts only; wire them after the warranty backend exists.
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [quoteVersion, setQuoteVersion] = useState(null);

  if (!data) return <div className="w-shell"><div className="w-shell-content"><p role="status">Không tìm thấy phiếu bảo hành.</p><button className="w-shell-button" onClick={() => navigate('/admin/bao-hanh/danh-sach')}>QUAY LẠI</button></div></div>;

  const history = data.history || [];
  const quote = data.quotes?.find(item => item.version === quoteVersion) || data.quotes?.at(-1);
  const invoices = data.invoices || [];
  const canceledInvoices = data.canceledInvoices || (data.paymentStatus === 'Hóa đơn đã hủy' ? [{ code: `HD-${data.id}`, version: 1, total: 50000, paid: 50000, refunded: 50000 - data.remainingRefund, refund: data.remainingRefund }] : []);
  const target = nextStatus(data.status);
  const openTransition = () => { setTransition({ status: data.status, target }); setConfirmed(false); setNote(''); setError(''); };
  const updateStatus = () => {
    try {
      const current = mockWarrantyData.find(item => item.id === id);
      updateMockStatus(current, transition.status, transition.target, note, confirmed);
      setData({ ...current });
      setTransition(null);
      setMessage('Đã cập nhật trạng thái dữ liệu mẫu.');
    } catch (cause) { setError(cause.message); }
  };
  const openDraft = title => { setDraftForm(title); setMessage(''); };
  const field = (form, name) => drafts[form]?.[name] || '';
  const changeDraft = (form, name, value) => setDrafts(current => ({ ...current, [form]: { ...current[form], [name]: value } }));
  const draftInput = (form, label, type = 'text') => <label className="w-shell-modal-field" key={label}>{label}<input type={type} min={type === 'number' ? 0 : undefined} value={field(form, label)} onChange={event => changeDraft(form, label, event.target.value)} /></label>;
  const draftSelect = (form, label, options) => <label className="w-shell-modal-field" key={label}>{label}<select aria-label={label} value={field(form, label)} onChange={event => changeDraft(form, label, event.target.value)}><option value="">{options[0]}</option>{options.slice(1).map(option => <option key={option}>{option}</option>)}</select></label>;
  const draftText = (form, label) => <label className="w-shell-modal-field" key={label}>{label}<textarea value={field(form, label)} onChange={event => changeDraft(form, label, event.target.value)} /></label>;
  const closeDraft = () => { setDraftForm(''); setMessage('Đã giữ bản nháp giao diện trong phiên dữ liệu mẫu.'); };
  const goInspection = () => { setTab(1); setInspectionOpen(true); };
  const primary = data.status === 'ĐANG KIỂM TRA' ? 'Ghi kết luận kiểm tra' : data.status === 'HOÀN TẤT' ? 'Thiết bị đã được bàn giao' : 'Đối chiếu công việc và giao nhận';
  const emptyHistory = (events, empty) => events.length ? events.map((event, index) => <div className="w-shell-history-event" key={index}><small>{event.time} · {event.title}</small><p>{event.description}</p></div>) : <p className="w-shell-note">{empty}</p>;
  const action = (label, onClick, disabled = false) => <button type="button" className="w-shell-button" disabled={disabled} onClick={onClick}>{label}</button>;
  const other = (labels, reason) => <details className="w-shell-other"><summary className="w-shell-button">Thao tác khác</summary><div className="w-shell-other-menu">{labels.map(label => <button key={label} type="button" className="w-shell-button" disabled>{label}</button>)}<span className="w-shell-note">{reason}</span></div></details>;

  return <div className="w-shell">
    <header className="w-shell-hero"><div>
      <div className="w-shell-title-row">{action(<><ArrowLeft size={12} /> QUAY LẠI</>, () => navigate('/admin/bao-hanh/danh-sach'))}<h1>CHI TIẾT PHIẾU BẢO HÀNH</h1></div>
      <div className="w-shell-summary"><strong>{data.id}</strong><span>Dữ liệu mẫu</span><WarrantyBadge>{statusLabels[data.status]}</WarrantyBadge>{data.result && <WarrantyBadge>{data.result}</WarrantyBadge>}</div>
      <p><strong>Tiếp nhận:</strong> {date(data.created)} &nbsp; <strong>Cập nhật:</strong> {date(data.updated)}</p>
    </div><p className="w-shell-note">Thực hiện đúng tác vụ trong tab Xử lý &amp; giao nhận.</p></header>
    <nav className="w-shell-tabs" role="tablist" aria-label="Các nhóm thông tin phiếu bảo hành">{tabs.map((label, index) => <button type="button" role="tab" id={`warranty-tab-${index}`} aria-controls="warranty-tab-panel" aria-selected={tab === index} key={label} onClick={() => setTab(index)} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setTab(next); document.getElementById(`warranty-tab-${next}`)?.focus();
    }}>{label}</button>)}</nav>
    <div className="w-shell-content" id="warranty-tab-panel" role="tabpanel" aria-labelledby={`warranty-tab-${tab}`}>
      {message && <p className="w-shell-note" role="status">{message}</p>}
      <div className="w-shell-detail-grid"><main>
        <WarrantyPanel title="TÌNH TRẠNG HIỆN TẠI"><div className="w-shell-situation">
          <div><h3>PHIẾU ĐANG Ở ĐÂU?</h3><WarrantyBadge>{statusLabels[data.status]}</WarrantyBadge><p>Kết quả: {data.result || '—'}</p></div>
          <div><h3>THIẾT BỊ ĐANG Ở ĐÂU?</h3><strong>{data.custodyName || 'Chưa xác định'}</strong><p>{data.custodyType || '—'}</p></div>
          <div><h3>VIỆC CẦN XỬ LÝ TIẾP</h3><strong>{primary}</strong>{!data.inspection && <p>Chưa có kết luận kiểm tra đã lưu.</p>}{data.status === 'ĐANG KIỂM TRA' && action('Ghi kết luận kiểm tra', goInspection)}</div>
        </div></WarrantyPanel>

        {tab === 0 && <>
          <WarrantyPanel title="THÔNG TIN TIẾP NHẬN"><WarrantyFields fields={[
            ['LÝ DO TIẾP NHẬN', data.receptionReason], ['TÌNH TRẠNG LÚC NHẬN', data.receptionCondition],
            ['THỜI ĐIỂM NHẬN THỰC TẾ', data.receivedAt], ['ĐIỀU KIỆN MIỄN PHÍ', data.eligibility],
            ['CĂN CỨ XÁC MINH', data.verification], ['ĐƠN VỊ DỰ KIẾN', data.receptionUnit],
            ['DẤU HIỆU NHẬN DẠNG', data.identification], ['GHI CHÚ', data.receptionNote],
          ]} /><div className="w-shell-subsection w-shell-evidence"><div><h3>PHỤ KIỆN</h3>{data.accessories?.length ? <ul>{data.accessories.map(item => <li key={item}>{item}</li>)}</ul> : '—'}</div><div><h3>ẢNH / BẰNG CHỨNG</h3>{data.photos?.length ? <div className="w-intake-photos">{data.photos.map((photo, index) => <figure key={index}><img src={photo.url} alt={photo.name} /><figcaption>{photo.name}</figcaption></figure>)}</div> : <p className="w-shell-note">Không có ảnh đã lưu.</p>}</div></div></WarrantyPanel>
          <WarrantyPanel title="CÁC SỰ KIỆN ĐÃ TẢI" note="Tối đa ba sự kiện trên trang lịch sử hiện tại; không suy diễn từ trạng thái." action={action('XEM TOÀN BỘ LỊCH SỬ', () => setTab(4))}>{emptyHistory(history.slice(0, 3), 'Chưa có sự kiện đã tải.')}</WarrantyPanel>
        </>}

        {tab === 1 && <>
          <WarrantyPanel title="A. TÌNH TRẠNG XỬ LÝ" action={target && action(statusActions[data.status], openTransition)}><WarrantyFields fields={[
            ['TRẠNG THÁI PHIẾU', <WarrantyBadge key="status">{statusLabels[data.status]}</WarrantyBadge>], ['KẾT QUẢ KỸ THUẬT', data.result], ['NƠI ĐANG GIỮ THỰC TẾ', data.custodyName],
          ]} /></WarrantyPanel>
          <WarrantyPanel title="B. KẾT LUẬN KIỂM TRA"><p>{data.inspection || 'Chưa phát sinh kết luận kiểm tra.'}</p></WarrantyPanel>
          <WarrantyPanel title="C. GIAO NHẬN THỰC TẾ"><p className="w-shell-note">Chưa có sự kiện giao nhận đã lưu.</p></WarrantyPanel>
          <WarrantyPanel title="CÔNG VIỆC VÀ TIẾN ĐỘ" note="Chỉ bắt đầu phạm vi đã có khách đồng ý/cọc hoặc kết luận miễn phí có căn cứ.">
            <WarrantyTable columns={['NGUỒN / PHIÊN BẢN', 'HẠNG MỤC', 'KHÁCH ĐỒNG Ý / ĐIỀU KIỆN', 'CỌC', 'KHẢ NĂNG BẮT ĐẦU']} empty="Chưa có dữ liệu phạm vi được chấp thuận." />
            <div className="w-shell-actions">{action('YÊU CẦU DỪNG XỬ LÝ', () => openDraft('YÊU CẦU DỪNG XỬ LÝ'))}{other(['BẮT ĐẦU CÔNG VIỆC', 'CẬP NHẬT TIẾN ĐỘ'], 'Chưa có phạm vi công việc được chấp thuận.')}</div>
            <p className="w-shell-note">Không đóng phiếu chỉ vì ghi yêu cầu dừng.</p><div className="w-shell-subsection"><h3>LỊCH SỬ CÔNG VIỆC</h3><p className="w-shell-note">Chưa có sự kiện công việc.</p></div>
          </WarrantyPanel>
          <WarrantyPanel title="GIAO NHẬN VÀ NƠI ĐANG GIỮ" note="Gửi, đơn vị nhận, thu hồi và nhận lại là bốn sự kiện độc lập.">
            <WarrantyFields fields={ [['THIẾT BỊ CŨ', data.custodyName || 'Chưa có dữ liệu nơi giữ thực tế'], ['SẢN PHẨM THAY THẾ', 'Chưa có dữ liệu / chưa phát sinh']] } />
            <div className="w-shell-actions">{other(['GỬI THIẾT BỊ', 'ĐƠN VỊ ĐÃ NHẬN', 'NHẬN LẠI THIẾT BỊ'], 'Thực hiện bước chuyển hợp lệ trong Tình trạng xử lý.')}</div>
            <WarrantyTable columns={['LẦN GỬI', 'SỰ KIỆN', 'THIẾT BỊ THỰC NHẬN', 'SERIAL', 'PHỤ KIỆN', 'SAI LỆCH']} empty="Chưa có lần giao nhận thực tế được lưu." />
          </WarrantyPanel>
          <WarrantyPanel title="KIỂM TRA VÀ KẾT LUẬN" note="Kết luận theo từng lỗi. Còn hạn không có nghĩa đủ miễn phí. Báo phí, xác nhận nghĩa vụ và chi tiền là các bước riêng.">
            <div className="w-shell-actions">{action('GHI KẾT LUẬN', () => setInspectionOpen(true))}{other(['KIỂM TRA TIẾP'], 'Ghi kết luận trước khi thực hiện bước kiểm tra tiếp.')}</div>
            {inspectionOpen && <div className="w-shell-subsection">
              <details><summary>Hướng dẫn thao tác</summary><p className="w-shell-note">Đối chiếu lỗi, tình trạng và căn cứ kiểm tra. Các trường trong khung này chỉ lưu bản nháp dữ liệu mẫu.</p></details>
              <div className="w-shell-title-row"><h3>Ghi kết luận kiểm tra</h3>{action('ĐÓNG — GIỮ BẢN NHÁP', () => setInspectionOpen(false))}</div>
              <label className="w-shell-modal-field">Nội dung kết luận<textarea value={field('inspection', 'Nội dung kết luận')} onChange={event => changeDraft('inspection', 'Nội dung kết luận', event.target.value)} /></label>
              <div className="w-shell-fields">{['Mã hạng mục', 'Lỗi', 'Nội dung xử lý', 'Lý do', 'Căn cứ', 'Đơn vị kết luận'].map(label => <label className="w-shell-modal-field" key={label}>{label}<input value={field('inspection', label)} onChange={event => changeDraft('inspection', label, event.target.value)} /></label>)}
                <label className="w-shell-modal-field">Điều kiện miễn phí<select value={field('inspection', 'Điều kiện miễn phí')} onChange={event => changeDraft('inspection', 'Điều kiện miễn phí', event.target.value)}><option value="">Chưa xác minh</option><option>Đủ điều kiện miễn phí</option><option>Không đủ điều kiện miễn phí</option></select></label>
                <label className="w-shell-modal-field">Bên chịu phí<select value={field('inspection', 'Bên chịu phí')} onChange={event => changeDraft('inspection', 'Bên chịu phí', event.target.value)}><option value="">Khách hàng</option><option>Cửa hàng</option><option>Đơn vị bảo hành</option></select></label>
              </div>
              <label className="w-shell-modal-field">URL bằng chứng đã lưu (mỗi dòng một URL)<textarea value={field('inspection', 'Bằng chứng')} onChange={event => changeDraft('inspection', 'Bằng chứng', event.target.value)} /></label>
              <label className="w-shell-modal-field">Tệp đối chiếu cục bộ<input type="file" /></label>
              {action('GHI NHẬN KIỂM TRA', () => { setInspectionOpen(false); setMessage('Đã giữ bản nháp kiểm tra trong dữ liệu mẫu.'); })}
            </div>}
            <div className="w-shell-subsection"><h3>CHI PHÍ ĐƠN VỊ — NGHĨA VỤ ĐÃ XÁC NHẬN</h3><p className="w-shell-note">Chưa có nghĩa vụ chi phí đã xác nhận.</p></div>
            <div className="w-shell-subsection"><h3>LỊCH SỬ KIỂM TRA</h3><p className="w-shell-note">Chưa có sự kiện kiểm tra đã ghi.</p></div>
          </WarrantyPanel>
          <WarrantyPanel title="SẴN SÀNG TRẢ / BÀN GIAO THỰC TẾ" note="Sẵn sàng trả và khách thực nhận là hai sự kiện độc lập.">
            <WarrantyFields fields={ [['THIẾT BỊ SẼ TRẢ', `${data.productName} · ${data.productVariant}`], ['KẾT QUẢ', data.result || 'Chưa sẵn sàng'], ['NGHĨA VỤ HIỆN TẠI', data.paymentStatus || 'Chưa có thông tin']] } />
            <p className="w-shell-note">Phụ kiện dự kiến: {data.accessories?.join(' · ') || 'Không có'}</p>
            <div className="w-shell-actions">{['ĐÃ NHẬN LẠI', 'CHỜ TRẢ KHÁCH'].includes(data.status) && action(statusActions[data.status], openTransition)}{other(['SẴN SÀNG TRẢ', 'BÀN GIAO THIẾT BỊ'], 'Đối chiếu kết quả, thiết bị và nghĩa vụ trước khi bàn giao.')}</div>
          </WarrantyPanel>
        </>}

        {tab === 2 && <>
          <WarrantyPanel title="DỮ LIỆU TÀI CHÍNH ĐÃ LƯU"><WarrantyFields fields={ [['BÁO GIÁ THEO PHIÊN BẢN', data.quoteStatus || 'Chưa phát sinh báo giá.'], ['GIAO DỊCH TIỀN ĐÃ GHI', data.paymentStatus || 'Chưa có giao dịch tiền.'], ['CHI PHÍ ĐƠN VỊ ĐÃ XÁC NHẬN', null]] } /></WarrantyPanel>
          <WarrantyPanel title="A. BÁO GIÁ">{quote ? <><div className="w-shell-actions">{data.quotes.map(item => <button type="button" key={item.version} className={`w-shell-button ${quote.version === item.version ? 'w-shell-button--black' : ''}`} onClick={() => setQuoteVersion(item.version)}>PHIÊN BẢN {item.version}</button>)}</div><h3>BÁO GIÁ PHIÊN BẢN {quote.version}</h3><WarrantyBadge>{quote.status}</WarrantyBadge><p><strong>{money(quote.amount)}</strong></p><p>{quote.note}</p><div className="w-shell-actions">{action('GỬI BÁO GIÁ', () => openDraft('GỬI BÁO GIÁ'))}{other(['GHI NHẬN KHÁCH PHẢN HỒI'], 'Khung đang hiển thị các phiên bản báo giá mẫu.')}</div></> : <p>{data.quoteStatus || 'Chưa phát sinh phiên bản báo giá để ghi sự kiện.'}</p>}<div className="w-shell-subsection"><h3>SỰ KIỆN ĐÃ GHI</h3><p className="w-shell-note">Chưa có sự kiện báo giá.</p><h3>CHI PHÍ ĐƠN VỊ ĐÃ XÁC NHẬN</h3>—</div></WarrantyPanel>
          <WarrantyPanel title="B. HÓA ĐƠN VÀ NGHĨA VỤ">
            <h3>HÓA ĐƠN BẢO HÀNH</h3><p className="w-shell-note">Nghĩa vụ hóa đơn tách khỏi giao dịch thu/hoàn và tổng đơn bán gốc.</p>
            <WarrantyTable columns={['MÃ', 'HIỆU LỰC', 'PHIÊN BẢN', 'PHẢI THU', 'ĐÃ THU', 'CÒN THU', 'CÒN HOÀN']} rows={invoices.map(invoice => [invoice.code, 'Có hiệu lực', invoice.version, money(invoice.total), money(invoice.paid), money(invoice.due), money(invoice.refund)])} empty="Không có hóa đơn hiệu lực." />
            {invoices.length > 0 && <WarrantyFields fields={ [['THANH TOÁN', data.paymentStatus], ['HOÀN TIỀN', data.refundStatus], ['CÔNG NỢ', 'Chưa có phê duyệt']] } />}
            <div className="w-shell-actions">{invoices.length > 0 && action('ÁP DỤNG BÁO GIÁ ĐÃ DUYỆT', () => openDraft('ÁP DỤNG BÁO GIÁ ĐÃ DUYỆT'))}{other(['LẬP HÓA ĐƠN', 'HỦY HÓA ĐƠN'], 'Khung hóa đơn dùng dữ liệu mẫu, chưa có giao dịch thực tế.')}</div>
            <h3>HÓA ĐƠN ĐÃ HỦY</h3><WarrantyTable columns={['MÃ', 'TRẠNG THÁI', 'PHIÊN BẢN', 'TỔNG LỊCH SỬ', 'ĐÃ THU', 'ĐÃ HOÀN', 'CÒN HOÀN']} rows={canceledInvoices.map(invoice => [invoice.code, 'Đã hủy', invoice.version, money(invoice.total), money(invoice.paid), money(invoice.refunded), money(invoice.refund)])} empty="Chưa có hóa đơn đã hủy." />
            <p className="w-shell-note">Hóa đơn hủy giữ nguyên tổng lịch sử, đã thu và đã hoàn; không tự tạo giao dịch hoàn tiền khách.</p><div className="w-shell-subsection"><h3>PHÊ DUYỆT / ĐIỀU CHỈNH ĐÃ GHI</h3><p className="w-shell-note">Chưa có điều chỉnh hóa đơn.</p></div>
          </WarrantyPanel>
          <WarrantyPanel title="C. GIAO DỊCH TIỀN" note="Chỉ khoản tiền thực tế đã ghi nhận mới vào số dư. Quyết định khách, báo giá hoặc nghĩa vụ không tự tạo giao dịch.">
            <div className="w-shell-actions">{action('THU TIỀN KHÁCH', () => openDraft('THU TIỀN KHÁCH'))}{other(['HOÀN TIỀN KHÁCH', 'CHI TIỀN ĐƠN VỊ'], 'Khung giao diện dùng dữ liệu mẫu; chưa có chứng từ thực tế.')}</div>
            {draftForm === 'THU TIỀN KHÁCH' && <div className="w-shell-subsection"><div className="w-shell-title-row"><h3>Thu tiền khách</h3>{action('ĐÓNG — GIỮ BẢN NHÁP', () => setDraftForm(''))}</div><details><summary>Hướng dẫn thao tác</summary><p className="w-shell-note">Đối chiếu hóa đơn, người nộp và số tiền. Form này chỉ giữ bản nháp trong dữ liệu mẫu.</p></details><div className="w-shell-fields">
              {draftSelect(draftForm, 'Đối tượng / hóa đơn / nghĩa vụ', ['Chọn đối tượng phù hợp', ...invoices.map(invoice => `${invoice.code} · hiệu lực`), ...canceledInvoices.map(invoice => `${invoice.code} · đã hủy`)])}
              {draftInput(draftForm, 'Số tiền thực tế', 'number')}{draftSelect(draftForm, 'Phương thức', ['TIỀN MẶT', 'CHUYỂN KHOẢN'])}{draftInput(draftForm, 'Người nộp / nhận')}{draftInput(draftForm, 'Ngày ghi nhận (+07:00)', 'datetime-local')}{draftInput(draftForm, 'Mã chứng từ tham chiếu')}
            </div>{draftText(draftForm, 'URL chứng từ đã lưu (mỗi dòng)')}<label className="w-shell-modal-field">Tệp đối chiếu cục bộ — không thay chứng từ đã lưu<input type="file" /></label>{action('GHI NHẬN GIAO DỊCH', closeDraft)}<p className="w-shell-note">Dữ liệu mẫu — không ghi nhận thu tiền thực tế.</p></div>}
            <h3>SỐ DƯ THEO NGHĨA VỤ</h3><WarrantyTable columns={['THỜI ĐIỂM', 'LOẠI', 'THAM CHIẾU', 'SỐ TIỀN', 'CHỨNG TỪ', 'TRẠNG THÁI']} empty="Chưa có giao dịch tiền thực tế được ghi." />
          </WarrantyPanel>
        </>}

        {tab === 3 && <>
          <WarrantyPanel title="DỮ LIỆU ĐỔI HÀNG VÀ ĐỐI SOÁT ĐÃ LƯU"><WarrantyFields fields={ [['PHƯƠNG ÁN ĐỔI', 'Chưa có phương án đổi.'], ['NGHĨA VỤ NHÀ CUNG CẤP', data.pendingSettlement ? 'Còn đối soát NCC' : 'Chưa phát sinh nghĩa vụ đối soát.']] } /></WarrantyPanel>
          <WarrantyPanel title="PHƯƠNG ÁN ĐỔI" note="Phiên bản, phê duyệt, quyết định khách và từng sự kiện vật lý được lưu độc lập.">
            <div className="w-shell-actions"><select aria-label="Phiên bản phương án đổi"><option>Chưa có phiên bản</option></select>{action('+ LẬP PHIÊN BẢN', () => openDraft('LẬP PHIÊN BẢN'))}</div><p className="w-shell-note">Chưa có phương án đổi. Kết luận lỗi không tự tạo hoặc phê duyệt phương án.</p>
            {draftForm === 'LẬP PHIÊN BẢN' && <div className="w-shell-subsection"><div className="w-shell-title-row"><h3>Lập phiên bản phương án đổi</h3>{action('ĐÓNG', () => setDraftForm(''))}</div><details><summary>Hướng dẫn thao tác</summary><p className="w-shell-note">Chọn thiết bị, căn cứ và hạn áp dụng. Form chỉ giữ bản nháp mẫu, chưa phê duyệt hay bàn giao.</p></details><div className="w-shell-fields">
              {draftSelect(draftForm, 'Thay thế phiên bản', ['Không thay thế / phiên bản đầu'])}{draftSelect(draftForm, 'Kết luận kiểm tra', ['Chọn kết luận đã lưu'])}
              {draftText(draftForm, 'Lý do')}{draftText(draftForm, 'Căn cứ')}{draftInput(draftForm, 'Đơn vị phê duyệt')}
              {draftSelect(draftForm, 'Sản phẩm / cấu hình thay thế', ['Chọn phiên bản sản phẩm', ...new Set(mockWarrantyData.map(item => `${item.productName} / ${item.productVariant}`))])}
              {draftInput(draftForm, 'Tình trạng hàng')}{draftSelect(draftForm, 'Nguồn', ['HÃNG / ĐƠN VỊ BẢO HÀNH CẤP', 'TỒN KHO CỬA HÀNG'])}{draftSelect(draftForm, 'Cách áp dụng hạn', ['GIỮ HẠN CÒN LẠI', 'HẠN MỚI XÁC NHẬN'])}{draftText(draftForm, 'Căn cứ áp dụng hạn')}{draftSelect(draftForm, 'Báo giá phí đã đồng ý', ['Không có khoản phí', ...(data.quotes || []).filter(item => item.status === 'Khách đã đồng ý').map(item => `Phiên bản ${item.version}`)])}{draftInput(draftForm, 'Hướng xử lý thiết bị cũ')}
            </div>{draftText(draftForm, 'URL chứng từ / bằng chứng đã lưu (mỗi dòng)')}<label className="w-shell-modal-field">Tệp đối chiếu cục bộ — không thay chứng từ đã lưu<input type="file" /></label><p className="w-shell-note">Tiếp tục hạn còn lại của giao dịch gốc; không reset theo serial mới.</p>{action('HỦY THAO TÁC', () => setDraftForm(''))} {action('XÁC NHẬN THAO TÁC', closeDraft)}</div>}
            <div className="w-shell-subsection"><h3>LỊCH SỬ PHIÊN BẢN / PHÊ DUYỆT / QUYẾT ĐỊNH</h3><p className="w-shell-note">Chưa có sự kiện phương án đổi.</p></div>
          </WarrantyPanel>
          <WarrantyPanel title="NGHĨA VỤ / ĐỐI SOÁT NHÀ CUNG CẤP" note="Nghĩa vụ, giao nhận, hàng bù và tiền thực nhận là các sự kiện riêng."><div className="w-shell-actions">{action('GHI NHẬN NGHĨA VỤ', () => openDraft('GHI NHẬN NGHĨA VỤ'))}{other(['GHI NHẬN HÀNG BÙ', 'GHI NHẬN TIỀN THỰC NHẬN'], 'Chưa có nghĩa vụ được xác nhận trong dữ liệu mẫu.')}</div></WarrantyPanel>
        </>}

        {tab === 4 && <WarrantyPanel title="LỊCH SỬ SỰ KIỆN ĐÃ LƯU" note="Không dựng tiến trình từ trạng thái hiện tại."><WarrantyTable columns={['THỜI ĐIỂM', 'SỰ KIỆN', 'NGƯỜI THAO TÁC', 'NỘI DUNG', 'BẰNG CHỨNG']} rows={historyPagination.visibleItems.map(event => [event.time, event.title, event.actor, event.description, event.evidence])} empty="Chưa có sự kiện đã lưu." /><DetailTablePagination totalItems={history.length} currentPage={historyPagination.currentPage} onPageChange={historyPagination.onPageChange} idPrefix="warranty-history" /></WarrantyPanel>}
      </main><aside>
        <WarrantyPanel title="NGƯỜI LIÊN HỆ / ĐƠN GỐC"><WarrantyFields fields={ [['NGƯỜI LIÊN HỆ', data.customerName], ['SỐ ĐIỆN THOẠI', data.customerPhone], ['MÃ ĐƠN HÀNG', data.orderId], ['ID ĐƠN HÀNG', data.originalOrderId]] } /><div className="w-shell-actions">{action('XEM ĐƠN HÀNG', () => openDraft('ĐƠN HÀNG GỐC'))}</div></WarrantyPanel>
        <WarrantyPanel title="THIẾT BỊ NHẬN BAN ĐẦU"><WarrantyFields fields={ [['SẢN PHẨM', <>{data.productName}<div className="w-shell-note">{data.productVariant}</div></>], ['SERIAL / MÃ THEO DÕI', data.serial || data.trackingCode], ['ĐIỀU KIỆN MIỄN PHÍ', data.eligibility], ['HẠN BẢO HÀNH', data.warrantyExpiry], ['CĂN CỨ TÍNH HẠN', data.expiryBasis]] } />{data.serial && <div className="w-shell-actions">{action('XEM SERIAL', () => openDraft('THÔNG TIN SERIAL'))}</div>}</WarrantyPanel>
        <WarrantyPanel title="NƠI ĐANG GIỮ">{data.custodyName ? <WarrantyFields fields={ [['LOẠI NƠI GIỮ', data.custodyType], ['TÊN / ĐƠN VỊ', data.custodyName], ['GHI CHÚ / THIẾT BỊ CŨ', data.custodyNote]] } /> : <p className="w-shell-note">Chưa xác định nơi đang giữ.</p>}</WarrantyPanel>
      </aside></div>
    </div>

    {transition && <OrderModal title="CẬP NHẬT TRẠNG THÁI BẢO HÀNH" subtitle="Dữ liệu mẫu" close={() => setTransition(null)} submit={updateStatus} disabled={!confirmed} error={error} confirmLabel="XÁC NHẬN CẬP NHẬT" cancelLabel="HỦY">
      <WarrantyFields fields={ [['MÃ PHIẾU', data.id], ['SERIAL / MÃ THEO DÕI', data.serial || data.trackingCode], ['TRẠNG THÁI HIỆN TẠI', statusLabels[transition.status]], ['TRẠNG THÁI TIẾP THEO', statusLabels[transition.target]]] } />
      <label className="w-shell-modal-field">GHI CHÚ (TÙY CHỌN)<textarea value={note} onChange={event => setNote(event.target.value)} /></label>
      <label className="w-shell-modal-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi xác nhận chuyển sang {statusLabels[transition.target]}.</label>
    </OrderModal>}
    {draftForm && !['THU TIỀN KHÁCH', 'LẬP PHIÊN BẢN'].includes(draftForm) && <OrderModal title={draftForm} subtitle="Dữ liệu mẫu" close={() => setDraftForm('')} submit={closeDraft} confirmLabel="ĐÓNG — GIỮ BẢN NHÁP">
      <WarrantyFields fields={ [['MÃ PHIẾU', data.id], ['THIẾT BỊ', data.productName], ['SERIAL / MÃ THEO DÕI', data.serial || data.trackingCode], ['MÃ ĐƠN HÀNG', data.orderId]] } />
      {!['ĐƠN HÀNG GỐC', 'THÔNG TIN SERIAL'].includes(draftForm) && <label className="w-shell-modal-field">GHI CHÚ<textarea value={field(draftForm, 'GHI CHÚ')} onChange={event => changeDraft(draftForm, 'GHI CHÚ', event.target.value)} /></label>}
    </OrderModal>}
  </div>;
}
