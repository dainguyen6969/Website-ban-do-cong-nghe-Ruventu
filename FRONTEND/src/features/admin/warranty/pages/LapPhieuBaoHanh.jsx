import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import OrderModal from '../../orders/components/OrderModal';
import { mockWarrantyDevices, mockIntakeRequests } from '../data/mockData';
import { createMockWarranty, deviceIntakeBlocker, eligibilityOptions, intakeCriteria, intakeRequestById, lookupWarrantyDevices, receiptNow, saveMockIntakeRequest, validateWarrantyIntake } from '../data/warrantyModel';
import { WarrantyFields, WarrantyPanel } from '../components/WarrantyShell';
import '../styles/warrantyShell.css';

const steps = ['TÌM THIẾT BỊ', 'XÁC MINH BẢO HÀNH', 'THÔNG TIN TIẾP NHẬN', 'XÁC NHẬN'];
const notes = ['Tìm và chọn đúng thiết bị. Đối chiếu khách, đơn gốc và khả năng tiếp nhận.', 'Đối chiếu hạn và chứng từ; ghi điều kiện miễn phí cùng căn cứ xác minh.', 'Ghi thời điểm nhận, lý do và tình trạng; bổ sung phụ kiện, ảnh và ghi chú nếu có.', 'Kiểm tra thông tin và điều kiện còn thiếu trước khi xác nhận tiếp nhận thực tế.'];
const initialForm = () => ({ eligibility: 'Chưa xác minh', verification: '', reason: '', condition: '', receivedAt: receiptNow(), identification: '', unit: '', note: '', accessories: [], photos: [] });
const conditions = ['Máy hoạt động bình thường, lỗi phần mềm', 'Máy không khởi động được', 'Màn hình/Hiển thị bị lỗi', 'Quá nhiệt, tắt đột ngột', 'Có tiếng kêu bất thường', 'Cổng kết nối bị lỗi', 'Sản phẩm bị vỡ/nứt vỏ'];

