import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Plus, Upload, X } from 'lucide-react';
import OrderModal from '../../orders/components/OrderModal';
import IntakeDescriptionField from '../components/IntakeDescriptionField';
import { WarrantyFields, WarrantyPanel, WarrantyTable } from '../components/WarrantyShell';
import { lookupWarranties, mutateWarranty, warrantyError } from '../api/warrantyApi';
import {
  displayDate, intakeAssessment, intakeBody, intakeContact, intakeDeadlineCheck,
  intakeDeadlineStatus, intakeDescription, intakeErrors, intakeFreeChecks, intakeItemLimit,
  intakeReachableStep, intakeRequiredChecks, intakeSearch, intakeStepErrors,
  lookupFields, receiptNow,
} from '../data/warrantyContract';
import { uploadWarrantyIntakeImage } from '../../../media/api/imageUploadApi';
import { validateImageFiles } from '../../../media/api/imageValidation';
import { getSerialPage } from '../../inventory/api/serialApi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { customerService } from '../../../../shared/services/customerService';
import '../styles/warrantyShell.css';

const steps = ['TÌM THIẾT BỊ', 'XÁC MINH BẢO HÀNH', 'THÔNG TIN TIẾP NHẬN', 'XÁC NHẬN'];
const initialForm = () => ({
  checks: [], reason: [], condition: [], reasonOther: [], conditionOther: [], contact: '', phone: '',
  receivedAt: receiptNow(), identification: '', unit: '', note: '', accessories: [], photos: [],
});
const conclusions = {
  CHUA_XAC_MINH: 'Chưa đủ mục xác minh',
  KHONG_DU_DIEU_KIEN: 'Tiếp nhận có phí',
  DU_DIEU_KIEN: 'Đủ điều kiện miễn phí',
};
const deadlineLabels = { active: 'Còn hạn', expired: 'Hết hạn', unknown: 'Chưa có hạn xác minh' };

function IntakeDeadline({ device, receivedAt }) {
  const status = intakeDeadlineStatus(device, receivedAt);
  return (
    <span className="w-intake-deadline" data-status={status}>
      <strong>{deadlineLabels[status]}</strong>
      {Number.isFinite(Date.parse(device?.han_bao_hanh)) && <time dateTime={device.han_bao_hanh}>{displayDate(device.han_bao_hanh)}</time>}
    </span>
  );
}

