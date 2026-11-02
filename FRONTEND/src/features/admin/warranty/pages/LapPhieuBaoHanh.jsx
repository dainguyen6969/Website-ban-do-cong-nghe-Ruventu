import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, MessageSquareText as Info } from 'lucide-react';
import OrderModal from '../../orders/components/OrderModal';
import { WarrantyFields, WarrantyPanel, WarrantyTable } from '../components/WarrantyShell';
import { lookupWarranties, mutateWarranty, warrantyError } from '../api/warrantyApi';
import { displayDate, eligibilityLabels, intakeBody, intakeCriteria, intakeErrors, intakeStepErrors, intakeReachableStep, lookupFields, receiptNow } from '../data/warrantyContract';
import { uploadImage } from '../../../media/api/imageUploadApi';
import { validateImageFiles } from '../../../media/api/imageValidation';
import { getSerialPage } from '../../inventory/api/serialApi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import '../styles/warrantyShell.css';

const steps = ['TÌM THIẾT BỊ', 'XÁC MINH BẢO HÀNH', 'THÔNG TIN TIẾP NHẬN', 'XÁC NHẬN'];
const stepGuides = [
  ['Tìm đúng thiết bị của khách', 'Tìm bằng serial, sản phẩm, mã đơn hoặc SĐT.'],
  ['Đối chiếu trước khi tiếp nhận', 'Kiểm tra đơn mua, hạn và điều kiện miễn phí.'],
  ['Ghi rõ những gì cửa hàng thực tế nhận', 'Ghi liên hệ, lỗi, tình trạng, phụ kiện và ảnh.'],
  ['Kiểm tra lần cuối trước khi tạo phiếu', 'Đúng khách, đúng thiết bị, đã nhận giữ.'],
];
const initialForm = () => ({ eligibility: '', verification: '', reason: '', condition: '', contact: '', phone: '', receivedAt: receiptNow(), identification: '', unit: '', note: '', accessories: [], photos: [] });
export default function LapPhieuBaoHanh() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0), [criterion, setCriterion] = useState('serial'), [query, setQuery] = useState('');
  const [lookup, setLookup] = useState(null), [page, setPage] = useState(1), [selected, setSelected] = useState(null), [requestId, setRequestId] = useState(null);
  const [form, setForm] = useState(initialForm), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [searching, setSearching] = useState(false), [modal, setModal] = useState(null), [confirmed, setConfirmed] = useState(false), [imageUrl, setImageUrl] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({}), [outcome, setOutcome] = useState(null);
  const lookupController = useRef(null), mutation = useRef(null), saving = useRef(false);
  useEffect(() => () => lookupController.current?.abort(), []);
  const change = (key, value) => { setForm(current => ({ ...current, [key]: value })); setFieldErrors(current => ({ ...current, [key]: '' })); setError(''); };
  const blocked = busy || uncertain || uploading || searching;
  const move = index => {
    if (blocked) return;
    setOutcome(null); setError(''); setFieldErrors({});
    if (index > step) for (let current = 0; current < index; current++) {
      const errors = intakeStepErrors(selected, form, current);
      if (Object.keys(errors).length) { setFieldErrors(errors); setError('Kiểm tra thông tin tại bước này trước khi tiếp tục.'); setStep(current); return; }
    }
    setStep(index);
  };
  const resetSearch = value => { lookupController.current?.abort(); setQuery(value); setLookup(null); setSelected(null); setRequestId(null); setPage(1); setSearching(false); setError(''); setMessage(''); setFieldErrors({}); setOutcome(null); };
  const search = async (nextPage = 1) => {
    if (!query.trim()) { setError('Nhập nội dung tra cứu.'); return; }
    if (criterion === 'requestId' && !/^[1-9]\d*$/.test(query.trim())) { setError('ID yêu cầu phải là số nguyên dương.'); return; }
    lookupController.current?.abort();
    const controller = new AbortController(); lookupController.current = controller;
    setSearching(true); setError(''); setSelected(null); setRequestId(null); setLookup(null); setPage(nextPage);
    try {
      let result;
      if (criterion === 'serial') {
        const data = await getSerialPage({ keyword: query.trim(), page: nextPage, limit: 20 }, controller.signal);
        result = { items: data.items.map(item => ({ serial_candidate: true, so_serial: item.serial, phien_ban_id: item.versionId, ten_san_pham: item.productName, ten_phien_ban: item.version, trang_thai_serial: item.status })), yeu_cau_tiep_nhan: [], pagination: { total_elements: data.totalItems } };
      } else result = await lookupWarranties({ [lookupFields[criterion]]: query.trim(), page: nextPage - 1, limit: 20 }, controller.signal);
      if (!controller.signal.aborted) setLookup(result);
    } catch (cause) { if (!controller.signal.aborted) setError(warrantyError(cause)); }
    finally { if (!controller.signal.aborted) setSearching(false); }
  };
  const choose = async (device, request = null) => {
    if (device?.serial_candidate) {
      lookupController.current?.abort();
      const controller = new AbortController(); lookupController.current = controller;
      setSearching(true); setError('');
      try {
        const result = await lookupWarranties({ so_serial: device.so_serial, page: 0, limit: 20 }, controller.signal);
        if (controller.signal.aborted) return;
        if (result.items.length !== 1) { setLookup(result); setSelected(null); setPage(1); setMessage('Chọn đúng giao dịch gốc trong kết quả xác minh serial.'); return; }
        device = { ...result.items[0], ten_san_pham: device.ten_san_pham, ten_phien_ban: device.ten_phien_ban };
      } catch (cause) { if (!controller.signal.aborted) setError(warrantyError(cause)); return; }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }
    setSelected(device); setRequestId(request?.id || null); setError(''); setFieldErrors({}); setStep(0); setOutcome(null); setMessage('');
    setForm({ ...initialForm(), contact: request?.ten_nguoi_lien_he || '', phone: request?.sdt_nguoi_lien_he || '', reason: request?.ly_do || '' });
  };
  const restore = request => {
    const device = lookup.items.find(item => request.thiet_bi_id != null ? item.thiet_bi_id === request.thiet_bi_id : request.so_serial && item.so_serial === request.so_serial && (!request.don_hang_id || item.don_hang_id === request.don_hang_id));
    choose(device || null, request);
    setMessage(`Đang xử lý yêu cầu #${request.id}. ${request.ket_qua_tiep_nhan === 'TU_CHOI' ? 'Đã ghi từ chối trước đó.' : 'Cần xác minh nguồn gốc và chọn đúng thiết bị trước khi lập phiếu.'}`);
  };
  const prepare = action => {
    setError(''); setConfirmed(false);
    if (action === 'ticket') {
      if (intakeReachableStep(selected, form) < 3) { move(3); return; }
      const errors = intakeErrors(selected, form);
      if (errors.length) { setError(errors.join('\n')); return; }
      setModal({ action, body: intakeBody(selected, form, requestId) });
    } else {
      const errors = { ...intakeStepErrors(selected, form, 2), ...intakeStepErrors(null, form, 1) };
      for (const key of ['condition', 'identification', 'receivedAt', 'accessories', 'eligibility']) delete errors[key];
      if (Object.keys(errors).length) { setFieldErrors(errors); setError('Nhập đủ thông tin kết quả chưa tiếp nhận.'); return; }
      setModal({ action, body: { yeu_cau_tiep_nhan_id: requestId, don_hang_id: selected?.don_hang_id ?? null, chi_tiet_don_hang_id: selected?.chi_tiet_don_hang_id ?? null, thiet_bi_id: selected?.thiet_bi_id ?? null, so_serial: selected?.so_serial || (criterion === 'serial' ? query.trim() || null : null), ten_nguoi_lien_he: form.contact.trim(), sdt_nguoi_lien_he: form.phone.trim(), ket_qua_tiep_nhan: action, ly_do: form.reason.trim(), can_cu: form.verification.trim(), bang_chung_urls: form.photos.map(item => item.url) } });
    }
  };
  const submit = async () => {
    if (saving.current || !confirmed) return;
    const serialized = JSON.stringify(modal);
    if (mutation.current?.serialized !== serialized) mutation.current = { serialized, key: crypto.randomUUID() };
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await mutateWarranty(null, modal.action === 'ticket' ? '' : 'intake-results', modal.body, mutation.current.key);
      mutation.current = null; setUncertain(false);
      if (modal.action === 'ticket') navigate(`/admin/bao-hanh/chi-tiet/${result.id}`);
      else { setRequestId(result.yeu_cau_tiep_nhan_id); setModal(null); setOutcome(null); setMessage(`Đã lưu yêu cầu #${result.yeu_cau_tiep_nhan_id}: ${result.ket_qua_tiep_nhan === 'TU_CHOI' ? 'Từ chối tiếp nhận' : 'Chờ xác minh'}. Chưa tạo phiếu bảo hành.`); }
    } catch (cause) { const unknown = !cause.status || cause.status >= 500; setUncertain(unknown); setError(`${warrantyError(cause)}${unknown ? '\nChưa xác định kết quả lưu. Thử lại dùng nguyên yêu cầu và khóa chống trùng.' : ''}`); }
    finally { saving.current = false; setBusy(false); }
  };
  const addPhotos = async event => {
    const files = [...event.target.files]; event.target.value = '';
    try { validateImageFiles(files); if (files.length + form.photos.length > 100) throw new Error('Tối đa 100 ảnh tiếp nhận.'); }
    catch (cause) { setError(cause.message); return; }
    setUploading(true); setError('');
    try {
      // Lưu từng ảnh thành công ngay để một ảnh lỗi không làm mất URL của ảnh đã tải.
      for (const file of files) { const result = await uploadImage(file, 'general'); setForm(current => ({ ...current, photos: [...current.photos, { name: file.name, url: result.url }] })); }
    } catch (cause) { setError(warrantyError(cause)); }
    finally { setUploading(false); }
  };
  const addLink = () => {
    try { const url = new URL(imageUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); change('photos', [...form.photos, { name: 'Ảnh liên kết', url: url.href }]); setImageUrl(''); }
    catch { setError('Nhập liên kết ảnh HTTP hoặc HTTPS hợp lệ.'); }
  };
  const field = (name, label, type = 'text', required = false) => <label className="w-intake-field">{label}{required && ' *'}{type === 'textarea' ? <textarea aria-invalid={Boolean(fieldErrors[name])} value={form[name]} onChange={event => change(name, event.target.value)} /> : <input aria-invalid={Boolean(fieldErrors[name])} type={type} step={type === 'datetime-local' ? '0.001' : undefined} value={form[name]} max={type === 'datetime-local' ? receiptNow() : undefined} onChange={event => change(name, event.target.value)} />}{fieldErrors[name] && <small className="w-shell-error">{fieldErrors[name]}</small>}</label>;
  const selection = selected && <div className="w-intake-selected"><div><small>THIẾT BỊ / DÒNG HÀNG ĐÃ CHỌN</small>{(selected.ten_phien_ban || selected.ten_san_pham) && <strong>{selected.ten_phien_ban || selected.ten_san_pham}</strong>}<strong>{selected.so_serial || selected.ma_theo_doi || `Dòng mua #${selected.chi_tiet_don_hang_id} · Không serial`}</strong><span>{selected.ma_don_hang} · {selected.ten_phien_ban || `Phiên bản #${selected.phien_ban_id}`}</span></div><button type="button" className="w-shell-button" onClick={() => { setStep(0); setSelected(null); setRequestId(null); setFieldErrors({}); setOutcome(null); setMessage(''); }}>ĐỔI THIẾT BỊ</button></div>;
  const validation = intakeErrors(selected, form);
  return <div className="w-shell"><header className="w-shell-hero"><div><p className="w-shell-breadcrumb">BẢO HÀNH / TIẾP NHẬN MỚI</p><div className="w-shell-title-row"><h1>LẬP PHIẾU BẢO HÀNH</h1></div><p>Hoàn thành 4 bước để ghi nhận đúng khách hàng và thiết bị.</p></div><button type="button" className="w-shell-button" disabled={blocked} onClick={() => navigate('/admin/bao-hanh/danh-sach')}><ArrowLeft size={15} /> Danh sách phiếu</button></header>
    <div className="w-shell-content w-intake-content"><nav className="w-intake-steps" aria-label="Các bước lập phiếu bảo hành">{steps.map((label, index) => <button type="button" key={label} disabled={blocked || index > intakeReachableStep(selected, form)} aria-current={step === index ? 'step' : undefined} onClick={() => move(index)}><small>{index < step ? <Check size={16} /> : index + 1}</small>{label.charAt(0) + label.slice(1).toLocaleLowerCase('vi')}</button>)}</nav>
      <div className="w-intake-step-note"><Info size={22} /><div><strong>{stepGuides[step][0]}</strong><p>{stepGuides[step][1]}</p></div></div>
      {message && <p className="w-intake-message" role="status">{message}</p>}{!modal && error && <p className="w-shell-error" role="alert">{error}</p>}
      {fieldErrors.device && <p className="w-shell-error" role="alert">{fieldErrors.device}</p>}
      {outcome && <WarrantyPanel title={outcome === 'TU_CHOI' ? 'GHI KẾT QUẢ TỪ CHỐI TIẾP NHẬN' : 'GHI KẾT QUẢ CHỜ XÁC MINH'} note="Chưa nhận giữ thiết bị và chưa tạo phiếu bảo hành."><fieldset className="w-action-fields" disabled={blocked}><div className="w-shell-fields">{field('contact', 'TÊN NGƯỜI LIÊN HỆ', 'text', true)}{field('phone', 'SỐ ĐIỆN THOẠI', 'tel', true)}{field('verification', 'CĂN CỨ XÁC MINH', 'textarea', true)}{field('reason', 'LÝ DO / KẾT QUẢ XỬ LÝ', 'textarea', true)}</div><button type="button" className="w-shell-button" onClick={() => prepare(outcome)}>KIỂM TRA KẾT QUẢ</button><button type="button" className="w-shell-button" onClick={() => { setOutcome(null); setError(''); setFieldErrors({}); }}>ĐÓNG</button></fieldset></WarrantyPanel>}
      <fieldset className="w-action-fields" disabled={busy || uncertain || uploading}>
      {step === 0 && <WarrantyPanel title="01 / TÌM THIẾT BỊ CẦN BẢO HÀNH"><form className="w-intake-search" onSubmit={event => { event.preventDefault(); search(); }}><select aria-label="Tiêu chí tra cứu thiết bị" value={criterion} onChange={event => { setCriterion(event.target.value); resetSearch(''); }}>{Object.entries(intakeCriteria).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input aria-label="Nội dung tra cứu thiết bị" value={query} onChange={event => resetSearch(event.target.value)} placeholder="Serial / mã theo dõi / mã đơn / SĐT..." /><button className="w-shell-button w-shell-button--black" disabled={searching || !query.trim()}>TÌM</button><button type="button" className="w-shell-button" onClick={() => resetSearch('')}>XÓA</button></form>{searching && <p role="status">Đang tra cứu...</p>}{lookup && <><WarrantyTable columns={['ĐƠN HÀNG', 'THIẾT BỊ / PHIÊN BẢN', 'GIAO DỊCH', 'HẠN / CĂN CỨ', 'CHỌN']} rows={lookup.items.map((item, index) => [item.ma_don_hang || 'Chờ xác minh', <span key={index}>{(item.ten_phien_ban || item.ten_san_pham) && <><strong>{item.ten_phien_ban || item.ten_san_pham}</strong><br /></>}{item.so_serial || item.ma_theo_doi || 'Không serial'}<br />Phiên bản #{item.phien_ban_id}<br />{(item.ly_do_chan || []).map(reason => reason.message).join(' · ')}</span>, item.serial_candidate ? 'Chọn để xác minh giao dịch' : item.da_giao_khach ? 'Đã giao khách' : 'Chưa xác minh đã giao', <span key={index}>{displayDate(item.han_bao_hanh)}<br />{item.can_cu_tinh_han || 'Chưa xác minh hạn'}</span>, <button type="button" key={index} className="w-shell-button" disabled={searching} onClick={() => choose(item, lookup.yeu_cau_tiep_nhan?.find(request => request.id === requestId) || (criterion === 'requestId' ? lookup.yeu_cau_tiep_nhan?.[0] : null))}>{item.serial_candidate ? 'XÁC MINH SERIAL' : item.co_the_tiep_nhan ? 'CHỌN THIẾT BỊ' : 'XEM THIẾT BỊ'}</button>])} empty="Không tìm thấy giao dịch / thiết bị phù hợp." /><TablePagination totalItems={lookup.pagination.total_elements} pageSize={20} currentPage={page} onPageChange={search} idPrefix="warranty-intake" /><details><summary>YÊU CẦU TIẾP NHẬN ĐÃ LƯU</summary>{(lookup.yeu_cau_tiep_nhan || []).map(request => <p key={request.id}><button type="button" className="w-shell-button" onClick={() => restore(request)}>#{request.id} · {request.ten_nguoi_lien_he} · {request.ket_qua_tiep_nhan === 'TU_CHOI' ? 'Từ chối' : 'Chờ xác minh'}</button></p>)}</details></>}{selection}</WarrantyPanel>}
      {step === 1 && <WarrantyPanel title="02 / XÁC MINH ĐIỀU KIỆN">{selection}<WarrantyFields fields={ [['ĐƠN HÀNG', selected?.ma_don_hang], ['HẠN BẢO HÀNH', displayDate(selected?.han_bao_hanh)], ['CĂN CỨ TÍNH HẠN', selected?.can_cu_tinh_han]] } /><label className="w-intake-field">ĐIỀU KIỆN MIỄN PHÍ *<select aria-invalid={Boolean(fieldErrors.eligibility)} value={form.eligibility} onChange={event => change('eligibility', event.target.value)}><option value="">Chọn điều kiện sau khi kiểm tra</option>{Object.entries(eligibilityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{fieldErrors.eligibility && <small className="w-shell-error">{fieldErrors.eligibility}</small>}</label>{field('verification', 'CĂN CỨ XÁC MINH', 'textarea', true)}<p className="w-shell-note">Còn hạn không tự đồng nghĩa đủ miễn phí. Hết hạn vẫn có thể tiếp nhận dịch vụ có phí.</p>{selected?.ly_do_chan?.map(reason => <p className="w-shell-error" key={reason.code}>{reason.message}</p>)}</WarrantyPanel>}
      {step === 2 && <WarrantyPanel title="03 / THÔNG TIN TIẾP NHẬN">{selection}<div className="w-shell-fields">{field('contact', 'TÊN NGƯỜI LIÊN HỆ', 'text', true)}{field('phone', 'SỐ ĐIỆN THOẠI', 'tel', true)}{field('receivedAt', 'THỜI ĐIỂM NHẬN THỰC TẾ', 'datetime-local', true)}{field('identification', 'DẤU HIỆU NHẬN DẠNG', 'textarea', selected?.thiet_bi_id == null)}{field('reason', 'LÝ DO / KẾT QUẢ XỬ LÝ', 'textarea', true)}{field('condition', 'TÌNH TRẠNG KHI NHẬN', 'textarea', true)}{!selected && field('verification', 'CĂN CỨ XÁC MINH', 'textarea', true)}{field('unit', 'ĐƠN VỊ DỰ KIẾN')}{field('note', 'GHI CHÚ', 'textarea')}</div><h3>PHỤ KIỆN</h3>{form.accessories.map((item, index) => <div className="w-intake-accessory" key={index}><input aria-label={`Tên phụ kiện ${index + 1}`} value={item.name} onChange={event => change('accessories', form.accessories.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} /><input aria-label={`Số lượng phụ kiện ${index + 1}`} type="number" min="1" step="1" value={item.quantity} onChange={event => change('accessories', form.accessories.map((value, i) => i === index ? { ...value, quantity: event.target.value } : value))} /><button type="button" className="w-shell-button" onClick={() => change('accessories', form.accessories.filter((_, i) => i !== index))}>XÓA</button></div>)}<button type="button" className="w-shell-button" onClick={() => change('accessories', [...form.accessories, { name: '', quantity: 1 }])}>+ THÊM PHỤ KIỆN</button><label className="w-intake-field">ẢNH TIẾP NHẬN<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={addPhotos} /></label>{uploading && <p role="status">Đang tải ảnh...</p>}<label className="w-intake-field">LIÊN KẾT ẢNH<input type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} /></label><button type="button" className="w-shell-button" onClick={addLink}>THÊM LIÊN KẾT</button><div className="w-intake-photos">{form.photos.map((photo, index) => <figure key={index}><img src={photo.url} alt={photo.name} /><figcaption>{photo.name}</figcaption><button type="button" className="w-shell-button" onClick={() => change('photos', form.photos.filter((_, i) => i !== index))}>BỎ KHỎI PHIẾU</button></figure>)}</div></WarrantyPanel>}
      {step === 3 && <WarrantyPanel title="04 / XÁC NHẬN TIẾP NHẬN">{selection}<WarrantyFields fields={ [['NGƯỜI LIÊN HỆ', `${form.contact} · ${form.phone}`], ['ĐIỀU KIỆN MIỄN PHÍ', eligibilityLabels[form.eligibility]], ['CĂN CỨ', form.verification], ['LÝ DO', form.reason], ['TÌNH TRẠNG', form.condition], ['THỜI ĐIỂM NHẬN', form.receivedAt], ['DẤU HIỆU NHẬN DẠNG', form.identification], ['YÊU CẦU TIẾP NHẬN', requestId]] } />{validation.length > 0 && <ul className="w-shell-error">{validation.map((text, index) => <li key={index}>{text}</li>)}</ul>}<button type="button" className="w-shell-button w-shell-button--red" disabled={uploading || validation.length > 0} onClick={() => prepare('ticket')}>XÁC NHẬN TIẾP NHẬN THỰC TẾ</button></WarrantyPanel>}
      <footer className="w-intake-footer"><button type="button" className="w-shell-button" disabled={!step || blocked} onClick={() => move(step - 1)}>QUAY LẠI</button><div className="w-shell-actions"><button type="button" className="w-shell-button" disabled={blocked} onClick={() => { setOutcome('CHO_XAC_MINH'); setFieldErrors({}); setError(''); }}>LƯU CHỜ XÁC MINH</button><button type="button" className="w-shell-button" disabled={blocked} onClick={() => { setOutcome('TU_CHOI'); setFieldErrors({}); setError(''); }}>TỪ CHỐI TIẾP NHẬN</button>{step < 3 && <button type="button" className="w-shell-button w-shell-button--black" disabled={blocked || !selected} onClick={() => move(step + 1)}>TIẾP TỤC</button>}</div></footer>
      </fieldset>
    </div>
    {modal && <OrderModal className="warranty-modal" title={modal.action === 'ticket' ? 'XÁC NHẬN TIẾP NHẬN THỰC TẾ' : modal.action === 'TU_CHOI' ? 'TỪ CHỐI TIẾP NHẬN' : 'LƯU CHỜ XÁC MINH'} close={() => { if (!uncertain) setModal(null); }} submit={submit} busy={busy} error={error} disabled={!confirmed} confirmLabel={uncertain ? 'THỬ LẠI CÙNG YÊU CẦU' : 'XÁC NHẬN'}><p>{form.contact} · {form.phone}</p><p>{selected?.so_serial || selected?.ma_theo_doi || query}</p><p>{form.reason}</p><p>{modal.action === 'ticket' ? 'Tạo phiếu và ghi nhận cửa hàng thực giữ thiết bị. Tiếp nhận chưa đồng nghĩa khách chấp thuận phí.' : 'Lưu kết quả khi cửa hàng chưa giữ thiết bị; chưa tạo phiếu bảo hành.'}</p><label className="w-shell-modal-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi xác nhận thông tin và thao tác này.</label></OrderModal>}
  </div>;
}
