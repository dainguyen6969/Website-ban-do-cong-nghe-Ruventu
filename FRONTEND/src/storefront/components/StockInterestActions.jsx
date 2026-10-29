import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cartService } from '../../shared/services/cartService';
import { orderService } from '../../shared/services/orderService';
import { errorMessage, withIdempotency } from '../../shared/services/mutationUtils';
import './StockInterestActions.css';

export default function StockInterestActions({
  variantId,
  productName,
  variantName,
  unitPrice,
  image,
  outOfStock,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const modal = useRef(null);
  const attempt = useRef(null);
  const writing = useRef(false);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('ORDER');
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const frozen = busy || Boolean(attempt.current);

  useEffect(() => {
    if (open && !modal.current.open) modal.current.showModal();
    if (!open && modal.current.open) modal.current.close();
  }, [open]);

  const show = (kind) => {
    if (frozen) return;
    setMode(kind);
    setError('');
    setSuccess('');
    setConfirmed(false);
    setOpen(true);
  };

  const close = () => {
    if (!frozen) setOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (writing.current) return;

    if (mode === 'ORDER') {
      const amount = Number(quantity);

      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 99) {
        setError('Chọn số lượng từ 1 đến 99.');
        return;
      }

      setOpen(false);

      navigate('/checkout', {
        state: {
          waitingReturnTo: location.pathname,
          waitingItems: [
            {
              variantId: Number(variantId),
              quantity: amount,
              name: productName,
              variantName,
              unitPrice,
              image: typeof image === 'string' ? image : '',
            },
          ],
        },
      });

      return;
    }

    let body = attempt.current?.body;

    if (!body) {
      const normalizedPhone = phone.replace(/[\s.-]/g, '');

      if (!name.trim() || !/^(?:\+84|0)\d{9,10}$/.test(normalizedPhone) || !confirmed) {
        setError('Nhập tên, số điện thoại hợp lệ và đồng ý nhận liên hệ.');
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
      // Khởi tạo danh tính khách bằng cơ chế cookie giỏ hàng hiện có.
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

  return (
    <div className="stock-interest">
      <div className="stock-interest__actions">
        <button type="button" onClick={() => show('ORDER')}>
          ĐẶT CHỜ HÀNG
        </button>

        {outOfStock && (
          <button type="button" onClick={() => show('NOTICE')}>
            NHẬN THÔNG BÁO CÓ HÀNG
          </button>
        )}
      </div>

      {success && <p role="status">{success}</p>}

      <dialog
        ref={modal}
        className="stock-interest-dialog"
        onCancel={(event) => {
          if (frozen) event.preventDefault();
        }}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={submit}>
          <header>
            <div>
              <strong>{mode === 'ORDER' ? 'ĐẶT CHỜ HÀNG' : 'ĐĂNG KÝ BÁO CÓ HÀNG'}</strong>
              <p>
                {productName} · {variantName}
              </p>
            </div>
            <button type="button" disabled={frozen} onClick={close}>
              ×
            </button>
          </header>

          <fieldset disabled={frozen}>
            {mode === 'ORDER' ? (
              <>
                <p>Cửa hàng sẽ xác nhận khả năng cung ứng trước khi thực hiện đơn.</p>
                <label>
                  <span>Số lượng muốn mua</span>
                  <input
                    required
                    type="number"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <p>Đăng ký này chỉ yêu cầu liên hệ khi có hàng, chưa tạo đơn mua.</p>

                <label>
                  <span>Họ tên</span>
                  <input
                    required
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
                  <span>Tôi đồng ý để cửa hàng liên hệ về sản phẩm này.</span>
                </label>
              </>
            )}
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
            <button type="submit" disabled={busy}>
              {busy
                ? 'Đang gửi...'
                : attempt.current
                  ? 'Thử lại yêu cầu cũ'
                  : mode === 'ORDER'
                    ? 'Tiếp tục đặt chờ'
                    : 'Đăng ký'}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