export default function LapPhieuBaoHanh() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0), [query, setQuery] = useState('');
  const { criterion } = intakeSearch(query);
  const [lookup, setLookup] = useState(null), [page, setPage] = useState(1), [selected, setSelected] = useState(null), [requestId, setRequestId] = useState(null);
  const [form, setForm] = useState(initialForm), [error, setError] = useState(''), [message, setMessage] = useState(null);
  const [contactError, setContactError] = useState(false);
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [searching, setSearching] = useState(false), [modal, setModal] = useState(null), [confirmed, setConfirmed] = useState(false), [imageUrl, setImageUrl] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({}), [outcome, setOutcome] = useState(null);
  const lookupController = useRef(null), lookupTimer = useRef(null), mutation = useRef(null), saving = useRef(false);
  const focusNewAccessory = useRef(false);
  useEffect(() => () => lookupController.current?.abort(), []);
  const focusAccessory = useCallback(input => {
    if (!input || !focusNewAccessory.current) return;
    focusNewAccessory.current = false;
    input.focus();
  }, []);
  const change = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [key.replace(/Other$/, '')]: '' }));
    setError('');
  };
  const toggle = (key, label) =>
    change(key, form[key].includes(label) ? form[key].filter(value => value !== label) : [...form[key], label]);
  const photoLimitReached = form.photos.length >= intakeItemLimit;
  const accessoryLimitReached = form.accessories.length >= intakeItemLimit;
  const addAccessory = () => {
    if (accessoryLimitReached) return;
    focusNewAccessory.current = true;
    change('accessories', [...form.accessories, { name: '', quantity: 1 }]);
  };
  const blocked = busy || uncertain || uploading || searching;
  const move = (index) => {
    if (blocked) return;
    setOutcome(null);
    setError('');
    setFieldErrors({});
    if (index > step)
      for (let current = 0; current < index; current++) {
        const errors = intakeStepErrors(selected, form, current);
        if (Object.keys(errors).length) {
          setFieldErrors(errors);
          setError('Kiểm tra thông tin tại bước này trước khi tiếp tục.');
          setStep(current);
          return;
        }
      }
    setStep(index);
  };
  const resetSearch = value => { lookupController.current?.abort(); setQuery(value); setLookup(null); setSelected(null); setRequestId(null); setPage(1); setSearching(false); setError(''); setMessage(null); setFieldErrors({}); setOutcome(null); };
  const search = useCallback(async (nextPage = 1) => {
    clearTimeout(lookupTimer.current);
    if (!query.trim()) { setError('Nhập nội dung tra cứu.'); return; }
    const { criterion, value } = intakeSearch(query);
    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    setSearching(true);
    setError('');
    setSelected(null);
    setRequestId(null);
    setLookup(null);
    setPage(nextPage);
    try {
      let result;
      if (criterion === 'serial') {
        const data = await getSerialPage(
  {
    keyword: value,
    page: nextPage,
    limit: 20,
    forWarranty: true,
  },
  controller.signal
);
        result = { items: data.items.map(item => ({ serial_candidate: true, so_serial: item.serial, phien_ban_id: item.versionId, ten_san_pham: item.productName, ten_phien_ban: item.version, trang_thai_serial: item.status })), yeu_cau_tiep_nhan: [], pagination: { total_elements: data.totalItems } };
      } else result = await lookupWarranties({ [lookupFields[criterion]]: value, page: nextPage - 1, limit: 20 }, controller.signal);
      if (!controller.signal.aborted) setLookup(result);
    } catch (cause) { if (!controller.signal.aborted) setError(warrantyError(cause)); }
    finally { if (!controller.signal.aborted) setSearching(false); }
  }, [query]);
  useEffect(() => {
    if (!query.trim()) return undefined;
    lookupTimer.current = setTimeout(() => search(), 400);
    return () => clearTimeout(lookupTimer.current);
  }, [query, search]);
  const choose = async (device, request = null) => {
    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    setSearching(true); setError(''); setContactError(false);
    try {
      if (device?.serial_candidate) {
        const result = await lookupWarranties({ so_serial: device.so_serial, page: 0, limit: 20 }, controller.signal);
        if (controller.signal.aborted) return;
        if (result.items.length !== 1) {
          setLookup(result); setSelected(null); setPage(1);
          setMessage({ text: 'Chọn đúng giao dịch gốc trong kết quả xác minh serial.' });
          return;
        }
        device = { ...result.items[0], ten_san_pham: device.ten_san_pham, ten_phien_ban: device.ten_phien_ban };
      }
      let contact = intakeContact(request);
      if (device?.khach_hang_id != null && (!contact.contact || !contact.phone)) {
        try {
          const { data } = await customerService.getCustomerDetail(device.khach_hang_id, controller.signal);
          contact = intakeContact(request, data?.data);
        } catch {
          if (!controller.signal.aborted) setContactError(true);
        }
      }
      if (controller.signal.aborted) return;
      setSelected(device); setRequestId(request?.id || null); setFieldErrors({}); setStep(0); setOutcome(null);
      setMessage(request ? { text: `Đang xử lý yêu cầu #${request.id}.` } : null);
      setForm({
        ...initialForm(), ...contact,
        ...(request?.ly_do?.trim() && { reasonOther: [request.ly_do.trim()] }),
      });
    } catch (cause) {
      if (!controller.signal.aborted) setError(warrantyError(cause));
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };
  const restore = (request) => {
    const device = lookup.items.find((item) =>
      request.thiet_bi_id != null
        ? item.thiet_bi_id === request.thiet_bi_id
        : request.so_serial &&
          item.so_serial === request.so_serial &&
          (!request.don_hang_id || item.don_hang_id === request.don_hang_id)
    );
    choose(device || null, request);
  };
  const prepare = (action) => {
    setError('');
    setConfirmed(false);
    if (action === 'ticket') {
      if (intakeReachableStep(selected, form) < 3) {
        move(3);
        return;
      }
      const errors = intakeErrors(selected, form);
      if (errors.length) {
        setError(errors.join('\n'));
        return;
      }
      setModal({ action, body: intakeBody(selected, form, requestId) });
    } else {
      const { contact, phone, reason } = intakeStepErrors(selected, form, 2);

      const errors = Object.fromEntries(
        Object.entries({ contact, phone, reason }).filter(([, value]) => value)
      );

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setError('Nhập đủ thông tin kết quả chưa tiếp nhận.');
        return;
      }

      setModal({
        action,
        body: {
          yeu_cau_tiep_nhan_id: requestId,
          don_hang_id: selected?.don_hang_id ?? null,
          chi_tiet_don_hang_id: selected?.chi_tiet_don_hang_id ?? null,
          thiet_bi_id: selected?.thiet_bi_id ?? null,
          so_serial:
            selected?.so_serial ||
            (criterion === 'serial' ? query.trim() || null : null),
          ten_nguoi_lien_he: form.contact.trim(),
          sdt_nguoi_lien_he: form.phone.trim(),
          ket_qua_tiep_nhan: action,
          ly_do: intakeDescription(form, 'reason'),
          can_cu: intakeAssessment(selected, form).verification,
          bang_chung_urls: form.photos.map((item) => item.url),
        },
      });
    }
  };
  const submit = async () => {
    if (saving.current || !confirmed) return;
    const serialized = JSON.stringify(modal);
    if (mutation.current?.serialized !== serialized)
      mutation.current = { serialized, key: crypto.randomUUID() };
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await mutateWarranty(
        null,
        modal.action === 'ticket' ? '' : 'intake-results',
        modal.body,
        mutation.current.key
      );
      mutation.current = null;
      setUncertain(false);
      if (modal.action === 'ticket') navigate(`/admin/bao-hanh/chi-tiet/${result.id}`);
      else {
        setRequestId(result.yeu_cau_tiep_nhan_id); setModal(null); setOutcome(null);
        setMessage({ success: true, text: `Đã lưu yêu cầu #${result.yeu_cau_tiep_nhan_id} · ${result.ket_qua_tiep_nhan === 'TU_CHOI' ? 'Từ chối tiếp nhận' : 'Chờ xác minh'}` });
      }
    } catch (cause) { const unknown = !cause.status || cause.status >= 500; setUncertain(unknown); setError(`${warrantyError(cause)}${unknown ? '\nChưa xác định kết quả lưu. Thử lại dùng nguyên yêu cầu và khóa chống trùng.' : ''}`); }
    finally { saving.current = false; setBusy(false); }
  };
  const addPhotos = async event => {
    const files = [...event.target.files]; event.target.value = '';
    if (uploading || files.length === 0) return;
    try {
      if (files.length + form.photos.length > intakeItemLimit) throw new Error(`Chỉ có thể thêm ${intakeItemLimit - form.photos.length} ảnh nữa.`);
      validateImageFiles(files);
    } catch (cause) {
      setFieldErrors(current => ({ ...current, photos: cause.message }));
      return;
    }
    setUploading(true); setError('');
    setFieldErrors(current => ({ ...current, photos: '' }));
    try {
      // Lưu từng ảnh thành công ngay để một ảnh lỗi không làm mất URL của ảnh đã tải.
      for (const file of files) { const result = await uploadWarrantyIntakeImage(file); setForm(current => ({ ...current, photos: [...current.photos, { name: file.name, url: result.url }] })); }
    } catch (cause) { setFieldErrors(current => ({ ...current, photos: warrantyError(cause) })); }
    finally { setUploading(false); }
  };
  const addLink = () => {
    if (photoLimitReached || uploading) return;
    try { const url = new URL(imageUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); change('photos', [...form.photos, { name: 'Ảnh liên kết', url: url.href }]); setImageUrl(''); }
    catch { setFieldErrors(current => ({ ...current, photos: 'Nhập liên kết ảnh HTTP hoặc HTTPS hợp lệ.' })); }
  };
  const field = (name, label, type = 'text', required = false) => (
    <label className="w-intake-field">
      {label}{required && ' *'}
      {type === 'textarea' ? (
        <textarea aria-invalid={Boolean(fieldErrors[name])} value={form[name]} onChange={event => change(name, event.target.value)} />
      ) : (
        <input
          aria-invalid={Boolean(fieldErrors[name])}
          type={type}
          step={type === 'datetime-local' ? '0.001' : undefined}
          value={form[name]}
          max={type === 'datetime-local' ? receiptNow() : undefined}
          onChange={event => change(name, event.target.value)}
        />
      )}
      {fieldErrors[name] && <small className="w-shell-error">{fieldErrors[name]}</small>}
    </label>
  );
  const description = (key, title) => (
    <IntakeDescriptionField
      field={key}
      title={title}
      selected={form[key]}
      custom={form[`${key}Other`]}
      error={fieldErrors[key]}
      onChange={(choices, entries) => {
        change(key, choices);
        change(`${key}Other`, entries);
      }}
    />
  );
  const assessment = intakeAssessment(selected, form);
  const checks = (title, options) => (
    <fieldset className="w-intake-options">
      <legend>{title}</legend>
      <div className="w-intake-check-grid">
        {options.map(label => {
          const disabled = label === intakeDeadlineCheck && !assessment.canConfirmDeadline;
          return (
            <label key={label}>
              <input type="checkbox" disabled={disabled} checked={!disabled && form.checks.includes(label)} onChange={() => toggle('checks', label)} />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
  const selection = selected && (
    <div className="w-intake-selected">
      <div>
        <small>THIẾT BỊ / DÒNG HÀNG ĐÃ CHỌN</small>
        <strong>{selected.ten_phien_ban || selected.ten_san_pham || 'Phiên bản #' + selected.phien_ban_id}</strong>
        <div className="w-intake-device-codes">
          <strong>{selected.so_serial || selected.ma_theo_doi || 'Dòng mua #' + selected.chi_tiet_don_hang_id + ' · Không serial'}</strong>
          {selected.ma_don_hang && <strong>{selected.ma_don_hang}</strong>}
        </div>
      </div>
      <div className="w-intake-expiry">
        <small>HẠN BẢO HÀNH</small>
        <IntakeDeadline device={selected} receivedAt={form.receivedAt} />
      </div>
      <button type="button" className="w-shell-button" disabled={searching} onClick={() => {
        setStep(0); setSelected(null); setRequestId(null); setForm(initialForm()); setFieldErrors({});
        setOutcome(null); setMessage(null); setContactError(false);
      }}>ĐỔI THIẾT BỊ</button>
    </div>
  );
  const reachableStep = intakeReachableStep(selected, form);
  const validation = intakeErrors(selected, form);
  const conclusion = (
    <strong className="w-intake-conclusion" data-result={assessment.eligibility}>
      {conclusions[assessment.eligibility]}
    </strong>
  );

  return (
    <div className={'w-shell w-intake' + (step === 2 ? ' w-intake--reception' : '')}>
      <header className="w-shell-hero">
        <div>
          <p className="w-shell-breadcrumb">BẢO HÀNH / TIẾP NHẬN MỚI</p>
          <div className="w-shell-title-row"><h1>LẬP PHIẾU BẢO HÀNH</h1></div>
        </div>
        <button type="button" className="w-shell-button" disabled={blocked} onClick={() => navigate('/admin/bao-hanh/danh-sach')}>
          <ArrowLeft size={15} /> Danh sách phiếu
        </button>
      </header>
      <div className="w-shell-content w-intake-content">
        <nav className="w-intake-steps" aria-label="Các bước lập phiếu bảo hành">
          {steps.map((label, index) => (
            <button type="button" key={label} disabled={blocked || index > reachableStep} aria-current={step === index ? 'step' : undefined} onClick={() => move(index)}>
              <small>{index < step ? <Check size={16} /> : index + 1}</small>
              {label.charAt(0) + label.slice(1).toLocaleLowerCase('vi')}
            </button>
          ))}
        </nav>
        {message && <p className={'w-intake-message' + (message.success ? '' : ' w-intake-message--neutral')} role="status">{message.text}</p>}
        {!modal && error && <p className="w-shell-error" role="alert">{error}</p>}
        {step !== 1 && fieldErrors.device && <p className="w-shell-error" role="alert">{fieldErrors.device}</p>}
        {outcome && (
          <WarrantyPanel title={outcome === 'TU_CHOI' ? 'GHI KẾT QUẢ TỪ CHỐI TIẾP NHẬN' : 'GHI KẾT QUẢ CHỜ XÁC MINH'}>
            <fieldset className="w-action-fields" disabled={blocked}>
              <div className="w-shell-fields">
                {field('contact', 'TÊN NGƯỜI LIÊN HỆ', 'text', true)}
                {field('phone', 'SỐ ĐIỆN THOẠI', 'tel', true)}
              </div>
              {description('reason', 'Lý do bảo hành')}
              <button type="button" className="w-shell-button" onClick={() => prepare(outcome)}>KIỂM TRA KẾT QUẢ</button>
              <button type="button" className="w-shell-button" onClick={() => { setOutcome(null); setError(''); setFieldErrors({}); }}>ĐÓNG</button>
            </fieldset>
          </WarrantyPanel>
        )}
        <fieldset className="w-action-fields" disabled={busy || uncertain || uploading}>
          {step === 0 && (
            <WarrantyPanel title="01 / TÌM THIẾT BỊ CẦN BẢO HÀNH">
              <form className="w-intake-search" onSubmit={event => { event.preventDefault(); search(); }}>
                <input aria-label="Nội dung tra cứu thiết bị" value={query} onChange={event => resetSearch(event.target.value)} maxLength={100} placeholder="Serial, tên sản phẩm, mã đơn, mã theo dõi, SĐT hoặc #ID yêu cầu..." />
                <button className="w-shell-button w-shell-button--black" disabled={searching || !query.trim()}>TÌM</button>
                <button type="button" className="w-shell-button" onClick={() => resetSearch('')}>XÓA</button>
              </form>
              {searching && <p role="status">Đang tải dữ liệu...</p>}
              {lookup && (
                <>
                  <WarrantyTable
                    columns={['ĐƠN HÀNG', 'THIẾT BỊ / PHIÊN BẢN', 'GIAO DỊCH', 'HẠN BẢO HÀNH', 'CHỌN']}
                    rows={lookup.items.map((item, index) => [
                      <strong key={'order-' + index}>{item.ma_don_hang || 'Chờ xác minh'}</strong>,
                      <span key={'device-' + index}>
                        <strong>{item.ten_phien_ban || item.ten_san_pham || 'Phiên bản #' + item.phien_ban_id}</strong>
                        <br /><strong>{item.so_serial || item.ma_theo_doi || 'Không serial'}</strong>
                      </span>,
                      <strong key={'status-' + index}>
                        {item.serial_candidate ? 'Chờ xác minh' : item.da_giao_khach ? 'Đã giao khách' : 'Chưa xác minh đã giao'}
                      </strong>,
                      <IntakeDeadline key={'expiry-' + index} device={item} receivedAt={form.receivedAt} />,
                      <button type="button" key={'choose-' + index} className="w-shell-button" disabled={searching} onClick={() => choose(item, lookup.yeu_cau_tiep_nhan?.find(request => request.id === requestId) || (criterion === 'requestId' ? lookup.yeu_cau_tiep_nhan?.[0] : null))}>
                        {item.serial_candidate ? 'XÁC MINH SERIAL' : item.co_the_tiep_nhan ? 'CHỌN THIẾT BỊ' : 'XEM THIẾT BỊ'}
                      </button>,
                    ])}
                    empty="Không tìm thấy giao dịch / thiết bị phù hợp."
                  />
                  <TablePagination totalItems={lookup.pagination.total_elements} pageSize={20} currentPage={page} onPageChange={search} idPrefix="warranty-intake" />
                  {lookup.yeu_cau_tiep_nhan?.length > 0 && (
                    <details>
                      <summary>YÊU CẦU TIẾP NHẬN ĐÃ LƯU</summary>
                      {lookup.yeu_cau_tiep_nhan.map(request => (
                        <p key={request.id}>
                          <button type="button" className="w-shell-button" disabled={searching} onClick={() => restore(request)}>
                            #{request.id} · {request.ten_nguoi_lien_he} · {request.ket_qua_tiep_nhan === 'TU_CHOI' ? 'Từ chối' : 'Chờ xác minh'}
                          </button>
                        </p>
                      ))}
                    </details>
                  )}
                </>
              )}
              {selection}
            </WarrantyPanel>
          )}
          {step === 1 && (
            <WarrantyPanel title="02 / XÁC MINH ĐIỀU KIỆN">
              {selection}
              {checks('5 MỤC XÁC MINH BẮT BUỘC', intakeRequiredChecks)}
              {checks('5 MỤC BỔ SUNG ĐỂ MIỄN PHÍ', intakeFreeChecks)}
              {fieldErrors.checks && <p className="w-shell-error" role="alert">{fieldErrors.checks}</p>}
              {fieldErrors.device ? (
                <p className="w-shell-error" role="alert">{fieldErrors.device}</p>
              ) : selected?.ly_do_chan?.map(reason => <p className="w-shell-error" key={reason.code}>{reason.message}</p>)}
              <div className="w-intake-result" role="status">
                <strong>{assessment.total}/10 mục đã xác nhận</strong>
                {conclusion}
              </div>
            </WarrantyPanel>
          )}
          {step === 2 && (
            <WarrantyPanel title="03 / THÔNG TIN TIẾP NHẬN" className="w-intake-reception">
              {selection}
              {contactError && <p className="w-shell-error" role="alert">Không tải được hồ sơ khách hàng. Nhập tên và số điện thoại để tiếp tục.</p>}
              <div className="w-intake-reception-fields">
                {field('contact', 'TÊN NGƯỜI LIÊN HỆ', 'text', true)}
                {field('phone', 'SỐ ĐIỆN THOẠI', 'tel', true)}
                {field('receivedAt', 'THỜI ĐIỂM NHẬN THỰC TẾ', 'datetime-local', true)}
                {field('unit', 'ĐƠN VỊ BẢO HÀNH DỰ KIẾN')}
                {field('identification', 'DẤU HIỆU NHẬN DẠNG', 'textarea', selected?.thiet_bi_id == null)}
                {field('note', 'GHI CHÚ', 'textarea')}
              </div>
              <div className="w-intake-reception-pair">
                {description('reason', 'Lý do bảo hành')}
                {description('condition', 'Tình trạng khi nhận')}
              </div>
              <div className="w-intake-reception-pair w-intake-evidence">
                <section className="w-intake-evidence-card" aria-labelledby="intake-accessory-title">
                  <header className="w-intake-evidence-heading">
                    <h3 id="intake-accessory-title">PHỤ KIỆN</h3>
                    <span className="w-intake-evidence-count" role="status">{form.accessories.length}/{intakeItemLimit}</span>
                    <button type="button" className="w-shell-button" disabled={accessoryLimitReached} onClick={addAccessory}>
                      <Plus size={14} aria-hidden="true" /> THÊM PHỤ KIỆN
                    </button>
                  </header>
                  {form.accessories.length > 0 ? (
                    <div className="w-intake-evidence-list w-intake-accessories" role="region" aria-label="Danh sách phụ kiện" tabIndex={0}>
                      {form.accessories.map((item, index) => (
                        <div className="w-intake-accessory" key={index}>
                          <input ref={index === form.accessories.length - 1 ? focusAccessory : undefined} aria-label={'Tên phụ kiện ' + (index + 1)} placeholder="Tên phụ kiện" value={item.name} onChange={event => change('accessories', form.accessories.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} />
                          <input aria-label={'Số lượng phụ kiện ' + (index + 1)} type="number" min="1" step="1" value={item.quantity} onChange={event => change('accessories', form.accessories.map((value, i) => i === index ? { ...value, quantity: event.target.value } : value))} />
                          <button type="button" className="w-shell-button w-intake-remove" aria-label={'Xóa phụ kiện ' + (index + 1)} onClick={() => change('accessories', form.accessories.filter((_, i) => i !== index))}>
                            <X size={15} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="w-intake-evidence-empty">Chưa có phụ kiện.</p>}
                  {fieldErrors.accessories && <p className="w-shell-error" role="alert">{fieldErrors.accessories}</p>}
                </section>
                <section className="w-intake-evidence-card" aria-labelledby="intake-photo-title">
                  <header className="w-intake-evidence-heading">
                    <h3 id="intake-photo-title">ẢNH TIẾP NHẬN</h3>
                    <span className="w-intake-evidence-count" role="status">{form.photos.length}/{intakeItemLimit}</span>
                    <label className="w-shell-button w-intake-upload">
                      <Upload size={14} aria-hidden="true" /> TẢI ẢNH
                      <input aria-label="Tải ảnh tiếp nhận" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || photoLimitReached} onChange={addPhotos} />
                    </label>
                  </header>
                  <div className="w-intake-photo-link">
                    <label className="w-intake-field"><input aria-label="Liên kết ảnh" placeholder="Dán liên kết ảnh" type="url" disabled={photoLimitReached} value={imageUrl} onChange={event => setImageUrl(event.target.value)} /></label>
                    <button type="button" className="w-shell-button" disabled={photoLimitReached || !imageUrl.trim()} onClick={addLink}>THÊM LIÊN KẾT</button>
                  </div>
                  {uploading && <p className="w-intake-evidence-empty" role="status">Đang tải ảnh...</p>}
                  {fieldErrors.photos && <p className="w-shell-error" role="alert">{fieldErrors.photos}</p>}
                  {form.photos.length > 0 ? (
                    <div className="w-intake-evidence-list w-intake-photo-grid" role="region" aria-label="Ảnh đã thêm" tabIndex={0}>
                      {form.photos.map((photo, index) => (
                        <figure className="w-intake-photo" key={index}>
                          <img src={photo.url} alt={photo.name} />
                          <figcaption title={photo.name}>{photo.name}</figcaption>
                          <button type="button" className="w-shell-button w-intake-remove" aria-label={'Bỏ ảnh ' + (index + 1) + ': ' + photo.name} onClick={() => change('photos', form.photos.filter((_, i) => i !== index))}>
                            <X size={14} aria-hidden="true" />
                          </button>
                        </figure>
                      ))}
                    </div>
                  ) : !uploading && <p className="w-intake-evidence-empty">Chưa có ảnh.</p>}
                </section>
              </div>
            </WarrantyPanel>
          )}
          {step === 3 && (
            <WarrantyPanel title="04 / XÁC NHẬN TIẾP NHẬN">
              {selection}
              <WarrantyFields fields={[
                ['NGƯỜI LIÊN HỆ', form.contact + ' · ' + form.phone],
                ['KẾT LUẬN', conclusion],
                ['XÁC MINH', assessment.total + '/10 mục đã xác nhận'],
                ['LÝ DO', intakeDescription(form, 'reason')],
                ['TÌNH TRẠNG', intakeDescription(form, 'condition')],
                ['THỜI ĐIỂM NHẬN', form.receivedAt],
                ['DẤU HIỆU NHẬN DẠNG', form.identification],
                ['YÊU CẦU TIẾP NHẬN', requestId],
              ]} />
              {validation.length > 0 && <ul className="w-shell-error">{validation.map((error, index) => <li key={index}>{error}</li>)}</ul>}
              <button type="button" className="w-shell-button w-shell-button--red" disabled={uploading || validation.length > 0} onClick={() => prepare('ticket')}>XÁC NHẬN TIẾP NHẬN THỰC TẾ</button>
            </WarrantyPanel>
          )}
          <footer className="w-intake-footer">
            <button type="button" className="w-shell-button" disabled={!step || blocked} onClick={() => move(step - 1)}>QUAY LẠI</button>
            <div className="w-shell-actions">
              <button type="button" className="w-shell-button" disabled={blocked} onClick={() => { setOutcome('CHO_XAC_MINH'); setFieldErrors({}); setError(''); }}>LƯU CHỜ XÁC MINH</button>
              <button type="button" className="w-shell-button" disabled={blocked} onClick={() => { setOutcome('TU_CHOI'); setFieldErrors({}); setError(''); }}>TỪ CHỐI TIẾP NHẬN</button>
              {step < 3 && <button type="button" className="w-shell-button w-shell-button--black" disabled={blocked || !selected} onClick={() => move(step + 1)}>TIẾP TỤC</button>}
            </div>
          </footer>
        </fieldset>
      </div>
      {modal && (
        <OrderModal className="warranty-modal" title={modal.action === 'ticket' ? 'XÁC NHẬN TIẾP NHẬN THỰC TẾ' : modal.action === 'TU_CHOI' ? 'TỪ CHỐI TIẾP NHẬN' : 'LƯU CHỜ XÁC MINH'} close={() => { if (!uncertain) setModal(null); }} submit={submit} busy={busy} error={error} disabled={!confirmed} confirmLabel={uncertain ? 'THỬ LẠI CÙNG YÊU CẦU' : 'XÁC NHẬN'}>
          <p><strong>{form.contact} · {form.phone}</strong></p>
          <p>{selected?.so_serial || selected?.ma_theo_doi || query}</p>
          <p>{intakeDescription(form, 'reason')}</p>
          {modal.action === 'ticket' && conclusion}
          <label className="w-shell-modal-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi xác nhận thông tin và thao tác này.</label>
        </OrderModal>
      )}
    </div>
  );
}
