import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

import { cartService } from '../../shared/services/cartService';
import { orderService } from '../../shared/services/orderService';

import { errorMessage, withIdempotency } from '../../shared/services/mutationUtils';

import './StockInterestActions.css';

export default function StockInterestActions({ variantId, productName, variantName, outOfStock }) {
  const modal = useRef(null);
  const attempt = useRef(null);
  const writing = useRef(false);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validVariant = Number.isSafeInteger(Number(variantId)) && Number(variantId) > 0;

  const frozen = busy || Boolean(attempt.current);

  useEffect(() => {
    const dialog = modal.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, outOfStock]);

  const show = () => {
    if (frozen || !validVariant || outOfStock !== true) return;

    setError('');
    setSuccess('');
    setConfirmed(false);
    setOpen(true);
  };

  const close = () => {
    if (!frozen) {
      setOpen(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    if (writing.current) return;

    let body = attempt.current?.body;

    if (!body) {
      if (!validVariant || outOfStock !== true) {
        setError('Sản phẩm hiện không thuộc trường hợp đăng ký báo có hàng.');
        return;
      }

      const normalizedPhone = phone.replace(/[\s.-]/g, '');

      if (!name.trim() || !/^(?:\+84|0)\d{9,10}$/.test(normalizedPhone) || !confirmed) {
        setError('Nhập họ tên, số điện thoại hợp lệ và đồng ý để cửa hàng liên hệ.');
        return;
      }

      body = {
        variantId: Number(variantId),
        name: name.trim(),
        phone: normalizedPhone,
        confirmed: true,
      };
    }

    writing.current = true;
    setBusy(true);
    setError('');

    try {
      await cartService.getCurrentCart();

      await withIdempotency(attempt, `stock-notice:${variantId}`, body, (key, frozenBody) =>
        orderService.registerStockNotice(frozenBody, key)
      );

      setOpen(false);
      setSuccess('Đã ghi nhận đăng ký. Cửa hàng sẽ liên hệ khi có hàng.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  if (!validVariant || outOfStock !== true) return null;

  return (
    <div className="stock-interest">
      <button
        type="button"
        className="sidebar-btn-buy-now stock-interest__trigger"
        disabled={frozen}
        onClick={show}
      >
        <Bell size={20} className="btn-icon" />
        NHẬN THÔNG BÁO CÓ HÀNG
      </button>

      {success && <p role="status">{success}</p>}

      <dialog
        ref={modal}
        className="stock-interest-dialog"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={submit}>
          <header>
            <div>
              <strong>ĐĂNG KÝ NHẬN THÔNG BÁO CÓ HÀNG</strong>

              <p>
                {productName}
                {variantName ? ` · ${variantName}` : ''}
              </p>
            </div>

            <button type="button" aria-label="Đóng" disabled={frozen} onClick={close}>
              ×
            </button>
          </header>

          <fieldset disabled={frozen}>
            <p>
              Đăng ký này chưa tạo đơn mua và chưa giữ hàng. Nếu muốn đặt chờ mua hàng, vui lòng
              liên hệ cửa hàng.
            </p>

            <label>
              <span>Họ tên</span>

              <input
                required
                type="text"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setConfirmed(false);
                }}
              />
            </label>

            <label>
              <span>Số điện thoại</span>

              <input
                required
                type="tel"
                autoComplete="tel"
                maxLength={20}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setConfirmed(false);
                }}
              />
            </label>

            <label className="stock-interest__check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />

              <span>Tôi đồng ý để cửa hàng liên hệ khi sản phẩm có hàng.</span>
            </label>
          </fieldset>

          {error && (
            <p className="stock-interest__error" role="alert">
              {error}
            </p>
          )}

          <footer>
            <button type="button" disabled={frozen} onClick={close}>
              Đóng
            </button>

            <button type="submit" disabled={busy || (!attempt.current && !confirmed)}>
              {busy
                ? 'Đang gửi...'
                : attempt.current
                  ? 'Thử lại yêu cầu cũ'
                  : 'Đăng ký nhận thông báo'}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
