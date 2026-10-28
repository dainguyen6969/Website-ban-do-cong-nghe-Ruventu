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
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});
  const attempt = useRef(null);
  const writing = useRef(false);

  const load = useCallback(
    async (signal) => {
      try {
        const result = await getPurchaseSources(order.id, signal);
        if (!signal?.aborted) {
          setData(result);
          setError('');
        }
      } catch (cause) {
        if (!signal?.aborted) setError(errorMessage(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [order.id]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, order]);

  useEffect(() => {
    onLockChange?.(dialog || busy || Boolean(attempt.current));
  }, [dialog, busy, error, onLockChange]);

  useEffect(() => () => onLockChange?.(false), [onLockChange]);

  const line = order.items.find((item) => Number(item.id) === Number(form.lineId));
  const frozen = busy || Boolean(attempt.current);

  const change = (name, value) =>
    setForm((current) => ({ ...current, [name]: value, confirmed: false }));

  const open = () => {
    if (locked || frozen) return;
    setForm({
      lineId: String(order.items.find((item) => item.received > 0)?.id || ''),
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
      if (!line || !form.confirmed || !form.document.trim() || !form.note.trim()) {
        setError('Chọn dòng, nhập chứng từ, nội dung đối soát và xác nhận.');
        return;
      }

      const quantity = Number(form.quantity);
      const codes = splitCodes(form.serials);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 500 ||
        (line.serialManaged && codes.length !== quantity)
      ) {
        setError('Số lượng hoặc danh sách serial không hợp lệ.');
        return;
      }

      body = {
        document: form.document.trim(),
        note: form.note.trim(),
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
        <button
          type="button"
          className="purchase-btn outline"
          disabled={locked || frozen || loading || !order.items.some((item) => item.received > 0)}
          onClick={open}
        >
          Bổ sung nguồn nhận cũ
        </button>
      </div>

      {loading && <p role="status">Đang tải nguồn nhận...</p>}
      {error && !dialog && (
        <p className="recall-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !data.length && (
        <p className="recall-muted">
          Chưa có dữ liệu lần nhận riêng. Nguồn lô và chứng từ cần được đối soát.
        </p>
      )}

      {data.map((receipt) => (
        <details className="recall-section" key={receipt.id}>
          <summary>
            Nguồn #{receipt.id} · {receipt.supplier_document || 'Chưa có chứng từ Nhà Cung Cấp'}
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
                {receipt.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.ten_phien_ban}
                      <small>Dòng nguồn #{item.id}</small>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{item.supplier_lot || 'Chưa cung cấp'}</td>
                    <td>
                      {item.serials.map((serial) => serial.so_serial).join(', ') ||
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
          title="ĐỐI SOÁT NGUỒN NHẬN CŨ"
          subtitle={order.code}
          className="recall-modal"
          showClose
          busy={busy}
          error={error}
          disabled={!attempt.current && !form.confirmed}
          confirmLabel={attempt.current ? 'Thử lại yêu cầu cũ' : 'Lưu nguồn nhận'}
          close={() => {
            if (!frozen) {
              setDialog(false);
              setError('');
            }
          }}
          submit={submit}
        >
          <p className="recall-notice">
            Bổ sung nguồn cho hàng đã nhập; thao tác này không tăng tồn kho.
          </p>
          <fieldset className="recall-fields" disabled={frozen}>
            <label className="recall-wide">
              <span>Dòng đơn nhập</span>
              <select
                value={form.lineId}
                onChange={(event) => change('lineId', event.target.value)}
              >
                {order.items
                  .filter((item) => item.received > 0)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Số lượng của lần nhận</span>
              <input
                type="number"
                min="1"
                max="500"
                value={form.quantity}
                onChange={(event) => change('quantity', event.target.value)}
              />
            </label>
            <label>
              <span>Mã lô Nhà Cung Cấp</span>
              <input
                maxLength={100}
                value={form.lot}
                onChange={(event) => change('lot', event.target.value)}
              />
            </label>
            <label className="recall-wide">
              <span>Mã phiếu xuất/giao hàng của Nhà Cung Cấp</span>
              <input
                required
                maxLength={100}
                value={form.document}
                onChange={(event) => change('document', event.target.value)}
              />
            </label>
            {line?.serialManaged && (
              <label className="recall-wide">
                <span>Serial của đúng lần nhận này</span>
                <textarea
                  rows={4}
                  value={form.serials}
                  onChange={(event) => change('serials', event.target.value)}
                />
              </label>
            )}
            <label className="recall-wide">
              <span>Căn cứ đối soát</span>
              <textarea
                required
                rows={3}
                maxLength={1000}
                value={form.note}
                onChange={(event) => change('note', event.target.value)}
              />
            </label>
            <label className="recall-check recall-wide">
              <input
                type="checkbox"
                checked={form.confirmed}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmed: event.target.checked,
                  }))
                }
              />
              <span>Đã đối chiếu chứng từ và xác nhận đúng nguồn nhận thực tế.</span>
            </label>
          </fieldset>
        </OrderModal>
      )}
    </PurchaseCard>
  );
}
