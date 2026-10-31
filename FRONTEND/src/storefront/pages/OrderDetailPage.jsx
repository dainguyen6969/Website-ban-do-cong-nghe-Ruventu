import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ImageOff } from 'lucide-react';

import Header from '../components/Header';
import Footer from '../components/Footer';

import OrderModal from '../../features/admin/orders/components/OrderModal';
import { isWaitingCodSettlement, label, money } from '../../features/admin/orders/api/orderApi';

import { orderService } from '../../shared/services/orderService';
import {
  errorMessage,
  formatDateTimeVN,
  withIdempotency,
} from '../../shared/services/mutationUtils';

import './OrderDetailPage.css';
import { customerOrderProgress } from './customerOrderProgress';

import {
  OrderLineAmount,
  OrderLineNotice,
  OrderPromotionSummary,
} from '../../shared/components/ui/OrderSaleDetails';
import SoldDevices from '../../shared/components/ui/SoldDevices';
import ComboContents from '../../shared/components/ui/ComboContents';

const returnLabels = {
  CHO_TIEP_NHAN: 'Chờ tiếp nhận',
  DA_NHAN_HANG: 'Đã nhận hàng',
  DA_HOAN_TIEN: 'Đã hoàn tiền',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returnsError, setReturnsError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);

  const busyRef = useRef(false);
  const cancelAttempt = useRef(null);

  const loadReturns = useCallback(
    async (signal) => {
      try {
        const response = await orderService.getReturns(
          {
            don_hang_id: Number(id),
            page: 0,
            limit: 100,
          },
          signal
        );

        if (signal?.aborted) return;

        setReturns(response.data.data?.items || []);
        setReturnsError('');
      } catch (reason) {
        if (!signal?.aborted) {
          setReturnsError(errorMessage(reason));
        }
      }
    },
    [id]
  );

  const load = useCallback(
    async (signal) => {
      try {
        const response = await orderService.getOrder(id, signal);

        if (signal?.aborted) return;

        setOrder(response.data.data);
        setError('');
      } catch (reason) {
        if (!signal?.aborted) {
          setError(errorMessage(reason));
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();

    setOrder(null);
    setLoading(true);
    setReturns([]);
    setDialog(null);

    load(controller.signal);
    loadReturns(controller.signal);

    return () => controller.abort();
  }, [load, loadReturns]);

  const run = async (request) => {
    if (busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      await request();
      setDialog(null);

      await Promise.all([load(), loadReturns()]);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const canCancel =
    order?.loai_don_hang === 'ONLINE' &&
    order?.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' &&
    ['CHO_DUYET', 'CHO_HANG', 'CHO_THANH_TOAN', 'CHO_DONG_GOI'].includes(
      order?.trang_thai_don_hang
    );

  const canReturn =
    order?.trang_thai_don_hang === 'HOAN_THANH' &&
    order?.trang_thai_thanh_toan === 'DA_THANH_TOAN' &&
    order?.trang_thai_xuat_kho === 'DA_XUAT_KHO';

  const waitingCod = isWaitingCodSettlement(order);

  const updateDialog = (key, value) => setDialog((current) => ({ ...current, [key]: value }));

  const openReturn = () => {
    setError('');

    setDialog({
      type: 'return',
      reason: '',
      note: '',
      method: 'CHUYEN_KHOAN',
      quantities: Object.fromEntries(
        (order.san_pham || []).map((item) => [item.chi_tiet_don_hang_id, 0])
      ),
    });
  };

  const submitDialog = () => {
    if (dialog.type === 'cancel') {
      const body = cancelAttempt.current?.body || {
        ly_do: dialog.reason.trim(),
      };

      return run(() =>
        withIdempotency(cancelAttempt, `customer-cancel:${order.id}`, body, (key, frozenBody) =>
          orderService.cancelOrder(order.id, frozenBody.ly_do, key)
        )
      );
    }

    const lines = (order.san_pham || [])
      .map((item) => ({
        chi_tiet_don_hang_id: item.chi_tiet_don_hang_id,
        so_luong: Number(dialog.quantities[item.chi_tiet_don_hang_id] || 0),
      }))
      .filter((item) => item.so_luong > 0);

    if (!lines.length) return;

    return run(() =>
      orderService.requestReturn(order.id, {
        ly_do_tra: dialog.reason.trim(),
        hinh_thuc_hoan_tien: dialog.method,
        ghi_chu: dialog.note.trim() || null,
        chi_tiet_tra: lines,
      })
    );
  };

  const returnQuantityValid =
    dialog?.type !== 'return' ||
    ((order?.san_pham || []).some(
      (item) => Number(dialog.quantities[item.chi_tiet_don_hang_id]) > 0
    ) &&
      (order?.san_pham || []).every((item) => {
        const quantity = Number(dialog.quantities[item.chi_tiet_don_hang_id] || 0);

        return Number.isInteger(quantity) && quantity >= 0 && quantity <= Number(item.so_luong);
      }));

  return (
    <div className="order-detail-page">
      <Header />

      <main className="customer-order-main">
        <div className="customer-order-heading">
          <div className="customer-order-container customer-order-heading-row">
            <button
              type="button"
              className="customer-order-button customer-order-button--back"
              onClick={() => navigate('/profile?tab=orders')}
            >
              <ArrowLeft size={16} aria-hidden="true" /> QUAY LẠI
            </button>
            <h1>CHI TIẾT ĐƠN HÀNG {order && <span>#{order.ma_don_hang}</span>}</h1>
            {order && (
              <>
                <span
                  className={
                    'customer-order-status' +
                    (!waitingCod && order.trang_thai_don_hang === 'HOAN_THANH'
                      ? ' is-complete'
                      : order.trang_thai_don_hang === 'HUY_HANG'
                        ? ' is-cancelled'
                        : '')
                  }
                >
                  {waitingCod
                    ? 'ĐÃ NHẬN HÀNG — ĐANG HOÀN TẤT ĐƠN'
                    : label(order.trang_thai_don_hang)}
                </span>

                <p className="customer-order-date">Ngày đặt: {formatDateTimeVN(order.ngay_tao)}</p>

                {order.tiep_nhan?.thong_bao && (
                  <p className="customer-order-date" role="status">
                    {order.tiep_nhan.thong_bao}
                  </p>
                )}

                {order.tiep_nhan?.ngay_hen_co_hang && (
                  <p className="customer-order-date">
                    Mốc cửa hàng hẹn có hàng: {formatDateTimeVN(order.tiep_nhan.ngay_hen_co_hang)}
                  </p>
                )}

                {order.tiep_nhan?.dieu_kien_noi_dung && (
                  <details className="customer-order-date">
                    <summary>Điều kiện đặt chờ đã đồng ý</summary>
                    <p>{order.tiep_nhan.dieu_kien_noi_dung}</p>
                    <small>{formatDateTimeVN(order.tiep_nhan.ngay_dong_y_cho_hang)}</small>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
        {order && (
          <div className="customer-order-progress-wrapper">
            <ol
              className="customer-order-container customer-order-progress"
              aria-label="Tiến trình đơn hàng"
            >
              {customerOrderProgress(order).map((step) => (
                <li
                  key={step.title}
                  className={`is-${step.state}`}
                  aria-current={step.state === 'active' ? 'step' : undefined}
                >
                  <span className="customer-order-step-icon" aria-hidden="true">
                    {step.state === 'done' ? (
                      <Check size={16} />
                    ) : step.state === 'active' ? (
                      <span />
                    ) : null}
                  </span>
                  <span>{step.title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="customer-order-container customer-order-content">
          {loading && (
            <p className="customer-order-message" role="status">
              Đang tải đơn hàng...
            </p>
          )}

          {error && (
            <p className="customer-order-message is-error" role="alert">
              {error}
            </p>
          )}

          {waitingCod && (
            <div className="customer-order-cod-notice" role="status">
              Bạn đã nhận hàng và thanh toán COD cho đối tác giao hàng. Cửa hàng đang đối soát khoản
              tiền này. Bạn không cần thanh toán lại.
            </div>
          )}

          {!loading && !order && (
            <button
              type="button"
              className="customer-order-button"
              onClick={() => navigate('/login')}
            >
              ĐĂNG NHẬP LẠI
            </button>
          )}

          {order && (
            <div className="customer-order-grid">
              <div className="customer-order-products">
                <section className="customer-order-card">
                  <h2 className="customer-order-card-title">SẢN PHẨM ĐẶT MUA</h2>
                  <table className="customer-order-table">
                    <thead>
                      <tr>
                        <th scope="col">Sản phẩm</th>
                        <th scope="col">Đơn giá</th>
                        <th scope="col">Số lượng</th>
                        <th scope="col">Khách trả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.san_pham || []).map((item) => (
                        <tr key={item.chi_tiet_don_hang_id}>
                          <td className="customer-order-product-cell">
                            <div className="customer-order-product-info">
                              <OrderProductImage item={item} />

                              <div>
                                <h3>{item.ten_san_pham || `Phiên bản #${item.phien_ban_id}`}</h3>

                                <OrderLineNotice item={item} />

                                <p>
                                  {item.loai_san_pham === 'BO_PC'
                                    ? 'Bộ PC'
                                    : `Phiên bản: ${item.ten_phien_ban || '—'}`}
                                </p>
                              </div>
                            </div>

                            {item.loai_san_pham === 'BO_PC' && (
                              <ComboContents items={item.thanh_phan || []} order compact />
                            )}
                          </td>
                          <td data-label="Đơn giá">{money(item.don_gia)}</td>
                          <td data-label="Số lượng">{item.so_luong}</td>
                          <td data-label="Khách trả" className="customer-order-line-total">
                            <OrderLineAmount item={item} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="customer-order-actions">
                    <p>
                      {canCancel
                        ? 'Bạn có thể hủy đơn trước khi đơn được xuất kho.'
                        : 'Đơn hàng hiện không còn đủ điều kiện hủy.'}
                    </p>
                    <div>
                      <button
                        type="button"
                        className="customer-order-button customer-order-button--cancel"
                        disabled={busy || !canCancel}
                        onClick={() => {
                          setError('');

                          setDialog({
                            type: 'cancel',
                            reason: cancelAttempt.current?.body?.ly_do || '',
                          });
                        }}
                      >
                        HỦY ĐƠN HÀNG
                      </button>
                      {canReturn && (
                        <button
                          type="button"
                          className="customer-order-button"
                          disabled={busy}
                          onClick={openReturn}
                        >
                          YÊU CẦU TRẢ HÀNG
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                <section className="customer-order-card">
                  <h2>THIẾT BỊ VÀ BẢO HÀNH</h2>
                  <SoldDevices order={order} />
                </section>

                <section className="customer-order-card customer-order-returns">
                  <h2>YÊU CẦU TRẢ HÀNG</h2>
                  {returnsError && (
                    <p role="alert">Không tải được yêu cầu trả hàng: {returnsError}</p>
                  )}
                  {returns.map((item) => (
                    <p key={item.id}>
                      <strong>{item.ma_tra_hang}</strong> ·{' '}
                      {returnLabels[item.trang_thai_tra_hang] || item.trang_thai_tra_hang} ·{' '}
                      {money(item.tong_tien_hoan)}
                    </p>
                  ))}
                  {!returnsError && returns.length === 0 && <p>Chưa có yêu cầu trả hàng.</p>}
                </section>
              </div>
              <aside className="customer-order-sidebar" aria-label="Thông tin và chi phí đơn hàng">
                <section>
                  <h2>THÔNG TIN NGƯỜI NHẬN</h2>
                  <dl>
                    <div>
                      <dt>Họ tên</dt>
                      <dd>{order.ten_nguoi_nhan || '—'}</dd>
                    </div>
                    <div>
                      <dt>Điện thoại</dt>
                      <dd>{order.sdt_nguoi_nhan || '—'}</dd>
                    </div>
                    <div>
                      <dt>Nhận hàng</dt>
                      <dd>{label(order.hinh_thuc_nhan_hang)}</dd>
                    </div>
                    {order.hinh_thuc_nhan_hang !== 'NHAN_TAI_CUA_HANG' && (
                      <div>
                        <dt>Địa chỉ</dt>
                        <dd>{order.dia_chi_giao_hang || '—'}</dd>
                      </div>
                    )}
                    {order.ghi_chu && (
                      <div>
                        <dt>Ghi chú</dt>
                        <dd>{order.ghi_chu}</dd>
                      </div>
                    )}
                  </dl>
                </section>
                <section>
                  <h2>THANH TOÁN</h2>
                  <dl>
                    <div>
                      <dt>Phương thức</dt>
                      <dd>{label(order.phuong_thuc_thanh_toan)}</dd>
                    </div>
                    <div>
                      <dt>Trạng thái</dt>
                      <dd>
                        <span
                          className={
                            'customer-order-payment' +
                            (waitingCod || order.trang_thai_thanh_toan === 'DA_THANH_TOAN'
                              ? ' is-paid'
                              : '')
                          }
                        >
                          {waitingCod
                            ? 'Đã thanh toán COD cho đối tác'
                            : label(order.trang_thai_thanh_toan)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Đóng gói</dt>
                      <dd>{label(order.trang_thai_dong_goi)}</dd>
                    </div>
                    <div>
                      <dt>Xuất kho</dt>
                      <dd>{label(order.trang_thai_xuat_kho)}</dd>
                    </div>
                  </dl>
                </section>
                <section>
                  <h2>KHUYẾN MẠI</h2>

                  <OrderPromotionSummary order={order} />
                </section>

                <section>
                  <h2>CHI PHÍ ĐƠN HÀNG</h2>

                  <dl>
                    <div>
                      <dt>Tạm tính</dt>
                      <dd>{money(order.tong_tien_hang)}</dd>
                    </div>

                    <div>
                      <dt>Phí vận chuyển</dt>
                      <dd>
                        {Number(order.phi_giao_hang) === 0
                          ? 'Miễn phí'
                          : money(order.phi_giao_hang)}
                      </dd>
                    </div>

                    <div>
                      <dt>Giảm giá</dt>
                      <dd>
                        {Number(order.tien_chiet_khau) > 0
                          ? `−${money(order.tien_chiet_khau)}`
                          : money(order.tien_chiet_khau)}
                      </dd>
                    </div>

                    <div>
                      <dt>VAT</dt>
                      <dd>{order.tong_tien_vat == null ? '—' : money(order.tong_tien_vat)}</dd>
                    </div>
                  </dl>

                  <div className="customer-order-grand-total">
                    <strong>TỔNG TIỀN</strong>
                    <strong>{money(order.tong_thanh_toan)}</strong>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>

      {dialog && (
        <OrderModal
          className="customer-order-dialog"
          showClose
          title={dialog.type === 'cancel' ? 'HỦY ĐƠN HÀNG' : 'YÊU CẦU TRẢ HÀNG'}
          busy={busy}
          close={() => setDialog(null)}
          submit={submitDialog}
          error={error}
          disabled={!dialog.reason.trim() || !returnQuantityValid}
        >
          {dialog.type === 'return' && (
            <>
              {(order.san_pham || []).map((item) => (
                <label className="order-operation-field" key={item.chi_tiet_don_hang_id}>
                  <span>
                    {item.ten_san_pham} · {item.ten_phien_ban}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={item.so_luong}
                    step="1"
                    value={dialog.quantities[item.chi_tiet_don_hang_id]}
                    onChange={(event) =>
                      updateDialog('quantities', {
                        ...dialog.quantities,
                        [item.chi_tiet_don_hang_id]: event.target.value,
                      })
                    }
                  />
                </label>
              ))}

              <label className="order-operation-field">
                <span>HÌNH THỨC HOÀN TIỀN</span>
                <select
                  value={dialog.method}
                  onChange={(event) => updateDialog('method', event.target.value)}
                >
                  <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                  <option value="TIEN_MAT">Tiền mặt</option>
                </select>
              </label>

              <label className="order-operation-field">
                <span>GHI CHÚ</span>
                <textarea
                  value={dialog.note}
                  onChange={(event) => updateDialog('note', event.target.value)}
                />
              </label>

              <p>Số lượng còn được trả và điều kiện trả hàng sẽ được kiểm tra khi gửi yêu cầu.</p>
            </>
          )}

          <label className="order-operation-field">
            <span>LÝ DO *</span>
            <textarea
              required
              maxLength={255}
              value={dialog.reason}
              disabled={busy || (dialog.type === 'cancel' && Boolean(cancelAttempt.current))}
              onChange={(event) => updateDialog('reason', event.target.value)}
            />
          </label>
        </OrderModal>
      )}

      <Footer />
    </div>
  );
}

function OrderProductImage({ item }) {
  const [failedUrl, setFailedUrl] = useState(null);
  return item.anh_dai_dien && failedUrl !== item.anh_dai_dien ? (
    <img
      className="customer-order-product-image"
      src={item.anh_dai_dien}
      alt={item.ten_san_pham}
      loading="lazy"
      onError={() => setFailedUrl(item.anh_dai_dien)}
    />
  ) : (
    <div className="customer-order-product-image customer-order-no-image">
      <ImageOff size={20} aria-hidden="true" />
      <span>Chưa có ảnh</span>
    </div>
  );
}
