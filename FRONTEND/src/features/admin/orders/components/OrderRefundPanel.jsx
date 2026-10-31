import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { money, refundOrder, refundOrderReturn } from '../api/orderApi';

import {
  errorMessage,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';

import OrderModal from './OrderModal';

import './OrderRefundPanel.css';

export default function OrderRefundPanel({ order, busy, perform, data, onEditingChange }) {
  const attempt = useRef(null);

  const [operationError, setOperationError] = useState('');
  const [dialog, setDialog] = useState(null);

  useEffect(() => () => onEditingChange(false), [onEditingChange]);

  const pending = attempt.current;
  const locked = busy || Boolean(pending) || Boolean(dialog);

  const openRefund = (kind, document = null) => {
    if (locked) return;

    const amount =
      kind === 'return' ? document?.tong_tien_hoan : data?.hoan_don_huy?.so_tien_can_hoan;

    if (amount == null || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setOperationError('Chưa xác định được khoản tiền có thể hoàn. Hãy kiểm tra lại dữ liệu.');
      return;
    }

    setOperationError('');
    onEditingChange(true);

    setDialog({
      kind,
      returnId: document?.id ?? null,
      code: document?.ma_tra_hang ?? order.ma_don_hang,
      amount,
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
        onEditingChange(false);
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
    if (attempt.current) return retry();
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

    const scope = dialog.kind === 'return' ? 'return:' + dialog.returnId : 'cancelled:' + order.id;

    return execute(scope, body);
  };

  const close = () => {
    if (busy || attempt.current) return;

    setDialog(null);
    setOperationError('');
    onEditingChange(false);
  };

  const change = (key, value) =>
    setDialog((current) => ({
      ...current,
      [key]: value,
    }));

  const cancelled = data?.hoan_don_huy;
  const documents = data?.phieu_tra_hang ?? [];

  const showCancelled = cancelled?.hien_thi === true;

  const noRefundDue =
    cancelled?.so_tien_can_hoan != null && Number(cancelled.so_tien_can_hoan) === 0;

  if (!showCancelled && !documents.length && !pending && !dialog && !operationError) {
    return null;
  }

  return (
    <section className="order-refund-panel" aria-busy={busy}>
      <header className="order-refund-panel__heading">
        <h2>KHOẢN HOÀN VÀ PHIẾU NHẬN LẠI</h2>
      </header>

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
            <strong>
              {order.trang_thai_xuat_kho === 'DA_HOAN_KHO'
                ? 'ĐƠN HỦY ĐÃ NHẬN LẠI HÀNG'
                : 'ĐƠN HỦY TRƯỚC XUẤT KHO'}
            </strong>

            <p>
              {cancelled.so_tien_can_hoan == null
                ? 'Chưa xác định được số tiền cần hoàn.'
                : 'Còn phải hoàn: ' + money(cancelled.so_tien_can_hoan)}
            </p>

            {cancelled.ly_do && <small>{cancelled.ly_do}</small>}
          </div>

          {cancelled.co_the_hoan === true ? (
            <button
              type="button"
              className="order-action order-action--black"
              disabled={locked}
              onClick={() => openRefund('cancelled')}
            >
              GHI NHẬN ĐÃ HOÀN TIỀN
            </button>
          ) : (
            <span
              className={
                noRefundDue ? 'order-refund-panel__completed' : 'order-refund-panel__error'
              }
            >
              {noRefundDue ? 'KHÔNG CÒN KHOẢN HOÀN' : 'CẦN ĐỐI SOÁT'}
            </span>
          )}
        </article>
      )}

      {documents.map((document) => {
        const cancellationReturn = document.ma_tra_hang === 'TH-HUY-DH-' + order.id;

        return (
          <article className="order-refund-panel__item" key={document.id}>
            <div>
              <strong>{cancellationReturn ? 'PHIẾU NHẬN LẠI HÀNG' : 'PHIẾU TRẢ'}</strong>{' '}
              <Link to={'/admin/don-hang/khach-tra-hang/' + document.id}>
                {document.ma_tra_hang}
              </Link>
              <p>
                {cancellationReturn
                  ? 'Hàng đã được nhận lại. Khoản hoàn tiền được theo dõi theo đơn hủy.'
                  : document.tong_tien_hoan == null
                    ? 'Chưa xác định được tiền hoàn.'
                    : 'Tiền hoàn: ' + money(document.tong_tien_hoan)}
              </p>
              {document.ly_do && <small>{document.ly_do}</small>}
            </div>

            {cancellationReturn ? (
              <span className="order-refund-panel__completed">ĐÃ NHẬN LẠI HÀNG</span>
            ) : document.da_ghi_nhan_hoan === true ? (
              <span className="order-refund-panel__completed">ĐÃ KẾT THÚC</span>
            ) : document.co_the_hoan === true ? (
              <button
                type="button"
                className="order-action order-action--black"
                disabled={locked}
                onClick={() => openRefund('return', document)}
              >
                GHI NHẬN ĐÃ HOÀN THEO PHIẾU
              </button>
            ) : (
              <span className="order-refund-panel__note">CHƯA ĐỦ ĐIỀU KIỆN HOÀN</span>
            )}
          </article>
        );
      })}

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
          disabled={!dialog.confirmed || Boolean(pending)}
          close={close}
          submit={submit}
        >
          <div className="order-refund-panel__amount">
            <span>SỐ TIỀN HOÀN</span>
            <strong>{money(dialog.amount)}</strong>
          </div>

          <fieldset className="order-refund-panel__fields" disabled={busy || Boolean(pending)}>
            <label>
              <span>PHƯƠNG THỨC HOÀN</span>

              <select
                value={dialog.method}
                onChange={(event) => change('method', event.target.value)}
              >
                <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                <option value="TIEN_MAT">Tiền mặt</option>
              </select>
            </label>

            <label>
              <span>THỜI ĐIỂM ĐÃ HOÀN TIỀN</span>

              <input
                type="datetime-local"
                required
                value={dialog.occurredAt}
                onChange={(event) => change('occurredAt', event.target.value)}
              />
            </label>

            {dialog.method === 'CHUYEN_KHOAN' && (
              <label>
                <span>MÃ GIAO DỊCH</span>

                <input
                  type="text"
                  required
                  maxLength={255}
                  value={dialog.transaction}
                  onChange={(event) => change('transaction', event.target.value)}
                />
              </label>
            )}

            <label className="order-refund-panel__confirm">
              <input
                type="checkbox"
                checked={dialog.confirmed}
                onChange={(event) => change('confirmed', event.target.checked)}
              />

              <span>Cửa hàng đã hoàn số tiền trên cho khách.</span>
            </label>
          </fieldset>

          {pending && (
            <button type="button" className="order-action" disabled={busy} onClick={retry}>
              THỬ LẠI YÊU CẦU CŨ
            </button>
          )}
        </OrderModal>
      )}
    </section>
  );
}
