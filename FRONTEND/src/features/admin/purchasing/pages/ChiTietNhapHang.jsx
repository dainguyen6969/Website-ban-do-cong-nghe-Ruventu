import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';

import { money, Modal, PageCrumb, PurchaseCard, StatusBadge } from './PurchaseShared';
import './NhapHang.css';

import OrderModal from '../../orders/components/OrderModal';
import SupplierCasePanel from '../components/SupplierCasePanel';

import {
  errorMessage,
  inputFromApiTime,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';

import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrder,
  payPurchaseOrder,
  receivePurchaseOrder,
  receivePurchaseRefund,
  returnPurchaseOrder,
} from '../api/purchaseOrderApi';

const METHODS = [
  ['CHUYEN_KHOAN', 'Chuyển khoản'],
  ['TIEN_MAT', 'Tiền mặt'],
];
const serialCodes = (value = '') =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function ChiTietNhapHang() {
  const operationBusy = useRef(false);
  const purchaseAttempt = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [modal, setModal] = useState('');
  const [loading, setLoading] = useState(true);

  const [pageBusy, setBusy] = useState(false);
  const [nccLocked, setNccLocked] = useState(false);

  const busy = pageBusy || nccLocked;

  const [error, setError] = useState('');
  const [serialValues, setSerialValues] = useState({});
  const pagination = useDetailTablePagination(order?.items);
  const [receiptQuantities, setReceiptQuantities] = useState({});
  const load = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setOrder(await getPurchaseOrder(id, signal));
        setError('');
      } catch (reason) {
        if (reason.name !== 'AbortError') setError(reason.message);
      } finally {
        setLoading(false);
      }
    },
    [id]
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const totals = useMemo(() => {
    const items = order?.items || [];
    const ordered = items.reduce((sum, item) => sum + item.qty, 0);
    const received = items.reduce((sum, item) => sum + item.received, 0);
    const returned = items.reduce((sum, item) => sum + item.returned, 0);
    return {
      ordered,
      received,
      returned,
      waiting: Math.max(0, ordered - received),
      progress: ordered ? Math.round((received / ordered) * 100) : 0,
    };
  }, [order]);

  const run = async (request) => {
    if (operationBusy.current || nccLocked) return;

    operationBusy.current = true;
    setBusy(true);
    setError('');

    try {
      await request();
      setModal('');
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      operationBusy.current = false;
      setBusy(false);
    }
  };

  if (loading && !order)
    return (
      <main className="purchase-page">
        <p className="purchase-message">Đang tải chi tiết đơn nhập hàng...</p>
      </main>
    );
  if (!order)
    return (
      <main className="purchase-page">
        <p className="purchase-message error">{error || 'Không tìm thấy đơn nhập hàng.'}</p>
        <button className="purchase-btn outline" onClick={() => navigate('/kho-hang/nhap-hang')}>
          ‹ DANH SÁCH
        </button>
      </main>
    );

  const receiptScope = `purchase:${order.id}:receive`;

  const waitingReceipt = order.items.filter((item) => item.qty > item.received);

  const canReceive =
    ['DA_DUYET', 'NHAP_MOT_PHAN', 'HOAN_TRA_MOT_PHAN', 'HOAN_TRA_TOAN_BO'].includes(
      order.importStatus
    ) && waitingReceipt.length > 0;

  const openReceive = () => {
    if (busy || operationBusy.current) return;

    const pending = purchaseAttempt.current;

    if (pending && pending.scope !== receiptScope) {
      setError('Hãy xử lý thao tác đang chờ kết quả trước.');
      return;
    }

    if (waitingReceipt.some((item) => typeof item.serialManaged !== 'boolean')) {
      setError('Có phiên bản chưa có cấu hình quản lý serial.');
      return;
    }

    setReceiptQuantities(
      Object.fromEntries(
        waitingReceipt.map((item) => {
          const saved = pending?.body.items.find(
            (line) => Number(line.chi_tiet_don_nhap_id) === item.id
          );

          return [item.id, pending ? (saved?.so_luong_nhap_kho ?? 0) : item.qty - item.received];
        })
      )
    );

    setSerialValues(
      Object.fromEntries(
        waitingReceipt.map((item) => {
          const saved = pending?.body.items.find(
            (line) => Number(line.chi_tiet_don_nhap_id) === item.id
          );

          return [item.id, saved?.so_serials?.join('\n') || ''];
        })
      )
    );

    setError('');
    setModal('receipt');
  };

  const receiptItems = waitingReceipt.map((item) => ({
    item,
    quantity: Number(receiptQuantities[item.id] ?? 0),
    codes: item.serialManaged ? serialCodes(serialValues[item.id]) : [],
  }));

  const receiptCodes = receiptItems
    .filter(({ quantity }) => quantity > 0)
    .flatMap(({ codes }) => codes);

  const receiveValid =
    receiptItems.some(({ quantity }) => quantity > 0) &&
    receiptItems.every(
      ({ item, quantity, codes }) =>
        typeof item.serialManaged === 'boolean' &&
        Number.isSafeInteger(quantity) &&
        quantity >= 0 &&
        quantity <= item.qty - item.received &&
        (quantity === 0 || !item.serialManaged || codes.length === quantity) &&
        codes.every((code) => code.length <= 100)
    ) &&
    new Set(receiptCodes.map((code) => code.toUpperCase())).size === receiptCodes.length;

  const receiptLocked = busy || purchaseAttempt.current?.scope === receiptScope;

  const submitReceive = () =>
    run(() => {
      const pending = purchaseAttempt.current;

      if (!pending && !receiveValid) {
        throw new Error('Số lượng nhập hoặc danh sách serial chưa hợp lệ.');
      }

      const body =
        pending?.scope === receiptScope
          ? pending.body
          : {
              kho_hang_id: order.warehouse.id,
              items: receiptItems
                .filter(({ quantity }) => quantity > 0)
                .map(({ item, quantity, codes }) => ({
                  chi_tiet_don_nhap_id: item.id,
                  so_luong_nhap_kho: quantity,
                  quan_ly_serial: item.serialManaged,
                  so_serials: codes,
                })),
            };

      return withIdempotency(purchaseAttempt, receiptScope, body, (key, payload) =>
        receivePurchaseOrder(order.id, key, payload)
      );
    });

  const returnable = order.items.filter(
    (item) => (item.legacyReturnLimit ?? item.received - item.returned) > 0
  );

  const savePurchaseOperation = (kind, buildBody) =>
    run(() => {
      const scope = `purchase:${order.id}:${kind}`;
      const pending = purchaseAttempt.current;

      const body = pending?.scope === scope ? pending.body : buildBody();
      return withIdempotency(
        purchaseAttempt,
        `purchase:${order.id}:${kind}`,
        body,
        (key, payload) => {
          switch (kind) {
            case 'payment':
              return payPurchaseOrder(order.id, key, payload);

            case 'return':
              return returnPurchaseOrder(order.id, key, payload);

            case 'refund':
              return receivePurchaseRefund(order.id, key, payload);

            default:
              throw new Error('Nghiệp vụ nhập hàng không hợp lệ.');
          }
        }
      );
    });

  const approved = !['DAT_HANG', 'HUY'].includes(order.importStatus);

  return (
    <main className="purchase-page purchase-detail-page">
      <div className="purchase-heading purchase-detail-heading">
        <div>
          <PageCrumb tail={order.code} />
          <div className="purchase-title-badges">
            <h1>{order.code}</h1>
            <StatusBadge>{order.importStatusLabel}</StatusBadge>
            <StatusBadge>{order.paymentStatusLabel}</StatusBadge>
          </div>
          <p>{order.createdAtLabel}</p>
        </div>
        <div className="purchase-heading-actions">
          {order.importStatus === 'DAT_HANG' && (
            <>
              <button
                className="purchase-btn outline"
                onClick={() => navigate(`/kho-hang/nhap-hang/tao-moi?edit=${order.id}`)}
              >
                − CHỈNH SỬA
              </button>
              <button className="purchase-btn blue" onClick={() => setModal('approve')}>
                DUYỆT ĐƠN
              </button>
              <button className="purchase-btn red-outline" onClick={() => setModal('cancel')}>
                HỦY ĐƠN
              </button>
            </>
          )}
          {approved && order.debt > 0 && (
            <button
              type="button"
              className="purchase-btn black"
              disabled={busy}
              onClick={() => {
                setError('');
                setModal('payment');
              }}
            >
              THANH TOÁN
            </button>
          )}
          {canReceive && (
            <button
              type="button"
              className="purchase-btn green"
              disabled={busy}
              onClick={openReceive}
            >
              NHẬP KHO
            </button>
          )}
          {['NHAP_MOT_PHAN', 'DA_NHAP_KHO', 'HOAN_TRA_MOT_PHAN'].includes(order.importStatus) &&
            returnable.length > 0 && (
              <button
                type="button"
                className="purchase-btn orange-outline"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setModal('return');
                }}
              >
                HOÀN TRẢ NHÀ CUNG CẤP
              </button>
            )}

          {order.refundDue > 0 && (
            <button
              type="button"
              className="purchase-btn green"
              disabled={busy}
              onClick={() => {
                setError('');
                setModal('refund');
              }}
            >
              NHẬN TIỀN NHÀ CUNG CẤP HOÀN
            </button>
          )}
          <button className="purchase-btn outline" onClick={() => navigate('/kho-hang/nhap-hang')}>
            ‹ DANH SÁCH
          </button>
        </div>
      </div>
      {error && <p className="purchase-message error">{error}</p>}
      <div className="purchase-detail-grid">
        <div className="purchase-detail-main">
          <PurchaseCard title="SẢN PHẨM TRONG ĐƠN NHẬP">
            <div className="admin-table-scroll admin-table-scroll--embedded" tabIndex={0} role="region" aria-label="Bảng dữ liệu liên quan"><table className="purchase-detail-table admin-data-table admin-data-table--records">
              <thead>
                <tr>
                  <th>PHIÊN BẢN</th>
                  <th>SL ĐẶT</th>
                  <th>ĐƠN GIÁ NHẬP</th>
                  <th>THÀNH TIỀN</th>
                  <th>ĐÃ NHẬP</th>
                  <th>ĐÃ TRẢ</th>
                </tr>
              </thead>
              <tbody>
                {pagination.visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.qty}</td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.lineTotal)}</td>
                    <td className="received">
                      {item.received} <span>/ {item.qty}</span>
                    </td>
                    <td>{item.returned}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <DetailTablePagination
              totalItems={order.items.length}
              currentPage={pagination.currentPage}
              onPageChange={pagination.onPageChange}
              idPrefix="purchase-order-items"
            />
          </PurchaseCard>

          <SupplierCasePanel
            key={order.id}
            order={order}
            locked={pageBusy || Boolean(modal) || Boolean(purchaseAttempt.current)}
            onRefresh={load}
            onLockChange={setNccLocked}
          />

          <PurchaseCard title="TIẾN ĐỘ NHẬP KHO">
            <div className="progress-line">
              <div style={{ width: `${totals.progress}%` }} />
              <span>{totals.progress}%</span>
            </div>
            <div className="progress-stats">
              <div>
                <b>{totals.ordered}</b>
                <span>TỔNG ĐẶT</span>
              </div>
              <div className="orange-text">
                <b>{totals.received}</b>
                <span>ĐÃ NHẬP</span>
              </div>
              <div>
                <b>{totals.returned}</b>
                <span>ĐÃ TRẢ NHÀ CUNG CẤP</span>
              </div>
              <div>
                <b>{totals.waiting}</b>
                <span>CÒN CHỜ</span>
              </div>
            </div>
          </PurchaseCard>
          <PurchaseCard title="THANH TOÁN NHÀ CUNG CẤP">
            <div className="detail-payment">
              <span>GIÁ TRỊ ĐƠN BAN ĐẦU</span>
              <b>{money(order.total)}</b>

              <span>GIÁ TRỊ TRẢ THEO LẦN CŨ</span>
              <b>{order.returnedValue == null ? '—' : money(order.returnedValue)}</b>

              <span>ĐIỀU CHỈNH QUA HỒ SƠ NHÀ CUNG CẤP</span>
              <b>{order.nccAdjustment == null ? '—' : money(order.nccAdjustment)}</b>

              <span>NGHĨA VỤ SAU ĐIỀU CHỈNH</span>
              <b>{order.netOrderValue == null ? '—' : money(order.netOrderValue)}</b>

              <span>TỔNG TIỀN ĐÃ CHI</span>
              <b>{order.paid == null ? '—' : money(order.paid)}</b>

              <span>TỔNG TIỀN ĐÃ NHẬN HOÀN</span>
              <b>{order.refunded == null ? '—' : money(order.refunded)}</b>

              <span>ĐÃ THANH TOÁN THUẦN</span>
              <b>{order.netPaid == null ? '—' : money(order.netPaid)}</b>

              <span>CỬA HÀNG CÒN NỢ NHÀ CUNG CẤP</span>
              <b>{order.debt == null ? '—' : money(order.debt)}</b>

              <span>NHÀ CUNG CẤP CÒN PHẢI HOÀN</span>
              <b>{order.refundDue == null ? '—' : money(order.refundDue)}</b>
            </div>
          </PurchaseCard>
        </div>
        <aside className="purchase-detail-side">
          <PurchaseCard title="NHÀ CUNG CẤP">
            <InfoRows
              rows={[
                ['MÃ NHÀ CUNG CẤP', order.supplier.code],
                ['TÊN NHÀ CUNG CẤP', order.supplier.name],
                ['SỐ ĐIỆN THOẠI', order.supplier.phone],
                ['EMAIL', order.supplier.email],
                ['ĐỊA CHỈ', order.supplier.address],
              ]}
            />
          </PurchaseCard>
          <PurchaseCard title="KHO NHẬP">
            <InfoRows
              rows={[
                ['MÃ KHO', order.warehouse.code],
                ['TÊN KHO', order.warehouse.name],
              ]}
            />
          </PurchaseCard>
          <PurchaseCard title="TRẠNG THÁI ĐƠN">
            <div className="status-info">
              <span>TRẠNG THÁI NHẬP</span>
              <StatusBadge>{order.importStatusLabel}</StatusBadge>
              <span>THANH TOÁN NHÀ CUNG CẤP</span>
              <StatusBadge>{order.paymentStatusLabel}</StatusBadge>
              {approved && <p>ĐƠN ĐÃ DUYỆT – KHÔNG THỂ CHỈNH SỬA</p>}
              {order.importStatus === 'HUY' && (
                <p className="cancel-note">ĐƠN ĐÃ HỦY – LƯU LÀM LỊCH SỬ</p>
              )}
            </div>
          </PurchaseCard>
        </aside>
      </div>

      {modal === 'approve' && (
        <Modal onClose={() => setModal('')}>
          <h2>XÁC NHẬN DUYỆT ĐƠN</h2>
          <InfoRows
            rows={[
              ['MÃ ĐƠN', order.code],
              ['NHÀ CUNG CẤP', order.supplier.name],
              ['KHO', order.warehouse.name],
              ['TỔNG', money(order.total)],
            ]}
          />
          <p className="modal-note success">Sau khi duyệt, sản phẩm, số lượng và giá sẽ bị khóa.</p>
          <ModalActions
            busy={busy}
            onClose={() => setModal('')}
            confirm={() => run(() => approvePurchaseOrder(order.id))}
            label="XÁC NHẬN DUYỆT"
            color="blue"
          />
        </Modal>
      )}
      {modal === 'cancel' && (
        <Modal onClose={() => setModal('')} className="danger-modal">
          <h2>HỦY ĐƠN NHẬP HÀNG</h2>
          <p>
            Bạn có chắc muốn hủy đơn <b>{order.code}</b>?
          </p>
          <ModalActions
            busy={busy}
            onClose={() => setModal('')}
            confirm={() => run(() => cancelPurchaseOrder(order.id))}
            label="XÁC NHẬN HỦY"
            color="red"
            cancelLabel="ĐỂ SAU"
          />
        </Modal>
      )}
      {modal === 'receipt' && (
        <Modal
          className="receipt-modal"
          onClose={() => {
            if (!operationBusy.current) setModal('');
          }}
        >
          <h2>NHẬP HÀNG THỰC TẾ VÀO KHO</h2>

          <p>
            {order.code} · Kho: <strong>{order.warehouse.name}</strong>
          </p>

          <p className="receipt-config-note">
            Có thể nhập từng phần. Để số lượng bằng 0 đối với dòng chưa nhận.
          </p>

          {error && (
            <p className="receipt-error" role="alert">
              {error}
            </p>
          )}

          <div className="return-table-scroll">
            <div className="admin-table-scroll admin-table-scroll--embedded" tabIndex={0} role="region" aria-label="Bảng dữ liệu liên quan"><table className="receipt-table admin-data-table admin-data-table--records">
              <thead>
                <tr>
                  <th>PHIÊN BẢN</th>
                  <th>ĐÃ ĐẶT</th>
                  <th>ĐÃ NHẬP</th>
                  <th>CÒN NHẬP</th>
                  <th>NHẬP LẦN NÀY</th>
                  <th>SERIAL</th>
                </tr>
              </thead>

              <tbody>
                {waitingReceipt.map((item) => {
                  const quantity = Number(receiptQuantities[item.id] ?? 0);
                  const codes = serialCodes(serialValues[item.id]);

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.qty}</td>
                      <td>{item.received}</td>
                      <td>{item.qty - item.received}</td>
                      <td>
                        <input
                          aria-label={`Số lượng nhập ${item.name}`}
                          className="purchase-receive-quantity"
                          type="number"
                          min="0"
                          max={item.qty - item.received}
                          step="1"
                          disabled={receiptLocked}
                          value={receiptQuantities[item.id] ?? 0}
                          onChange={(event) =>
                            setReceiptQuantities((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        {item.serialManaged ? (
                          <div className="receipt-serial-input">
                            <textarea
                              disabled={receiptLocked || quantity === 0}
                              value={serialValues[item.id] || ''}
                              onChange={(event) =>
                                setSerialValues((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder="Mỗi serial một dòng"
                            />
                            <small>
                              Đã nhập {codes.length}/{quantity} serial
                            </small>
                          </div>
                        ) : (
                          'Không quản lý serial'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>

          {purchaseAttempt.current?.scope === receiptScope && (
            <p className="receipt-config-note">
              Chưa xác định kết quả lần gửi trước. Thử lại sẽ giữ nguyên dữ liệu và khóa chống gửi
              lặp.
            </p>
          )}

          <ModalActions
            busy={busy}
            onClose={() => {
              if (!operationBusy.current) setModal('');
            }}
            confirm={submitReceive}
            label="XÁC NHẬN NHẬP KHO"
            color="green"
            disabled={!receiveValid}
          />
        </Modal>
      )}
      {['payment', 'return', 'refund'].includes(modal) && (
        <PurchaseOperationDialog
          key={`${order.id}:${modal}`}
          kind={modal}
          order={order}
          returnable={returnable}
          attempt={purchaseAttempt.current}
          busy={busy}
          error={error}
          close={() => {
            if (!operationBusy.current) {
              setModal('');
              setError('');
            }
          }}
          submit={(buildBody) => savePurchaseOperation(modal, buildBody)}
        />
      )}
    </main>
  );
}
function InfoRows({ rows }) {
  return (
    <dl className="info-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
function ModalActions({
  onClose,
  confirm,
  label,
  color = 'black',
  cancelLabel = 'HỦY BỎ',
  disabled,
  busy,
}) {
  return (
    <div className="modal-actions">
      <button className="purchase-btn outline" onClick={onClose}>
        {cancelLabel}
      </button>
      <button className={`purchase-btn ${color}`} onClick={confirm} disabled={disabled || busy}>
        {busy ? 'ĐANG XỬ LÝ...' : label}
      </button>
    </div>
  );
}

function PurchaseOperationDialog({ kind, order, returnable, attempt, busy, error, close, submit }) {
  const scope = `purchase:${order.id}:${kind}`;
  const previous = attempt?.scope === scope ? attempt.body : null;

  const [form, setForm] = useState(() => ({
    amount: previous?.so_tien_thanh_toan ?? '',

    method: previous?.phuong_thuc_thanh_toan || previous?.phuong_thuc_hoan || 'CHUYEN_KHOAN',

    occurredAt: previous
      ? inputFromApiTime(previous.ngay_thanh_toan || previous.ngay_nhan_tien)
      : nowLocalInput(),

    transaction: previous?.ma_giao_dich || '',
    note: previous?.ghi_chu || '',
    reason: previous?.ly_do || '',

    confirmed: Boolean(previous?.xac_nhan_da_chi_tien || previous?.xac_nhan_da_nhan_tien),

    quantities: Object.fromEntries(
      returnable.map((item) => {
        const saved = previous?.items?.find(
          (line) => Number(line.chi_tiet_don_nhap_id) === item.id
        );

        return [item.id, saved?.so_luong_tra ?? 0];
      })
    ),

    defects: Object.fromEntries(
      returnable.map((item) => {
        const saved = previous?.items?.find(
          (line) => Number(line.chi_tiet_don_nhap_id) === item.id
        );

        return [item.id, saved?.so_luong_loi ?? 0];
      })
    ),

    serialSelections: Object.fromEntries(
      returnable.map((item) => {
        const saved = previous?.items?.find(
          (line) => Number(line.chi_tiet_don_nhap_id) === item.id
        );

        return [item.id, (saved?.so_serial_ids || []).map(Number)];
      })
    ),
  }));

  const [serialCandidates, setSerialCandidates] = useState({});
  const [serialLoadErrors, setSerialLoadErrors] = useState({});

  const returning = kind === 'return';
  const paying = kind === 'payment';

  const serialLineKey = JSON.stringify(
    returning
      ? returnable
          .filter((item) => item.serialManaged === true)
          .map((item) => item.id)
          .sort((a, b) => a - b)
      : []
  );

  useEffect(() => {
    const ids = JSON.parse(serialLineKey);
    if (!ids.length) return undefined;

    const controller = new AbortController();
    setSerialCandidates({});
    setSerialLoadErrors({});

    Promise.all(
      ids.map(async (detailId) => {
        try {
          const items = await getPurchaseReturnSerials(order.id, detailId, controller.signal);

          return { detailId, items };
        } catch (reason) {
          if (controller.signal.aborted) return null;

          return {
            detailId,
            error: errorMessage(reason),
          };
        }
      })
    ).then((results) => {
      if (controller.signal.aborted) return;

      const candidates = {};
      const errors = {};

      results.filter(Boolean).forEach((result) => {
        if (result.error) errors[result.detailId] = result.error;
        else candidates[result.detailId] = result.items || [];
      });

      setSerialCandidates(candidates);
      setSerialLoadErrors(errors);
    });

    return () => controller.abort();
  }, [order.id, serialLineKey]);

  const change = (key, value) => {
    if (busy || previous) return;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectedItems = returnable
    .map((item) => {
      if (item.serialManaged === true) {
        const ids = (form.serialSelections[item.id] || []).map(Number);
        const candidates = serialCandidates[item.id] || [];

        return {
          chi_tiet_don_nhap_id: item.id,
          so_luong_tra: ids.length,
          so_luong_loi: candidates.filter(
            (serial) => ids.includes(Number(serial.id)) && serial.trang_thai === 'LOI'
          ).length,
          so_serial_ids: ids,
        };
      }

      return {
        chi_tiet_don_nhap_id: item.id,
        so_luong_tra: Number(form.quantities[item.id] || 0),
        so_luong_loi: Number(form.defects[item.id] || 0),
        so_serial_ids: [],
      };
    })
    .filter((item) => item.so_luong_tra > 0);

  const quantitiesValid = returnable.every((item) => {
    if (typeof item.serialManaged !== 'boolean') return false;

    if (item.serialManaged) {
      const ids = (form.serialSelections[item.id] || []).map(Number);
      const candidates = serialCandidates[item.id] || [];

      return (
        ids.length <= (item.legacyReturnLimit ?? item.received - item.returned) &&
        new Set(ids).size === ids.length &&
        ids.every((id) => candidates.some((serial) => Number(serial.id) === id))
      );
    }

    const quantity = Number(form.quantities[item.id] || 0);
    const defect = Number(form.defects[item.id] || 0);

    return (
      Number.isSafeInteger(quantity) &&
      Number.isSafeInteger(defect) &&
      quantity >= 0 &&
      quantity <= (item.legacyReturnLimit ?? item.received - item.returned) &&
      defect >= 0 &&
      defect <= quantity
    );
  });

  const receivingRefund = kind === 'refund';

  const moneyFieldsValid = Boolean(
    form.occurredAt &&
    METHODS.some(([code]) => code === form.method) &&
    (form.method === 'TIEN_MAT' || form.transaction.trim())
  );

  const valid = previous
    ? true
    : returning
      ? Boolean(
          form.reason.trim() &&
          selectedItems.length > 0 &&
          quantitiesValid &&
          (!form.confirmed || moneyFieldsValid)
        )
      : Boolean(
          form.confirmed &&
          moneyFieldsValid &&
          (paying
            ? Number(form.amount) > 0 && Number(form.amount) <= Number(order.debt)
            : receivingRefund && Number(order.refundDue) > 0)
        );

  const showMoneyFields = !returning || form.confirmed;

  const buildBody = () => {
    if (previous) return previous;
    if (paying) {
      return {
        so_tien_thanh_toan: Number(form.amount),
        phuong_thuc_thanh_toan: form.method,
        ngay_thanh_toan: toApiDateTime(form.occurredAt),
        xac_nhan_da_chi_tien: true,
        ma_giao_dich: form.method === 'TIEN_MAT' ? null : form.transaction.trim(),
        ghi_chu: form.note.trim() || null,
      };
    }

    const refundFields = {
      xac_nhan_da_nhan_tien: form.confirmed,
      phuong_thuc_hoan: form.confirmed ? form.method : null,
      ngay_nhan_tien: form.confirmed ? toApiDateTime(form.occurredAt) : null,
      ma_giao_dich: form.confirmed && form.method !== 'TIEN_MAT' ? form.transaction.trim() : null,
      ghi_chu: form.note.trim() || null,
    };

    if (returning) {
      return {
        items: selectedItems,
        ly_do: form.reason.trim(),
        ...refundFields,
      };
    }

    return {
      ...refundFields,
      xac_nhan_da_nhan_tien: true,
    };
  };

  const title = paying
    ? 'THANH TOÁN NHÀ CUNG CẤP'
    : returning
      ? 'HOÀN TRẢ NHÀ CUNG CẤP'
      : 'NHẬN TIỀN NHÀ CUNG CẤP HOÀN';

  return (
    <OrderModal
      title={title}
      busy={busy}
      close={close}
      submit={() => submit(buildBody)}
      error={error}
      disabled={!valid}
      confirmLabel={
        paying
          ? 'XÁC NHẬN THANH TOÁN'
          : returning
            ? 'XÁC NHẬN TRẢ HÀNG'
            : 'XÁC NHẬN ĐÃ NHẬN TIỀN HOÀN'
      }
    >
      <p>
        {order.code} · {order.supplier.name}
      </p>

      {paying && (
        <label className="order-operation-field">
          <span>SỐ TIỀN THANH TOÁN (đ)</span>
          <input
            required
            type="number"
            min="0.01"
            max={order.debt}
            step="0.01"
            value={form.amount}
            onChange={(event) => change('amount', event.target.value)}
          />
          <small>Còn nợ: {money(order.debt)}</small>
        </label>
      )}

      {kind === 'refund' && <p>Nhà cung cấp còn phải hoàn: {money(order.refundDue)}</p>}

      {returning && (
        <>
          {returnable.map((item) => {
            const candidates = serialCandidates[item.id];
            const selected = form.serialSelections[item.id] || [];

            return (
              <div className="purchase-return-line" key={item.id}>
                <strong>{item.name}</strong>
                <small>
                  Còn có thể trả: {item.legacyReturnLimit ?? item.received - item.returned}
                </small>

                {item.serialManaged ? (
                  <>
                    {serialLoadErrors[item.id] && (
                      <p className="receipt-error">{serialLoadErrors[item.id]}</p>
                    )}

                    {!candidates && !serialLoadErrors[item.id] && <p>Đang tải serial...</p>}

                    {candidates?.length === 0 && (
                      <p className="receipt-config-note">
                        Chưa có serial đủ điều kiện. Với dữ liệu cũ, cần đối soát liên kết serial
                        với đơn nhập gốc.
                      </p>
                    )}

                    <div className="purchase-return-serials">
                      {(candidates || []).map((serial) => {
                        const serialId = Number(serial.id);
                        const checked = selected.includes(serialId);

                        return (
                          <label key={serialId}>
                            <input
                              type="checkbox"
                              disabled={busy || Boolean(previous)}
                              checked={checked}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...selected, serialId]
                                  : selected.filter((id) => id !== serialId);

                                change('serialSelections', {
                                  ...form.serialSelections,
                                  [item.id]: next,
                                });
                              }}
                            />
                            <span>{serial.so_serial}</span>
                            <small>{serial.trang_thai === 'LOI' ? 'Hàng lỗi' : 'Trong kho'}</small>
                          </label>
                        );
                      })}
                    </div>

                    <p>Đã chọn {selected.length} serial trả.</p>
                  </>
                ) : (
                  <div className="purchase-return-quantities">
                    <label className="order-operation-field">
                      <span>SỐ LƯỢNG TRẢ</span>
                      <input
                        type="number"
                        min="0"
                        max={item.legacyReturnLimit ?? item.received - item.returned}
                        step="1"
                        disabled={busy || Boolean(previous)}
                        value={form.quantities[item.id]}
                        onChange={(event) =>
                          change('quantities', {
                            ...form.quantities,
                            [item.id]: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="order-operation-field">
                      <span>TRONG ĐÓ HÀNG LỖI</span>
                      <input
                        type="number"
                        min="0"
                        max={Number(form.quantities[item.id] || 0)}
                        step="1"
                        disabled={busy || Boolean(previous)}
                        value={form.defects[item.id]}
                        onChange={(event) =>
                          change('defects', {
                            ...form.defects,
                            [item.id]: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}

          <label className="order-operation-field">
            <span>LÝ DO TRẢ *</span>
            <textarea
              required
              value={form.reason}
              onChange={(event) => change('reason', event.target.value)}
            />
          </label>
        </>
      )}

      <label className="order-operation-confirm">
        <input
          type="checkbox"
          checked={form.confirmed}
          onChange={(event) => change('confirmed', event.target.checked)}
        />
        {paying
          ? 'Xác nhận cửa hàng đã chi tiền cho nhà cung cấp'
          : 'Xác nhận cửa hàng đã nhận tiền nhà cung cấp hoàn'}
      </label>

      {showMoneyFields && (
        <>
          <label className="order-operation-field">
            <span>PHƯƠNG THỨC</span>
            <select value={form.method} onChange={(event) => change('method', event.target.value)}>
              {METHODS.map(([code, text]) => (
                <option key={code} value={code}>
                  {text}
                </option>
              ))}
            </select>
          </label>

          <label className="order-operation-field">
            <span>{paying ? 'THỜI ĐIỂM CHI TIỀN' : 'THỜI ĐIỂM NHẬN TIỀN'}</span>
            <input
              required
              type="datetime-local"
              value={form.occurredAt}
              onChange={(event) => change('occurredAt', event.target.value)}
            />
          </label>

          {form.method !== 'TIEN_MAT' && (
            <label className="order-operation-field">
              <span>MÃ GIAO DỊCH</span>
              <input
                required
                maxLength={2555}
                pattern=".*\S.*"
                value={form.transaction}
                onChange={(event) => change('transaction', event.target.value)}
              />
            </label>
          )}
        </>
      )}

      <label className="order-operation-field">
        <span>GHI CHÚ</span>
        <textarea value={form.note} onChange={(event) => change('note', event.target.value)} />
      </label>

      {!paying && (
        <p>
          Số tiền hoàn do hệ thống xác định. Nhận tiền hoàn sau đó không thực hiện trả hàng lần nữa.
        </p>
      )}
    </OrderModal>
  );
}
