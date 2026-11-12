import { useEffect, useRef, useState } from 'react';
import { SquareCheck as CheckCircle2, MessageSquareText as Info } from 'lucide-react';
import { getWarrantyHistory, mutateWarranty, warrantyError } from '../api/warrantyApi';
import {
  actionBody,
  arrayFields,
  fieldLabels,
  fieldOptions,
  fieldType,
  initialActionValues,
} from '../data/warrantyActions';
import {
  actionHints,
  fieldHelp,
  freeWorkItems,
  referenceOptions,
  validateFreeWork,
  discrepancyLabels,
  pendingWarrantyDifferences,
  warrantyDeviceLabel,
} from '../data/warrantyExperience';
import { getSupplierOptions } from '../../purchasing/api/purchaseOrderApi';
import { getAllVersions } from '../../catalog/products/api/versionApi';
import { displayValue } from './WarrantySnapshot';
import { WarrantyFields, WarrantyDialog } from './WarrantyShell';
import { FormDropdown } from '../../../../shared/components/ui/FilterDropdown';
import { displayDate } from '../data/warrantyContract';

function InputField({
  field,
  value,
  change,
  operation,
  detail,
  suppliers,
  versions,
  conclusionId,
  returningId,
  prefix = '',
}) {
  const name = field.replace(/\?$/, ''),
    type = fieldType(name),
    optional = field.endsWith('?');
  const label = fieldLabels[name] || (arrayFields[name] ? 'Hạng mục' : name);

  if (name === 'sai_lech_da_xu_ly') {
    const choices = pendingWarrantyDifferences(detail, returningId);
    if (!choices.length) return null;
    const selected = Array.isArray(value) ? value : [];

    return (
      <fieldset className="w-action-rows w-discrepancy-choices">
        <legend>Sai lệch cần đối chiếu</legend>
        <p className="w-shell-note">Chỉ tích những sai lệch đã xử lý thực tế.</p>
        {choices.map((item) => (
          <label className="w-shell-modal-confirm" key={item.id}>
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={(event) =>
                change(
                  event.target.checked
                    ? [...selected, item.id]
                    : selected.filter((id) => id !== item.id)
                )
              }
            />
            <span>
              <strong>{discrepancyLabels[item.loai] || item.loai}</strong> · {item.noi_dung}
              <small>
                Mã sai lệch {item.id} · {displayDate(item.event.ngay)}
              </small>
            </span>
          </label>
        ))}
      </fieldset>
    );
  }

  if (name === 'thiet_bi_id' && ['GUI_DON_VI', 'NHAN_LAI'].includes(operation.key)) {
    return (
      <div className="w-intake-field">
        <span>{operation.key === 'NHAN_LAI' ? 'Thiết bị theo lần gửi' : 'Thiết bị gửi đi'}</span>
        <strong>{warrantyDeviceLabel(detail, value)}</strong>
      </div>
    );
  }

  if (name === 'ma_hang_muc' && operation.key === 'BAT_DAU_MIEN_PHI') {
    const items = freeWorkItems(detail, conclusionId),
      selected = String(value || '')
        .split('\n')
        .filter(Boolean);
    return (
      <fieldset className="w-action-rows">
        <legend>Hạng mục miễn phí *</legend>
        {!items.length && (
          <p className="w-shell-note">
            Chọn kết luận có hạng mục đủ điều kiện miễn phí hoặc cửa hàng chịu phí, kèm căn cứ.
          </p>
        )}
        {items.map((item) => (
          <label className="w-shell-modal-confirm" key={item.ma_hang_muc}>
            <input
              type="checkbox"
              checked={selected.includes(item.ma_hang_muc)}
              onChange={(event) =>
                change(
                  (event.target.checked
                    ? [...selected, item.ma_hang_muc]
                    : selected.filter((code) => code !== item.ma_hang_muc)
                  ).join('\n')
                )
              }
            />
            <span>
              <strong>{item.ma_hang_muc}</strong> · {item.loi || item.noi_dung_xu_ly || item.ly_do}{' '}
              — {item.ben_chiu_phi === 'CUA_HANG' ? 'Cửa hàng chịu phí' : 'Đủ điều kiện miễn phí'}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }
  if (type === 'rows')
    return (
      <fieldset className="w-action-rows">
        <legend>{label}</legend>
        {!(value || []).length && (
          <p className="w-shell-note">
            {['phu_kien', 'sai_lech'].includes(name)
              ? 'Nếu không có, bạn có thể để trống mục này.'
              : 'Thêm ít nhất một hạng mục để ghi rõ nội dung và chi phí.'}
          </p>
        )}
        {(value || []).map((row, index) => (
          <div className="w-shell-subsection" key={index}>
            <h3>
              {label} {index + 1}
            </h3>
            <div className="w-shell-fields">
              {arrayFields[name].map((child) => (
                <InputField
                  key={child}
                  field={child}
                  value={row[child.replace(/\?$/, '')] ?? ''}
                  operation={operation}
                  detail={detail}
                  suppliers={suppliers}
                  versions={versions}
                  change={(v) =>
                    change(
                      value.map((item, i) =>
                        i === index ? { ...item, [child.replace(/\?$/, '')]: v } : item
                      )
                    )
                  }
                />
              ))}
            </div>
            <button
              type="button"
              className="w-shell-button w-button-danger"
              onClick={() => change(value.filter((_, i) => i !== index))}
            >
              Xóa {label.toLowerCase()} {index + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="w-shell-button"
          onClick={() => change([...(value || []), {}])}
        >
          + Thêm {label.toLowerCase()}
        </button>
      </fieldset>
    );
  let options = fieldOptions[name];
  const references = referenceOptions(name, detail, suppliers, versions);
  if (references) options = Object.fromEntries(references.map((item) => [item.value, item.label]));
  if (
    name === 'ma_hang_muc' &&
    ['costItems', 'quoteItems'].includes(operation.arrayName) &&
    detail.ket_luan?.length
  )
    options = Object.fromEntries(
      detail.ket_luan
        .flatMap((item) => item.hang_muc || [])
        .map((item) => [
          item.ma_hang_muc,
          `${item.ma_hang_muc} · ${item.loi || item.noi_dung_xu_ly || item.ly_do || 'Hạng mục đã kết luận'}`,
        ])
    );
  if (name === 'hoa_don_bao_hanh_id')
    options = Object.fromEntries(
      [detail.hoa_don, ...(detail.hoa_don_da_huy || [])]
        .filter(Boolean)
        .map((item) => [
          item.id,
          `${item.ma_hoa_don} · ${item.trang_thai === 'HUY' ? 'Đã hủy' : 'Hiệu lực'}`,
        ])
    );
  if (name === 'phien_ban_bao_gia' || name === 'bao_gia_phien_ban')
    options = Object.fromEntries(
      (detail.bao_gia || []).map((item) => [item.phien_ban, `Phiên bản ${item.phien_ban}`])
    );
  const list =
    name.endsWith('_urls') ||
    name.endsWith('_ids') ||
    name === 'sai_lech_da_xu_ly' ||
    name === 'serials' ||
    operation.stringList?.includes(name);
  if (
    name === 'phien_ban_phuong_an' &&
    optional &&
    (!detail.phuong_an_doi?.thiet_bi_thay_the_id || detail.phuong_an_doi.da_huy === true)
  )
    return null;
  return (
    <label className={`w-intake-field ${type === 'checkbox' ? 'w-field-checkbox' : ''}`}>
      <span>
        {prefix}
        {label}
        {optional ? (
          <small className="w-field-optional"> Tùy chọn</small>
        ) : (
          type !== 'checkbox' && <em className="w-field-required"> *</em>
        )}
        {operation.stringList?.includes(name) && ' (mỗi dòng một mã)'}
      </span>
      {options ? (
        <select required={!optional} value={value} onChange={(event) => change(event.target.value)}>
          <option value="">Chọn {label.toLowerCase()}</option>
          {Object.entries(options).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <input
          type="checkbox"
          required={name === 'xac_nhan_khach'}
          checked={Boolean(value)}
          onChange={(event) => change(event.target.checked)}
        />
      ) : type === 'textarea' || list ? (
        <textarea
          value={value}
          rows={3}
          placeholder={name.endsWith('_urls') ? 'https://…' : `Nhập ${label.toLowerCase()}`}
          required={!optional}
          onChange={(event) => change(event.target.value)}
        />
      ) : (
        <input
          type={type === 'id' ? 'number' : type}
          min={type === 'id' ? '1' : type === 'number' ? '0' : undefined}
          step={
            type === 'datetime-local'
              ? '0.001'
              : type === 'id' || name.startsWith('so_luong')
                ? '1'
                : type === 'number'
                  ? '0.01'
                  : undefined
          }
          required={!optional}
          value={value}
          onChange={(event) => change(event.target.value)}
        />
      )}
      {fieldHelp[name] && <small className="w-field-help">{fieldHelp[name]}</small>}
      {references && !references.length && (
        <small className="w-field-help">
          {optional
            ? 'Chưa có bản ghi để chọn; có thể để trống nếu không dùng.'
            : 'Chưa có lựa chọn. Kiểm tra bước trước.'}
        </small>
      )}
    </label>
  );
}

export default function WarrantyActionForm({
  operation,
  detail: ticket,
  quoteVersion,
  values: draft,
  setValues,
  close,
  saved,
  onLockChange,
  disabled = false,
  blockReason = '',
}) {
  const [defaults] = useState(() => initialActionValues(operation, ticket, quoteVersion));
  const values = draft ?? defaults;
  const [confirm, setConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [body, setBody] = useState(null);
  const request = useRef(null);
  const submitting = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [historyItems, setHistoryItems] = useState(null);
  const detail = historyItems
    ? { ...ticket, lich_su: { ...ticket.lich_su, items: historyItems } }
    : ticket;

  const [suppliers, setSuppliers] = useState([]),
    [versions, setVersions] = useState([]),
    [referenceError, setReferenceError] = useState(''),
    [referencesLoading, setReferencesLoading] = useState(false),
    [referenceReload, setReferenceReload] = useState(0);

  const reviewRequired = !['BAT_DAU_KIEM_TRA', 'KIEM_TRA_TIEP', 'CAP_NHAT_TIEN_DO'].includes(
    operation.key
  );
  const reviewHeading = useRef(null);

  useEffect(() => {
    if (confirm) reviewHeading.current?.focus();
  }, [confirm]);

  useEffect(() => {
    onLockChange?.(busy || uncertain);
  }, [busy, uncertain, onLockChange]);
  useEffect(() => {
    const needsSupplier = operation.fields.includes('nha_cung_cap_id');
    const needsHistory = operation.key === 'HANDOVER';
    const needsVersions = operation.fields.some((field) =>
      ['phien_ban_id', 'phien_ban_thay_the_id', 'phien_ban_thuc_nhan_id'].includes(
        field.replace(/\?$/, '')
      )
    );
    if (!needsSupplier && !needsVersions && !needsHistory) return;
    const controller = new AbortController();
    setReferencesLoading(true);
    setReferenceError('');
    const jobs = [];
    if (needsHistory)
      jobs.push(
        getWarrantyHistory(ticket.id, controller.signal).then((items) => {
          if (!controller.signal.aborted) setHistoryItems(items);
        })
      );
    if (needsSupplier)
      jobs.push(
        getSupplierOptions(controller.signal).then((items) => {
          if (!controller.signal.aborted) setSuppliers(items);
        })
      );
    if (needsVersions)
      jobs.push(
        getAllVersions('', controller.signal, false).then((result) => {
          if (!controller.signal.aborted) setVersions(result.versions);
        })
      );
    Promise.allSettled(jobs).then((results) => {
      if (controller.signal.aborted) return;
      setReferenceError(
        results
          .filter((result) => result.status === 'rejected')
          .map((result) => warrantyError(result.reason))
          .join('\n')
      );
      setReferencesLoading(false);
    });
    return () => controller.abort();
  }, [operation.key, operation.fields, ticket.id, referenceReload]);

  const prepare = (event) => {
    event.preventDefault();

    if (disabled || submitting.current || uncertain || referencesLoading || referenceError) return;

    try {
      for (const raw of operation.fields) {
        const name = raw.replace(/\?$/, '');
        const choices = referenceOptions(name, detail, suppliers, versions);

        if (
          choices &&
          values[name] !== '' &&
          values[name] != null &&
          !choices.some((item) => String(item.value) === String(values[name]))
        ) {
          throw new Error(`Chọn ${fieldLabels[name]} hợp lệ trong danh sách.`);
        }
      }

      const prepared = actionBody(operation, values);

      if (
        operation.key === 'NHAN_LAI' &&
        values.doi_chieu_thiet_bi === 'DUNG' &&
        (prepared.so_serial_thuc_nhan || '') !== (detail.thiet_bi?.so_serial || '')
      ) {
        throw new Error('Serial thực nhận chưa khớp. Kiểm tra lại serial hoặc chọn Sai thiết bị.');
      }

      if (operation.key === 'SAN_SANG_TRA') {
        const pending = pendingWarrantyDifferences(detail, prepared.thiet_bi_se_tra_id);
        const ids = prepared.sai_lech_da_xu_ly.filter((id) =>
          pending.some((item) => item.id === id)
        );
        prepared.sai_lech_da_xu_ly = ids;
        if (pending.some((item) => !ids.includes(item.id)))
          throw new Error('Còn sai lệch chưa được xác nhận xử lý; chưa thể ghi Sẵn sàng trả.');
      }

      if (operation.key === 'BAT_DAU_MIEN_PHI') validateFreeWork(detail, prepared);

      const plan = detail.phuong_an_doi;
      if (
        operation.key === 'HANDOVER' &&
        plan?.thiet_bi_thay_the_id &&
        plan.da_huy !== true &&
        !prepared.phien_ban_phuong_an
      ) {
        throw new Error('Chọn phiên bản phương án đổi trước khi bàn giao hàng thay thế.');
      }

      if (!reviewRequired) {
        submit(prepared);
        return;
      }

      setBody(prepared);
      setError('');
      setConfirmed(false);
      setConfirm(true);
    } catch (cause) {
      setError(cause.message);
    }
  };

  const submit = async (payload) => {
    if (!payload || submitting.current || (disabled && !uncertain)) return;

    const endpoint =
      operation.endpoint === 'quote-events' ? `quotes/${quoteVersion}/events` : operation.endpoint;
    const serialized = JSON.stringify({ endpoint, body: payload });
    if (request.current?.serialized !== serialized)
      request.current = { serialized, key: crypto.randomUUID(), payload };

    submitting.current = true;
    onLockChange?.(true);
    setBusy(true);
    setError('');

    try {
      const result = await mutateWarranty(
        detail.id,
        endpoint,
        payload,
        request.current.key,
        operation.method
      );
      request.current = null;
      setUncertain(false);
      setConfirm(false);
      saved(result);
    } catch (cause) {
      const unknown = !cause.status || cause.status >= 500;
      setUncertain(unknown);
      setError(
        `${warrantyError(cause)}${
          unknown
            ? '\nChưa xác định kết quả lưu. Thử lại sẽ giữ nguyên yêu cầu và khóa chống trùng; hãy đối chiếu dữ liệu trước khi tạo giao dịch khác.'
            : ''
        }`
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <WarrantyDialog
      title={operation.label}
      subtitle={
        operation.endpoint === 'quote-events' && quoteVersion != null
          ? `Báo giá phiên bản ${quoteVersion}`
          : undefined
      }
      blocked={busy || uncertain}
      onClose={close}
      closeLabel="Đóng, giữ bản nháp"
    >
      <section className="w-action-form">
        {blockReason && (
          <p className="w-shell-error" role="status">
            {blockReason}
          </p>
        )}
        <p className="w-form-guide">
          <Info size={18} />
          {actionHints[operation.key] || 'Điền các mục có dấu *.'}
        </p>
        {referencesLoading && <p role="status">Đang tải danh sách lựa chọn…</p>}
        {referenceError && (
          <div className="w-shell-error" role="alert">
            Không tải được danh sách: {referenceError}{' '}
            <button
              type="button"
              className="w-shell-button"
              onClick={() => setReferenceReload((value) => value + 1)}
            >
              Thử lại
            </button>
          </div>
        )}
        <form onSubmit={prepare} hidden={confirm}>
          <fieldset
            disabled={disabled || busy || uncertain || referencesLoading}
            className="w-action-fields"
          >
            <div className="w-shell-fields">
              {operation.fields.map((field) => (
                <InputField
                  key={field}
                  field={field}
                  value={values[field.replace(/\?$/, '')] ?? ''}
                  operation={operation}
                  detail={detail}
                  suppliers={suppliers}
                  versions={versions}
                  conclusionId={values.ket_luan_lich_su_id}
                  returningId={values.thiet_bi_se_tra_id}
                  change={(value) => {
                    setValues({
                      ...values,
                      [field.replace(/\?$/, '')]: value,
                      ...(field === 'ket_luan_lich_su_id' && operation.key === 'BAT_DAU_MIEN_PHI'
                        ? { ma_hang_muc: '' }
                        : {}),
                      ...(field === 'nha_cung_cap_id' && operation.fields.includes('ten_don_vi')
                        ? {
                            ten_don_vi:
                              suppliers.find((item) => String(item.id) === String(value))?.name ||
                              '',
                          }
                        : {}),
                    });
                    setError('');
                  }}
                />
              ))}
            </div>
          </fieldset>
          {!confirm && error && (
            <p className="w-shell-error" role="alert">
              {error}
            </p>
          )}
          <div className="w-form-footer">
            <span>Kiểm tra trước khi lưu.</span>
            {uncertain ? (
              <button
                type="button"
                className="w-shell-button w-shell-button--black"
                disabled={busy}
                onClick={() => submit(request.current?.payload)}
              >
                Thử lại cùng yêu cầu
              </button>
            ) : (
              <button
                type="submit"
                className="w-shell-button w-shell-button--black"
                disabled={
                  disabled || busy || uncertain || referencesLoading || Boolean(referenceError)
                }
              >
                <CheckCircle2 size={17} />{' '}
                {busy
                  ? 'Đang ghi nhận…'
                  : reviewRequired
                    ? 'Kiểm tra trước khi ghi nhận'
                    : 'Ghi nhận'}
              </button>
            )}
          </div>
        </form>
        {confirm && (
          <section className="w-inline-review" aria-labelledby="w-inline-review-title">
            <h3 id="w-inline-review-title" ref={reviewHeading} tabIndex={-1}>
              Kiểm tra trước khi ghi nhận
            </h3>
            <WarrantyFields
              fields={[
                [
                  operation.key === 'NHAN_LAI' ? 'Thiết bị theo lần gửi' : 'Thiết bị',
                  warrantyDeviceLabel(
                    detail,
                    body?.thiet_bi_ban_giao_id ??
                      body?.thiet_bi_se_tra_id ??
                      body?.thiet_bi_id ??
                      detail.thiet_bi?.id
                  ),
                ],
                ...(operation.key === 'NHAN_LAI'
                  ? [
                      [
                        'Kết quả đối chiếu',
                        fieldOptions.doi_chieu_thiet_bi[values.doi_chieu_thiet_bi],
                      ],
                      ['Serial thực nhận', body?.so_serial_thuc_nhan || 'Không ghi nhận serial'],
                    ]
                  : []),
              ]}
            />
            {[
              'nha_cung_cap_id',
              'lan_gui_lich_su_id',
              'ket_luan_lich_su_id',
              'so_tien',
              'so_tien_mien_giam',
              'hoa_don_bao_hanh_id',
              'phien_ban_phuong_an',
              'ket_qua_xu_ly',
              'tinh_trang',
              'ly_do',
            ]
              .filter((field) => body?.[field] != null)
              .map((field) => (
                <p key={field}>
                  <strong>{fieldLabels[field]}: </strong>
                  {referenceOptions(field, detail, suppliers, versions)?.find(
                    (item) => String(item.value) === String(body[field])
                  )?.label || displayValue(body[field], field)}
                </p>
              ))}
            {body?.ma_hang_muc && (
              <p>
                <strong>Hạng mục miễn phí: </strong>
                {body.ma_hang_muc.join(', ')}
              </p>
            )}
            {operation.key === 'HANDOVER' && (
              <>
                <WarrantyFields
                  fields={[
                    ['Người nhận', body.ten_nguoi_nhan],
                    ['Số điện thoại', body.sdt_nguoi_nhan],
                    ['Thời điểm bàn giao', displayValue(body.thoi_diem, 'thoi_diem')],
                    [
                      'Duyệt công nợ',
                      referenceOptions('phe_duyet_cong_no_lich_su_id', detail)?.find(
                        (item) => String(item.value) === String(body.phe_duyet_cong_no_lich_su_id)
                      )?.label || 'Không dùng ngoại lệ công nợ',
                    ],
                    ['Bằng chứng', body.bang_chung_urls.join('\n')],
                  ]}
                />
                <p className="w-shell-note">
                  Xác nhận này sẽ hoàn tất phiếu. Nghĩa vụ hoàn tiền và đối soát còn lại vẫn được
                  giữ.
                </p>
              </>
            )}
            {body?.hang_muc?.map((item, index) => (
              <article className="w-confirm-item" key={index}>
                <h3>
                  Hạng mục {index + 1}: {item.ma_hang_muc}
                </h3>
                <WarrantyFields
                  fields={Object.entries(item)
                    .filter(([key]) => key !== 'ma_hang_muc')
                    .map(([key, value]) => [fieldLabels[key] || key, displayValue(value, key)])}
                />
              </article>
            ))}
            {body?.phu_kien?.length > 0 && (
              <p>
                <strong>Phụ kiện: </strong>
                {body.phu_kien.map((item) => `${item.ten} × ${item.so_luong}`).join(', ')}
              </p>
            )}
            <label className="w-shell-modal-confirm w-guided-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy || uncertain}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {operation.group === 'money'
                ? 'Tôi xác nhận giao dịch tiền trên đã thực sự phát sinh.'
                : 'Tôi đã đối chiếu thông tin và xác nhận thao tác này.'}
            </label>

            {error && (
              <p className="w-shell-error" role="alert">
                {error}
              </p>
            )}

            <div className="w-form-footer">
              <button
                type="button"
                className="w-shell-button"
                disabled={busy || uncertain}
                onClick={() => {
                  setConfirm(false);
                  setConfirmed(false);
                  setError('');
                }}
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                className="w-shell-button w-shell-button--black"
                disabled={busy || !confirmed || (disabled && !uncertain)}
                onClick={() => submit(body)}
              >
                {busy ? 'Đang ghi nhận…' : uncertain ? 'Thử lại cùng yêu cầu' : 'Xác nhận ghi nhận'}
              </button>
            </div>
          </section>
        )}
      </section>
    </WarrantyDialog>
  );
}
