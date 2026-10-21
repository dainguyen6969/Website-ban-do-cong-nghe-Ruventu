import { useEffect, useRef, useState } from 'react';

import { getOrderRefundOptions, money, refundOrder, refundOrderReturn } from '../api/orderApi';

import {
  errorMessage,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';

import OrderModal from './OrderModal';

import './OrderRefundPanel.css';

export default function OrderRefundPanel({ order, busy, perform, revision }) {
  const attempt = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setReadError('');

    getOrderRefundOptions(order.id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setReadError(errorMessage(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    order.id,
    order.trang_thai_don_hang,
    order.trang_thai_xuat_kho,
    order.trang_thai_thanh_toan,
    revision,
    reload,
  ]);

  const locked = busy || loading;
  const pending = attempt.current;

  const openRefund = (kind, document = null) => {
    if (locked || pending) return;

    setOperationError('');

    setDialog({
      kind,
      returnId: document?.id ?? null,
      code: document?.ma_tra_hang ?? order.ma_don_hang,
      amount: kind === 'return' ? document.tong_tien_hoan : data?.hoan_don_huy?.so_tien_can_hoan,
      method: 'CHUYEN_KHOAN',
      occurredAt: nowLocalInput(),
      transaction: '',
      confirmed: false,
    });
  };

  const send = (scope, body) =>
    withIdempotency(attempt, scope, body, (key, frozenBody) => {
      const [kind, rawId] = scope.split(':');
      const id = Number(rawId);

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('ID nguồn hoàn tiền không hợp lệ.');
      }

      if (kind === 'return') {
        return refundOrderReturn(id, key, frozenBody);
      }

      if (kind === 'cancelled') {
        return refundOrder(id, key, frozenBody);
      }

      throw new Error('Nguồn hoàn tiền không hợp lệ.');
    });

  const execute = (scope, body) =>
    perform(async () => {
      setOperationError('');

      try {
        await send(scope, body);

        setDialog(null);
        setReload((value) => value + 1);
      } catch (error) {
        setOperationError(errorMessage(error));
        throw error;
      }
    });

  const retry = () => {
    const saved = attempt.current;

    if (!saved || busy) return;

    return execute(saved.scope, saved.body);
  };

  const submit = () => {
    if (attempt.current) {
      return retry();
    }

    if (!dialog || busy) return;

    if (!dialog.confirmed) {
      setOperationError('Chỉ xác nhận khi cửa hàng đã thực sự hoàn tiền cho khách.');
      return;
    }

    if (dialog.method === 'CHUYEN_KHOAN' && !dialog.transaction.trim()) {
      setOperationError('Vui lòng nhập mã giao dịch hoàn tiền.');
      return;
    }

    let occurredAt;

    try {
      occurredAt = toApiDateTime(dialog.occurredAt);
    } catch (error) {
      setOperationError(errorMessage(error));
      return;
    }

    const body = {
      xac_nhan_da_hoan_tien: true,
      phuong_thuc_hoan: dialog.method,
      ngay_hoan_tien: occurredAt,
      ma_giao_dich: dialog.method === 'TIEN_MAT' ? null : dialog.transaction.trim(),
    };

    const scope = dialog.kind === 'return' ? `return:${dialog.returnId}` : `cancelled:${order.id}`;

    return execute(scope, body);
  };

  const cancelled = data?.hoan_don_huy;
  const documents = data?.phieu_tra_hang ?? [];

  const showCancelled =
    order.trang_thai_don_hang === 'HUY_HANG' && order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO';

  const showPanel = showCancelled || documents.length > 0 || Boolean(readError) || Boolean(pending);

  if (!showPanel && !loading) return null;

  return (
    <section className="order-refund-panel" aria-busy={busy || loading}>
      <header className="order-refund-panel__heading">
        <h2>HOÀN TIỀN KHÁCH HÀNG</h2>

        <button
          type="button"
          className="order-action"
          disabled={locked}
          onClick={() => setReload((value) => value + 1)}
        >
          TẢI LẠI
        </button>
      </header>

      {loading && (
        <p className="order-refund-panel__note" role="status">
          Đang kiểm tra các khoản hoàn tiền...
        </p>
      )}

      {readError && (
        <p className="order-refund-panel__error" role="alert">
          {readError}
        </p>
      )}

      {pending && (
        <div className="order-refund-panel__pending" role="status">
          <p>
            Chưa xác định được kết quả ghi nhận hoàn tiền. Hãy thử lại cùng yêu cầu đang được giữ.
          </p>

          <button type="button" className="order-action" disabled={busy} onClick={retry}>
            THỬ LẠI YÊU CẦU CŨ
          </button>
        </div>
      )}

      {showCancelled && (
        <article className="order-refund-panel__item">
          <div>
            <strong>ĐƠN HỦY TRƯỚC XUẤT KHO</strong>

            <p>
              {cancelled?.so_tien_can_hoan == null
                ? 'Chưa xác định được số tiền cần hoàn.'
                : `Còn phải hoàn: ${money(cancelled.so_tien_can_hoan)}`}
            </p>

            {cancelled?.ly_do && <small>{cancelled.ly_do}</small>}
          </div>

          <button
            type="button"
            className="order-action order-action--black"
            disabled={locked || Boolean(pending) || !cancelled?.co_the_hoan}
            onClick={() => openRefund('cancelled')}
          >
            HOÀN TIỀN ĐƠN HỦY
          </button>
        </article>
      )}

      {documents.map((document) => (
        <article className="order-refund-panel__item" key={document.id}>
          <div>
            <strong>PHIẾU TRẢ {document.ma_tra_hang}</strong>

            <p>
              Tiền hoàn:{' '}
              {document.tong_tien_hoan == null ? 'Chưa xác định' : money(document.tong_tien_hoan)}
            </p>

            {document.ly_do && <small>{document.ly_do}</small>}
          </div>

          {document.da_ghi_nhan_hoan ? (
            <span className="order-refund-panel__completed">ĐÃ KẾT THÚC</span>
          ) : (
            <button
              type="button"
              className="order-action order-action--black"
              disabled={locked || Boolean(pending) || !document.co_the_hoan}
              onClick={() => openRefund('return', document)}
            >
              HOÀN TIỀN THEO PHIẾU TRẢ
            </button>
          )}
        </article>
      ))}

      {operationError && !dialog && (
        <p className="order-refund-panel__error" role="alert">
          {operationError}
        </p>
      )}

      {dialog && (
        <OrderModal
          title="GHI NHẬN ĐÃ HOÀN TIỀN"
          subtitle={dialog.code}
          className="order-refund-modal"
          showClose
          cancelLabel="ĐÓNG"
          confirmLabel="XÁC NHẬN ĐÃ HOÀN TIỀN"
          busy={busy}
          error={operationError}
          disabled={!dialog.confirmed || Boolean(attempt.current)}
          close={() => {
            if (!busy && !attempt.current) {
              setDialog(null);
              setOperationError('');
            }
          }}
          submit={submit}
        >
          <div className="order-refund-panel__amount">
            <span>SỐ TIỀN HOÀN</span>
            <strong>{money(dialog.amount)}</strong>
          </div>

          <fieldset
            className="order-refund-panel__fields"
            disabled={busy || Boolean(attempt.current)}
          >
            <label>
              <span>PHƯƠNG THỨC HOÀN</span>

              <select
                value={dialog.method}
                onChange={(event) =>
                  setDialog((current) => ({
                    ...current,
                    method: event.target.value,
                  }))
                }
              >
                <option value="CHUYEN_KHOAN">Chuyển khoản</option>

                <option value="TIEN_MAT">Tiền mặt</option>
              </select>
            </label>

            <label>
              <span>THỜI ĐIỂM ĐÃ HOÀN TIỀN</span>

              <input
                type="datetime-local"
                value={dialog.occurredAt}
                onChange={(event) =>
                  setDialog((current) => ({
                    ...current,
                    occurredAt: event.target.value,
                  }))
                }
              />
            </label>

            {dialog.method === 'CHUYEN_KHOAN' && (
              <label>
                <span>MÃ GIAO DỊCH</span>

                <input
                  type="text"
                  maxLength={255}
                  value={dialog.transaction}
                  onChange={(event) =>
                    setDialog((current) => ({
                      ...current,
                      transaction: event.target.value,
                    }))
                  }
                />
              </label>
            )}

            <label className="order-refund-panel__confirm">
              <input
                type="checkbox"
                checked={dialog.confirmed}
                onChange={(event) =>
                  setDialog((current) => ({
                    ...current,
                    confirmed: event.target.checked,
                  }))
                }
              />

              <span>Cửa hàng đã hoàn số tiền trên cho khách.</span>
            </label>
          </fieldset>

          {attempt.current && (
            <button type="button" className="order-action" disabled={busy} onClick={retry}>
              THỬ LẠI YÊU CẦU CŨ
            </button>
          )}
        </OrderModal>
      )}
    </section>
  );
}
