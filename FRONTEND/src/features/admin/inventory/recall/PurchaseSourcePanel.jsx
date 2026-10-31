import { useCallback, useEffect, useRef, useState } from 'react';
import { PurchaseCard } from '../../purchasing/pages/PurchaseShared';
import OrderModal from '../../orders/components/OrderModal';
import {
  errorMessage,
  formatDateTimeVN,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import { getPurchaseSources, recordPurchaseSource, splitCodes } from './recallApi';
import './Recall.css';

export default function PurchaseSourcePanel({ order, locked = false, onLockChange }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});

  const attempt = useRef(null);
  const writing = useRef(false);
  const reader = useRef(null);
  const readSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++readSequence.current;
    reader.current?.abort();

    const controller = new AbortController();
    reader.current = controller;
    setLoading(true);

    try {
      const result = await getPurchaseSources(order.id, controller.signal);

      if (!controller.signal.aborted && sequence === readSequence.current) {
        setData(result);
        setReadError('');
      }
    } catch (cause) {
      if (!controller.signal.aborted && sequence === readSequence.current) {
        setReadError(errorMessage(cause));
      }
    } finally {
      if (!controller.signal.aborted && sequence === readSequence.current) {
        setLoading(false);
      }
    }
  }, [order.id]);

  useEffect(() => {
    load();

    return () => {
      reader.current?.abort();
    };
  }, [load, order]);

  useEffect(() => {
    onLockChange?.(dialog || busy || Boolean(attempt.current));
  }, [dialog, busy, error, onLockChange]);

  useEffect(() => () => onLockChange?.(false), [onLockChange]);

  const recordedByVariant = new Map();

  for (const receipt of data) {
    if (!['NHAP_GOC', 'DOI_SOAT_CU'].includes(receipt.source_kind)) {
      continue;
    }

    for (const item of receipt.items || []) {
      const variantId = Number(item.variant_id);

      recordedByVariant.set(
        variantId,
        (recordedByVariant.get(variantId) || 0) + Number(item.quantity || 0)
      );
    }
  }

  const sourceOptions = (order.items || [])
    .map((item) => ({
      ...item,
      unrecorded: Math.max(
        0,
        Number(item.received || 0) - (recordedByVariant.get(Number(item.versionId)) || 0)
      ),
    }))
    .filter((item) => item.unrecorded > 0);

  const line = sourceOptions.find((item) => Number(item.id) === Number(form.lineId));

  const frozen = busy || Boolean(attempt.current);

  const change = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
      confirmed: false,
      ...(name === 'lineId' ? { quantity: '1', serials: '', lot: '' } : {}),
    }));
  };

  const open = () => {
    if (locked || frozen || loading || !sourceOptions.length) return;

    setForm({
      lineId: String(sourceOptions[0].id),
      quantity: '1',
      lot: '',
      serials: '',
      document: '',
      note: '',
      confirmed: false,
    });

    setError('');
    setDialog(true);
  };

  const submit = async () => {
    if (writing.current || locked) return;

    let body = attempt.current?.body;

    if (!body) {
      if (!line || !form.confirmed || !form.document.trim()) {
        setError('Chọn dòng, nhập mã chứng từ giao nhận thực tế và xác nhận.');
        return;
      }

      const quantity = Number(form.quantity);
      const codes = splitCodes(form.serials);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > Math.min(500, line.unrecorded)
      ) {
        setError('Số lượng vượt phần đã nhập nhưng chưa ghi nguồn.');
        return;
      }

      if (
        line.serialManaged &&
        (codes.length !== quantity || new Set(codes).size !== codes.length)
      ) {
        setError('Nhập đúng số serial của lần nhận, không được trùng.');
        return;
      }

      const note =
        form.note.trim() ||
        `Ghi nguồn cho ${quantity} sản phẩm của ${order.code} ` +
          `theo chứng từ ${form.document.trim()}` +
          (form.lot.trim() ? `; lô ${form.lot.trim()}.` : '.');

      body = {
        document: form.document.trim(),
        note,
        confirmed: true,
        items: [
          {
            purchaseLineId: line.id,
            quantity,
            lot: form.lot.trim() || null,
            serialCodes: line.serialManaged ? codes : [],
          },
        ],
      };
    }

    writing.current = true;
    setBusy(true);
    setError('');

    try {
      await withIdempotency(attempt, `source:${order.id}`, body, (key, saved) =>
        recordPurchaseSource(order.id, key, saved)
      );

      setDialog(false);
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  return (
    <PurchaseCard title="NGUỒN NHẬN VÀ CHỨNG TỪ NHÀ CUNG CẤP" className="recall-source-card">
      <div className="recall-toolbar">
        <span className="recall-muted">{data.length} bản ghi nguồn nhận</span>

        {sourceOptions.length > 0 && (
          <button
            type="button"
            className="purchase-btn outline"
            disabled={locked || frozen || loading || Boolean(readError)}
            onClick={open}
          >
            Ghi nguồn cho hàng đã nhập
          </button>
        )}
      </div>

      {loading && !data.length && <p role="status">Đang tải nguồn nhận...</p>}

      {readError && (
        <p className="recall-error" role="alert">
          {readError}
        </p>
      )}

      {!loading && !readError && !data.length && (
        <p className="recall-muted">
          {sourceOptions.length
            ? 'Có hàng đã nhập nhưng chưa có bản ghi nguồn nhận riêng.'
            : 'Chưa có bản ghi nguồn nhận.'}
        </p>
      )}

      {data.map((receipt) => (
        <details className="recall-section" key={receipt.id}>
          <summary>
            Nguồn #{receipt.id}
            {' · '}
            {receipt.supplier_document || 'Chưa ghi chứng từ Nhà Cung Cấp'}
            {' · '}
            {formatDateTimeVN(receipt.recorded_at)}
          </summary>

          <div className="recall-table-scroll">
            <table className="recall-table">
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th>Số lượng</th>
                  <th>Mã lô</th>
                  <th>Serial</th>
                </tr>
              </thead>
              <tbody>
                {(receipt.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.ten_phien_ban}</td>
                    <td>{item.quantity}</td>
                    <td>{item.supplier_lot || 'Chưa ghi'}</td>
                    <td>
                      {(item.serials || []).map((serial) => serial.so_serial).join(', ') ||
                        'Không quản lý serial'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="recall-muted">
            {receipt.actor_name} · {receipt.note}
          </p>
        </details>
      ))}

      {dialog && (
        <OrderModal
          title="GHI NGUỒN CHO HÀNG ĐÃ NHẬP"
          subtitle={order.code}
          className="recall-modal"
          showClose
          busy={busy}
          error={error}
          disabled={!attempt.current && !form.confirmed}
          confirmLabel={attempt.current ? 'Thử lại yêu cầu cũ' : 'Lưu thông tin nguồn'}
          close={() => {
            if (!frozen) {
              setDialog(false);
              setError('');
            }
          }}
          submit={submit}
        >
          <p className="recall-modal-description">
            Chỉ dùng cho phần hàng đã nhập kho nhưng chưa có bản ghi nguồn nhận riêng. Thao tác này
            không nhập thêm hàng và không tăng tồn kho.
          </p>

          <fieldset className="recall-fields" disabled={frozen}>
            <label className="recall-wide">
              <span>Dòng hàng chưa ghi đủ nguồn</span>
              <select
                value={form.lineId}
                onChange={(event) => change('lineId', event.target.value)}
              >
                {sourceOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {' · Còn '}
                    {item.unrecorded}
                    {' sản phẩm chưa ghi nguồn'}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Số lượng thuộc lần nhận này</span>
              <input
                type="number"
                min="1"
                max={Math.min(500, line?.unrecorded || 1)}
                value={form.quantity}
                onChange={(event) => change('quantity', event.target.value)}
              />
            </label>

            <label>
              <span>Mã lô trên chứng từ, nếu có</span>
              <input
                maxLength={100}
                value={form.lot}
                onChange={(event) => change('lot', event.target.value)}
              />
            </label>

            <label className="recall-wide">
              <span>Mã phiếu giao hàng hoặc biên bản giao nhận</span>
              <input
                required
                maxLength={100}
                value={form.document}
                placeholder="Nhập mã có trên chứng từ thực tế"
                onChange={(event) => change('document', event.target.value)}
              />
            </label>

            {line?.serialManaged && (
              <label className="recall-wide">
                <span>
                  Serial đã nhận trong đợt này
                  {' · '}
                  {splitCodes(form.serials).length}/{Number(form.quantity) || 0}
                </span>
                <textarea
                  rows={4}
                  value={form.serials}
                  placeholder="Mỗi dòng một serial đã nhập trước đây"
                  onChange={(event) => change('serials', event.target.value)}
                />
              </label>
            )}

            <label className="recall-wide">
              <span>Ghi chú bổ sung, nếu có</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={form.note}
                placeholder="Thông tin thêm để đối chiếu lần giao nhận."
                onChange={(event) => change('note', event.target.value)}
              />
            </label>

            <label className="recall-check recall-wide">
              <input
                type="checkbox"
                checked={Boolean(form.confirmed)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmed: event.target.checked,
                  }))
                }
              />
              <span>
                Tôi đã kiểm tra chứng từ và xác nhận đúng số lượng, serial, mã lô của lần nhận đã
                nhập kho.
              </span>
            </label>
          </fieldset>
        </OrderModal>
      )}
    </PurchaseCard>
  );
}