export default function LapPhieuBaoHanh() {
  const navigate = useNavigate();
  const searchForm = useRef(null);
  const [step, setStep] = useState(0);
  const [criterion, setCriterion] = useState('serial');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [requestId, setRequestId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const [showConditions, setShowConditions] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const keyword = query.trim().toUpperCase();
  const suggestions = criterion === 'serial' && keyword ? mockWarrantyDevices.filter(device => device.serial?.toUpperCase().includes(keyword)).slice(0, 5) : [];
  const showSuggestions = suggestOpen && suggestions.length > 0;
  const validation = validateWarrantyIntake(selected, form);
  const blocker = deviceIntakeBlocker(selected);
  const pages = Math.max(1, Math.ceil(matches.length / 5));
  const change = (field, value) => { setForm(current => ({ ...current, [field]: value })); setError(''); setMessage(''); };
  const searchChange = value => { setQuery(value); setSelected(null); setRequestId(''); setMatches([]); setSearched(false); setSuggestIndex(-1); setError(''); setMessage(''); };
  const search = (value = query) => {
    setQuery(value); setMatches(lookupWarrantyDevices(criterion, value)); setSearched(Boolean(value.trim()));
    setSelected(null); setRequestId(''); setPage(1); setSuggestOpen(false); setSuggestIndex(-1); setResultsOpen(true); setError(''); setMessage('');
  };
  const choose = (device, request = criterion === 'requestId' ? intakeRequestById(query) : null) => {
    setSelected(device); setForm(request ? structuredClone(request.form) : initialForm()); setRequestId(request?.id || '');
    setResultsOpen(false); setError(''); setMessage(request ? `Yêu cầu #${request.id} · ${request.status}${request.ticketId ? ` · ${request.ticketId}` : ''}` : '');
  };
  const restore = request => {
    const device = mockWarrantyDevices.find(item => item.key === request.deviceKey);
    if (!device) { setError('Không tìm thấy thiết bị của yêu cầu đã lưu.'); return; }
    setCriterion('requestId'); setQuery(request.id); setMatches([device]); setSearched(true); setStep(0); choose(device, request);
  };
  const openConfirmation = action => {
    if (action !== 'ticket' && !form.verification.trim()) { setError('Vui lòng nhập lý do/căn cứ xử lý yêu cầu.'); setStep(1); return; }
    setError(''); setConfirmed(false); setModal(action);
  };
  const submit = () => {
    try {
      if (!confirmed) throw new Error('Vui lòng xác nhận thao tác.');
      if (modal === 'ticket') {
        const ticket = createMockWarranty(selected?.serial, form, confirmed, requestId);
        navigate('/admin/bao-hanh/danh-sach', { state: { createdTicketId: ticket.id } });
      } else {
        const request = saveMockIntakeRequest(selected, form, modal, requestId);
        setRequestId(request.id); setMessage(`#${request.id} · Đã lưu yêu cầu ${request.status.toLocaleLowerCase('vi-VN')} bằng dữ liệu mẫu.`); setModal('');
      }
    } catch (cause) { setError(cause.message); }
  };
  const addPhotos = async event => {
    const files = [...event.target.files]; event.target.value = '';
    if (files.some(file => !file.type.startsWith('image/'))) { setError('Vui lòng chọn tệp ảnh.'); return; }
    try {
      const photos = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, url: reader.result }); reader.onerror = () => reject(new Error('Không đọc được ảnh tiếp nhận.')); reader.readAsDataURL(file);
      })));
      setForm(current => ({ ...current, photos: [...current.photos, ...photos] })); setError('');
    } catch (cause) { setError(cause.message); }
  };
  const addImageLink = () => {
    try {
      const url = new URL(imageUrl);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      setForm(current => ({ ...current, photos: [...current.photos, { name: 'Ảnh liên kết', url: url.href }] })); setImageUrl(''); setError('');
    } catch { setError('Nhập liên kết ảnh HTTP hoặc HTTPS hợp lệ.'); }
  };
  const textField = (field, label, multiline = false, required = false) => <label className="w-intake-field">{label}{required && ' *'}{multiline ? <textarea value={form[field]} required={required} onChange={event => change(field, event.target.value)} /> : <input list={field === 'unit' ? 'warranty-units' : undefined} placeholder={field === 'unit' ? 'Không bắt buộc' : undefined} value={form[field]} required={required} onChange={event => change(field, event.target.value)} />}</label>;
  const selectedCard = selected && <div className="w-intake-selected"><div><small>THIẾT BỊ ĐÃ CHỌN</small><strong>{selected.productName} · {selected.productVariant}</strong><span>{selected.serial || selected.trackingCode || 'Không có serial'}</span><span>{selected.orderId || '—'} · {selected.customerName || '—'}</span></div><button type="button" className="w-shell-button" onClick={() => { setStep(0); setSelected(null); setMatches([]); setSearched(false); setRequestId(''); setForm(initialForm()); setMessage(''); setError(''); }}>ĐỔI THIẾT BỊ</button></div>;
  const summaryFields = selected ? [['KHÁCH HÀNG', `${selected.customerName || '—'} · ${selected.customerPhone || '—'}`], ['ĐƠN HÀNG', selected.orderId], ['THIẾT BỊ', `${selected.productName} · ${selected.productVariant || '—'}`], ['SERIAL / MÃ THEO DÕI', selected.serial || selected.trackingCode], ['ĐIỀU KIỆN MIỄN PHÍ', form.eligibility], ['CĂN CỨ XÁC MINH', form.verification], ['LÝ DO BẢO HÀNH', form.reason], ['TÌNH TRẠNG KHI NHẬN', form.condition], ['THỜI ĐIỂM NHẬN', form.receivedAt.replace('T', ' ')], ['DẤU HIỆU NHẬN DẠNG', form.identification], ['PHỤ KIỆN', form.accessories.map(item => `${item.name} × ${item.quantity}`).join(', ') || 'Không ghi nhận'], ['CHỨNG CỨ', form.photos.map(item => item.name).join(', ') || 'Chưa thêm'], ['ĐƠN VỊ DỰ KIẾN', form.unit || 'Chưa chỉ định'], ['GHI CHÚ', form.note]] : [];

  return <div className="w-shell">
    <header className="w-shell-hero"><div><p className="w-shell-breadcrumb">BẢO HÀNH / DANH SÁCH / LẬP PHIẾU</p><h1>LẬP PHIẾU BẢO HÀNH</h1><p>Tra cứu đúng thiết bị. Xác minh rõ điều kiện. Ghi nhận đúng thực tế.</p></div><button type="button" className="w-shell-button" onClick={() => navigate('/admin/bao-hanh/danh-sach')}>QUAY LẠI DANH SÁCH</button></header>
    <div className="w-shell-content w-intake-content">
      <nav className="w-intake-steps" aria-label="Các bước lập phiếu bảo hành">{steps.map((label, index) => <button type="button" key={label} disabled={index > 0 && !selected} aria-current={step === index ? 'step' : undefined} onClick={() => { setStep(index); setError(''); }}><small>0{index + 1}{index < step ? ' / ĐÃ XEM' : ''}</small>{label}</button>)}</nav>
      <div className="w-intake-step-note" role="status"><strong>0{step + 1} / {steps[step]}</strong><p>{notes[step]}</p></div>
      <p className="w-shell-note">Dữ liệu mẫu — chỉ lưu trong bộ nhớ phiên này, tải lại trang sẽ khôi phục dữ liệu ban đầu.</p>
      {message && <p className="w-intake-message" role="status">{message}</p>}
      {error && <p className="w-shell-error" role="alert">{error}</p>}
      {step === 0 && <>
        <details className="w-intake-help"><summary>DỮ LIỆU MẪU / THỬ TÌM THIẾT BỊ</summary><p>Chỉ điền tiêu chí có sẵn. Bấm TÌM và chọn đúng thiết bị trong kết quả.</p><div className="w-shell-actions">{[['Mã đơn hàng mẫu', 'orderId', '#1013'], ['Serial mẫu', 'serial', 'SSD1T-SN-002'], ['Liên hệ · Trương Minh Đức', 'customerPhone', '0912 333 444']].map(([label, field, value]) => <button type="button" key={field} className="w-shell-button" onClick={() => { setCriterion(field); searchChange(value); setSuggestOpen(false); }}>{label}<br />{value}</button>)}</div></details>
        <WarrantyPanel title="01 / TÌM THIẾT BỊ CẦN BẢO HÀNH">
          <form ref={searchForm} className="w-intake-search" onSubmit={event => { event.preventDefault(); search(); }}>
            <select aria-label="Tiêu chí tra cứu thiết bị" value={criterion} onChange={event => { setCriterion(event.target.value); searchChange(''); setSuggestOpen(false); }}>{Object.entries(intakeCriteria).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <div className="w-intake-search-input"><Search size={16} /><input role="combobox" aria-label="Nhập serial / mã theo dõi / mã đơn / SĐT..." placeholder="Nhập serial / mã theo dõi / mã đơn / SĐT..." aria-expanded={Boolean(showSuggestions)} aria-controls="warranty-serial-suggestions" aria-autocomplete="list" aria-activedescendant={showSuggestions && suggestIndex >= 0 ? `warranty-serial-${suggestIndex}` : undefined} value={query} onChange={event => { searchChange(event.target.value); setSuggestOpen(true); }} onFocus={() => setSuggestOpen(true)} onBlur={event => { if (!searchForm.current?.contains(event.relatedTarget)) setSuggestOpen(false); }} onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); setSuggestOpen(false); }
              if (showSuggestions && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setSuggestIndex(index => index < 0 ? (event.key === 'ArrowDown' ? 0 : suggestions.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length); }
              if (event.key === 'Enter' && showSuggestions && suggestIndex >= 0) { event.preventDefault(); search(suggestions[suggestIndex].serial); }
            }} />
              {showSuggestions && <div role="listbox" id="warranty-serial-suggestions" aria-label="Gợi ý serial" className="w-intake-suggestions">{suggestions.map((device, index) => <button type="button" role="option" tabIndex={-1} aria-selected={index === suggestIndex} id={`warranty-serial-${index}`} key={device.key} onMouseDown={event => event.preventDefault()} onClick={() => search(device.serial)}>{device.serial} · {device.productName} / {device.productVariant}</button>)}<small>Gợi ý hỗ trợ tra cứu; điều kiện tiếp nhận được kiểm tra riêng.</small></div>}
            </div>
            <button type="submit" className="w-shell-button w-shell-button--black" disabled={!query.trim()}>TÌM</button>
            {(searched || selected) && <button type="button" className="w-shell-button" onClick={() => { searchChange(''); setSuggestOpen(false); }}>XÓA</button>}
          </form>
          {!searched && <p className="w-intake-empty">Nhập thông tin để tìm thiết bị.</p>}
          {searched && !matches.length && <p className="w-intake-empty w-shell-error" role="status">{criterion === 'requestId' ? 'Không tìm thấy yêu cầu tiếp nhận.' : 'KHÔNG TÌM THẤY GIAO DỊCH / THIẾT BỊ PHÙ HỢP.'}<br />Kiểm tra lại tiêu chí hoặc nội dung rồi tìm lại.</p>}
          {searched && matches.length > 0 && <>
            <button type="button" className="w-shell-button w-intake-collapse" aria-expanded={resultsOpen} onClick={() => setResultsOpen(value => !value)}>{resultsOpen ? 'THU GỌN KẾT QUẢ' : `MỞ ${matches.length} KẾT QUẢ`}</button>
            {resultsOpen && <><div className="w-shell-table-scroll"><table className="w-shell-detail-table w-intake-results"><thead><tr>{['ĐƠN / LIÊN HỆ', 'THIẾT BỊ', 'GIAO DỊCH', 'HẠN / CĂN CỨ', 'CHỌN'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{matches.slice((page - 1) * 5, page * 5).map(device => { const reason = deviceIntakeBlocker(device); return <tr key={device.key}><td><strong>{device.orderId || '—'}</strong><span>{device.customerName || '—'}</span><span>{device.customerPhone || '—'}</span></td><td><strong>{device.productName}</strong><span>{device.productVariant}</span><span>{device.serial || device.trackingCode || 'Không serial'}</span>{reason && <small className="w-shell-error">{reason}</small>}</td><td><strong>{reason ? 'Chưa thể tiếp nhận' : 'Có thể tiếp nhận'}</strong><span>{device.serialStatus === 'ĐÃ BÁN' ? 'Đã giao khách' : 'Chưa xác định giao hàng'}</span></td><td>{device.warrantyExpiry || 'Chưa xác minh hạn'}<span>{device.expiryBasis || '—'}</span></td><td><button type="button" className="w-shell-button" aria-label={`${reason ? 'Xem' : 'Chọn'} thiết bị ${device.serial || device.trackingCode}`} onClick={() => choose(device)}>{reason ? 'XEM THIẾT BỊ' : 'CHỌN THIẾT BỊ'}</button></td></tr>; })}</tbody></table></div><div className="w-intake-result-pager"><button type="button" className="w-shell-button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>TRƯỚC</button><span>{matches.length} kết quả · Trang {page} / {pages}</span><button type="button" className="w-shell-button" disabled={page === pages} onClick={() => setPage(value => value + 1)}>SAU</button></div></>}
          </>}
          <details className="w-intake-requests"><summary>YÊU CẦU TIẾP NHẬN ĐÃ LƯU ({mockIntakeRequests.length})</summary>{mockIntakeRequests.length ? mockIntakeRequests.map(request => <button type="button" key={request.id} className="w-shell-button" onClick={() => restore(request)}>#{request.id} · {request.status} · {mockWarrantyDevices.find(device => device.key === request.deviceKey)?.customerName || '—'}</button>) : <p>Chưa có yêu cầu đã lưu.</p>}</details>
        </WarrantyPanel>
        {selectedCard}{selected && blocker && <p className="w-shell-error" role="status">{blocker}</p>}
      </>}
      {step === 1 && <WarrantyPanel title="02 / XÁC MINH ĐIỀU KIỆN">{selectedCard}<h3>THÔNG TIN TỪ GIAO DỊCH GỐC</h3><WarrantyFields fields={[[ 'ĐƠN HÀNG', selected.orderId ], [ 'HẠN BẢO HÀNH', selected.warrantyExpiry || 'Chưa xác minh hạn' ], [ 'CĂN CỨ TÍNH HẠN', selected.expiryBasis || 'Chưa xác định' ]]} /><div className="w-shell-subsection"><h3>ĐÁNH GIÁ ĐIỀU KIỆN BẢO HÀNH</h3><label className="w-intake-field">ĐIỀU KIỆN MIỄN PHÍ *<select value={form.eligibility} onChange={event => change('eligibility', event.target.value)}>{eligibilityOptions.map(option => <option key={option}>{option}</option>)}</select></label>{textField('verification', 'CĂN CỨ XÁC MINH', true, true)}<p className="w-shell-note">Còn hạn không tự động đồng nghĩa đủ điều kiện miễn phí.</p><p className="w-shell-note">Hết hạn không có nghĩa từ chối mọi dịch vụ sửa chữa có phí. Chưa xác minh khác với không đủ điều kiện miễn phí.</p></div></WarrantyPanel>}
      {step === 2 && <WarrantyPanel title="03 / THÔNG TIN TIẾP NHẬN">{selectedCard}<h3>A. NGƯỜI LIÊN HỆ / ĐƠN GỐC</h3><WarrantyFields fields={[[ 'KHÁCH HÀNG', selected.customerName ], [ 'SỐ ĐIỆN THOẠI', selected.customerPhone ], [ 'ĐƠN HÀNG', selected.orderId ], [ 'SERIAL', selected.serial || 'Chưa có serial' ]]} /><label className="w-intake-field">THỜI ĐIỂM NHẬN THỰC TẾ *<input type="datetime-local" required value={form.receivedAt} max={receiptNow()} onChange={event => change('receivedAt', event.target.value)} /></label><h3>B. TÌNH TRẠNG THIẾT BỊ</h3>{textField('reason', 'LÝ DO BẢO HÀNH', true, true)}{textField('condition', 'TÌNH TRẠNG KHI NHẬN', true, true)}<button type="button" className="w-shell-button" aria-expanded={showConditions} onClick={() => setShowConditions(value => !value)}>Gợi ý nhanh</button>{showConditions && <div className="w-shell-actions">{conditions.map(text => <button type="button" className="w-shell-button" key={text} onClick={() => change('condition', [form.condition, text].filter(Boolean).join(', '))}>{text}</button>)}</div>}{textField('identification', 'DẤU HIỆU NHẬN DẠNG', true)}<h3>C. PHỤ KIỆN &amp; CHỨNG CỨ</h3><button type="button" className="w-shell-button" onClick={() => change('accessories', [...form.accessories, { name: '', quantity: 1 }])}>+ THÊM PHỤ KIỆN</button>{form.accessories.map((item, index) => <div className="w-intake-accessory" key={index}><input aria-label={`Tên phụ kiện ${index + 1}`} value={item.name} onChange={event => change('accessories', form.accessories.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} /><input type="number" min="1" step="1" aria-label={`Số lượng phụ kiện ${index + 1}`} value={item.quantity} onChange={event => change('accessories', form.accessories.map((value, i) => i === index ? { ...value, quantity: event.target.value } : value))} /><button type="button" className="w-shell-button" aria-label={`Xóa phụ kiện ${index + 1}`} onClick={() => change('accessories', form.accessories.filter((_, i) => i !== index))}>XÓA</button></div>)}{!form.accessories.length && <p className="w-shell-note">Không ghi nhận phụ kiện.</p>}
        <label className="w-intake-field">ẢNH TIẾP NHẬN<input aria-label="Thêm ảnh tiếp nhận" type="file" accept="image/*" multiple onChange={addPhotos} /></label><p className="w-shell-note">Ảnh chỉ dùng trong phiên dữ liệu mẫu, không tải lên máy chủ.</p><div className="w-intake-photos">{form.photos.map((photo, index) => <figure key={index}><img src={photo.url} alt={photo.name} /><figcaption>{photo.name}</figcaption><button type="button" className="w-shell-button" aria-label={`Xóa ảnh ${index + 1}`} onClick={() => change('photos', form.photos.filter((_, i) => i !== index))}>XÓA</button></figure>)}</div><details className="w-intake-help"><summary>Thêm liên kết ảnh</summary><label className="w-intake-field">LIÊN KẾT ẢNH<input type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} /></label><button type="button" className="w-shell-button" onClick={addImageLink}>THÊM LIÊN KẾT</button></details><h3>GHI CHÚ &amp; ĐƠN VỊ DỰ KIẾN · KHÔNG BẮT BUỘC</h3>{textField('unit', 'ĐƠN VỊ DỰ KIẾN XỬ LÝ')}<datalist id="warranty-units">{[...new Set(mockWarrantyDevices.map(device => device.receptionUnit).filter(Boolean))].map(unit => <option key={unit} value={unit} />)}</datalist>{textField('note', 'GHI CHÚ', true)}</WarrantyPanel>}
      {step === 3 && <WarrantyPanel title="04 / XÁC NHẬN TIẾP NHẬN"><p>Đối chiếu thông tin trước khi ghi nhận. Tiếp nhận thiết bị không đồng nghĩa đủ điều kiện bảo hành miễn phí.</p><WarrantyFields fields={summaryFields} />{Object.keys(validation).length > 0 && <div className="w-intake-missing" role="status"><strong>ĐIỀU KIỆN CÒN THIẾU</strong><ul>{Object.values(validation).map(text => <li key={text}>{text}</li>)}</ul></div>}<div className="w-intake-step-note"><strong>Cần nhập gì?</strong><p>Chọn đúng một serial; nhập lý do, tình trạng, thời điểm nhận và căn cứ xác minh.</p><strong>Sau khi ghi:</strong><p>Tạo phiếu tiếp nhận nếu đủ điều kiện; yêu cầu chờ xác minh hoặc từ chối không phải phiếu bảo hành thành công.</p></div><div className="w-shell-actions"><button type="button" className="w-shell-button" onClick={() => openConfirmation('Chờ xác minh')}>LƯU YÊU CẦU CHỜ XÁC MINH</button><button type="button" className="w-shell-button" onClick={() => openConfirmation('Từ chối tiếp nhận')}>TỪ CHỐI TIẾP NHẬN</button></div></WarrantyPanel>}
      <footer className="w-intake-footer"><button type="button" className="w-shell-button" disabled={step === 0} onClick={() => setStep(value => value - 1)}>{step === 3 ? 'QUAY LẠI CHỈNH SỬA' : 'QUAY LẠI'}</button>{!selected && <span className="w-shell-note">Chọn thiết bị cụ thể để tiếp tục.</span>}{step < 3 ? <button type="button" className="w-shell-button w-shell-button--black" disabled={!selected} onClick={() => setStep(value => value + 1)}>{step === 2 ? 'KIỂM TRA & XÁC NHẬN' : 'TIẾP TỤC'}</button> : <button type="button" className="w-shell-button w-shell-button--red" disabled={Object.keys(validation).length > 0} onClick={() => openConfirmation('ticket')}>XÁC NHẬN TIẾP NHẬN</button>}</footer>
    </div>
    {modal && <OrderModal title={modal === 'ticket' ? 'XÁC NHẬN LẬP PHIẾU BẢO HÀNH' : modal.toLocaleUpperCase('vi-VN')} subtitle="Dữ liệu mẫu — chỉ lưu trong phiên hiện tại" close={() => { setModal(''); setError(''); }} submit={submit} disabled={!confirmed || (modal === 'ticket' && Object.keys(validation).length > 0)} error={error} confirmLabel={modal === 'ticket' ? 'TẠO PHIẾU BẢO HÀNH' : 'XÁC NHẬN LƯU'} cancelLabel="QUAY LẠI"><WarrantyFields fields={summaryFields.slice(0, 4)} /><p>{modal === 'ticket' ? 'Phiếu sẽ được thêm vào danh sách bảo hành mẫu.' : 'Thao tác này chỉ lưu yêu cầu, chưa tạo phiếu bảo hành.'}</p><label className="w-shell-modal-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi đã kiểm tra thiết bị và xác nhận thông tin trên.</label></OrderModal>}
  </div>;
}
