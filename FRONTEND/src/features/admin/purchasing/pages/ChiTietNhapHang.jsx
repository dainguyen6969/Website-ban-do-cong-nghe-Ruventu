import { FormDropdown } from "../../../../shared/components/ui/FilterDropdown";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';

import { money, Modal, PageCrumb, PurchaseCard, StatusBadge } from './PurchaseShared';
import './NhapHang.css';

import OrderModal from '../../orders/components/OrderModal';
import SupplierCasePanel from '../components/SupplierCasePanel';
import PurchaseSourcePanel from '../../inventory/recall/PurchaseSourcePanel';
import DocumentPanel from '../../documents/DocumentPanel';

import {
  errorMessage,
  inputFromApiTime,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
  apiFieldErrors,
} from '../../../../shared/services/mutationUtils';

import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrder,
  getPurchaseReturnSerials,
  payPurchaseOrder,
  receivePurchaseOrder,
  receivePurchaseRefund,
  returnPurchaseOrder,
} from '../api/purchaseOrderApi';

const METHODS = [
  ['CHUYEN_KHOAN', 'Chuyển khoản'],
  ['TIEN_MAT', 'Tiền mặt'],
];

const RECEIVED_SERIAL_LABELS = {
  TRONG_KHO: 'Trong kho',
  DA_BAN: 'Đã bán',
  DANG_BAO_HANH: 'Đang bảo hành',
  LOI: 'Hàng lỗi',
  GIU_CHO_BAO_HANH: 'Giữ cho bảo hành',
  DA_THAY_THE_BAO_HANH: 'Đã thay thế bảo hành',
  DA_TRA_NCC: 'Đã trả Nhà Cung Cấp',
  DANG_GUI_NCC: 'Đang gửi Nhà Cung Cấp',
  DA_DOI_NCC: 'Đã đổi Nhà Cung Cấp',
};

const serialCodes = (value = '') =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

function receiptTextIssue(value, label) {
  const text = String(value || '').trim();

  if (text.length > 100) {
    return `${label} tối đa 100 ký tự.`;
  }

  if (/[\u0000-\u001F\u007F-\u009F]/.test(text)) {
    return `${label} không được chứa ký tự điều khiển.`;
  }

  return '';
}

function validateReceiptInputs(entries, document) {
  const errors = {};
  const seen = new Map();

  const documentIssue = receiptTextIssue(document, 'Mã chứng từ Nhà Cung Cấp');

  if (documentIssue) errors.document = documentIssue;

  if (!entries.some(({ quantity }) => quantity > 0)) {
    errors.form = 'Chọn ít nhất một dòng có số lượng nhận lớn hơn 0.';
  }

  for (const entry of entries) {
    const { item, quantity, codes, lot, locationUpdate } = entry;
    const prefix = String(item.id);

    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > item.qty - item.received) {
      errors[`${prefix}.quantity`] = `Số lượng nhận từ 0 đến ${item.qty - item.received}.`;
      continue;
    }

    if (quantity === 0) continue;

    const lotIssue = receiptTextIssue(lot, 'Mã lô Nhà Cung Cấp');
    const locationIssue = receiptTextIssue(locationUpdate, 'Vị trí lưu kho');

    if (lotIssue) errors[`${prefix}.lot`] = lotIssue;
    if (locationIssue) errors[`${prefix}.location`] = locationIssue;

    if (typeof item.serialManaged !== 'boolean') {
      errors[`${prefix}.serials`] = 'Phiên bản chưa có cấu hình quản lý serial.';
      continue;
    }

    if (!item.serialManaged) continue;

    if (codes.length !== quantity) {
      errors[`${prefix}.serials`] = `Cần ${quantity} serial; hiện có ${codes.length}.`;
    }

    for (const code of codes) {
      const issue = receiptTextIssue(code, 'Serial');

      if (issue) {
        errors[`${prefix}.serials`] ??= issue;
      }

      const key = code.toUpperCase();

      if (seen.has(key)) {
        const previousId = seen.get(key);
        const message = `Serial bị trùng trong lần nhập: ${code}`;

        errors[`${prefix}.serials`] ??= message;
        errors[`${previousId}.serials`] ??= message;
      } else {
        seen.set(key, prefix);
      }
    }
  }

  return errors;
}

function receiptErrorsFromApi(error, submittedItems) {
  const result = {};
  const fields = apiFieldErrors(error);

  const names = {
    so_serials: 'serials',
    soSerials: 'serials',
    so_luong_nhap_kho: 'quantity',
    soLuongNhapKho: 'quantity',
    ma_lo_ncc: 'lot',
    maLoNcc: 'lot',
    vi_tri_luu_kho: 'location',
    viTriLuuKho: 'location',
  };

  for (const [field, message] of Object.entries(fields)) {
    if (['ma_phieu_xuat_ncc', 'maPhieuXuatNcc'].includes(field)) {
      result.document = message;
      continue;
    }

    const match = /^items\[(\d+)\]\.([A-Za-z_]+)$/.exec(field);

    if (!match) continue;

    const item = submittedItems[Number(match[1])];
    const name = names[match[2]];

    if (item && name) {
      result[`${item.chi_tiet_don_nhap_id}.${name}`] = message;
    }
  }

  return result;
}

function ReceiptFieldError({ message }) {
  return message ? (
    <small className="receipt-field-error" role="alert">
      {message}
    </small>
  ) : null;
}

export default function ChiTietNhapHang() {
  const operationBusy = useRef(false);
  const purchaseAttempt = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [modal, setModal] = useState('');
  const [detailTab, setDetailTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [pageBusy, setBusy] = useState(false);
  const [nccLocked, setNccLocked] = useState(false);
  const [sourceLocked, setSourceLocked] = useState(false);
  const [documentLocked, setDocumentLocked] = useState(false);

  const busy = pageBusy || nccLocked || sourceLocked || documentLocked;

  const [error, setError] = useState('');
  const [serialValues, setSerialValues] = useState({});
  const pagination = useDetailTablePagination(order?.items);
  const [receiptQuantities, setReceiptQuantities] = useState({});

  const [supplierReceiptDocument, setSupplierReceiptDocument] = useState('');
  const [supplierLots, setSupplierLots] = useState({});

  const [receiptLocations, setReceiptLocations] = useState({});
  const [receiptServerErrors, setReceiptServerErrors] = useState({});

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
    if (operationBusy.current || nccLocked || sourceLocked || documentLocked) return;

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

    const savedItems = new Map(
      (pending?.body?.items || []).map((item) => [Number(item.chi_tiet_don_nhap_id), item])
    );

    setReceiptQuantities(
      Object.fromEntries(
        waitingReceipt.map((item) => [
          item.id,
          pending ? (savedItems.get(item.id)?.so_luong_nhap_kho ?? 0) : item.qty - item.received,
        ])
      )
    );

    setSerialValues(
      Object.fromEntries(
        waitingReceipt.map((item) => [
          item.id,
          savedItems.get(item.id)?.so_serials?.join('\n') || '',
        ])
      )
    );

    setSupplierReceiptDocument(pending?.body?.ma_phieu_xuat_ncc || '');

    setSupplierLots(
      Object.fromEntries(
        waitingReceipt.map((item) => [item.id, savedItems.get(item.id)?.ma_lo_ncc || ''])
      )
    );

    setReceiptLocations(
      Object.fromEntries(
        waitingReceipt.map((item) => [
          item.id,
          savedItems.get(item.id)?.vi_tri_luu_kho ?? item.storageLocation ?? '',
        ])
      )
    );

    setReceiptServerErrors({});
    setError('');
    setModal('receipt');
  };

  const receiptItems = waitingReceipt.map((item) => {
    const location = String(receiptLocations[item.id] || '').trim();
    const originalLocation = String(item.storageLocation || '').trim();

    return {
      item,
      quantity: Number(receiptQuantities[item.id] ?? 0),
      codes: item.serialManaged ? serialCodes(serialValues[item.id]) : [],
      lot: String(supplierLots[item.id] || '').trim(),
      locationUpdate: location && location !== originalLocation ? location : null,
    };
  });

  const receiptLocalErrors = validateReceiptInputs(receiptItems, supplierReceiptDocument);

  const receiptErrors = {
    ...receiptServerErrors,
    ...receiptLocalErrors,
  };

  const receiveValid = Object.keys(receiptLocalErrors).length === 0;

  const receiptLocked = busy || purchaseAttempt.current?.scope === receiptScope;

  const changeReceiptValue = (setter, itemId, value) => {
    if (receiptLocked) return;

    setter((current) => ({
      ...current,
      [itemId]: value,
    }));

    setReceiptServerErrors({});
    setError('');
  };

  const submitReceive = () =>
    run(async () => {
      const pending = purchaseAttempt.current;

      if (pending && pending.scope !== receiptScope) {
        throw new Error('Hãy xử lý thao tác đang chờ kết quả trước.');
      }

      if (!pending && !receiveValid) {
        throw new Error('Kiểm tra các trường được đánh dấu trong biểu mẫu.');
      }

      const body =
        pending?.scope === receiptScope
          ? pending.body
          : {
              kho_hang_id: order.warehouse.id,
              ma_phieu_xuat_ncc: supplierReceiptDocument.trim() || null,
              items: receiptItems
                .filter(({ quantity }) => quantity > 0)
                .map(({ item, quantity, codes, lot, locationUpdate }) => ({
                  chi_tiet_don_nhap_id: item.id,
                  ma_lo_ncc: lot || null,
                  so_luong_nhap_kho: quantity,
                  quan_ly_serial: item.serialManaged,
                  so_serials: codes,
                  vi_tri_luu_kho: locationUpdate,
                })),
            };

      setReceiptServerErrors({});

      try {
        return await withIdempotency(purchaseAttempt, receiptScope, body, (key, payload) =>
          receivePurchaseOrder(order.id, key, payload)
        );
      } catch (error) {
        setReceiptServerErrors(receiptErrorsFromApi(error, body.items));
        throw error;
      }
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
    <main className="purchase-page purchase-detail-page ruventu-ops">
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
              className="purchase-btn green purchase-btn--receive"
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
                TRẢ HÀNG TRỰC TIẾP
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

      <nav className="ops-tabs purchase-detail-tabs" aria-label="Nội dung đơn nhập">
        {[
          ['overview', 'Sản phẩm và nhập kho'],
          ['sources', 'Nguồn nhận'],
          ['cases', 'Hồ sơ Nhà Cung Cấp'],
          ['documents', 'Chứng từ'],
          ['money', 'Thanh toán và công nợ'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={detailTab === value ? 'is-active' : ''}
            aria-pressed={detailTab === value}
            disabled={busy}
            onClick={() => setDetailTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="purchase-detail-grid">
        <div className="purchase-detail-main">
          <section className="purchase-section" hidden={detailTab !== 'overview'}>
            <PurchaseCard title="SẢN PHẨM TRONG ĐƠN NHẬP">
              <table className="purchase-detail-table">
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
              </table>
              <DetailTablePagination
                totalItems={order.items.length}
                currentPage={pagination.currentPage}
                onPageChange={pagination.onPageChange}
                idPrefix="purchase-order-items"
              />
            </PurchaseCard>

            {(order.receivedSerials.length > 0 ||
              order.items.some((item) => item.serialManaged === true)) && (
              <PurchaseCard title="SERIAL ĐÃ NHẬN THEO ĐƠN NHẬP">
                <p className="purchase-received-serials__count">
                  {order.receivedSerials.length} mã serial đã tiếp nhận
                </p>
                <div className="purchase-received-serials">
                  <table className="purchase-received-serial-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>PHIÊN BẢN</th>
                        <th>SERIAL</th>
                        <th>TRẠNG THÁI HIỆN TẠI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!order.receivedSerials.length ? (
                        <tr>
                          <td colSpan={4}>Chưa có serial đã nhận.</td>
                        </tr>
                      ) : (
                        order.receivedSerials.map((serial, index) => (
                          <tr key={serial.id}>
                            <td>{index + 1}</td>
                            <td>{serial.name}</td>
                            <td>
                              <Link to={`/kho-hang/danh-sach-serial/${serial.id}`}>
                                {serial.code}
                              </Link>
                            </td>
                            <td>
                              <span>
                                {RECEIVED_SERIAL_LABELS[serial.status] || 'Chưa xác định'}
                              </span>
                              {serial.packingHeld && <small>Đang phân bổ đóng gói</small>}
                              {serial.recallBlocked && (
                                <small className="is-recall-blocked">Thuộc phạm vi thu hồi</small>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </PurchaseCard>
            )}

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
          </section>

          <section className="purchase-section" hidden={detailTab !== 'sources'}>
            <PurchaseSourcePanel
              order={order}
              locked={pageBusy || nccLocked || documentLocked || Boolean(modal)}
              onLockChange={setSourceLocked}
            />
          </section>

          <section className="purchase-section" hidden={detailTab !== 'cases'}>
            <SupplierCasePanel
              key={order.id}
              order={order}
              locked={
                pageBusy ||
                sourceLocked ||
                documentLocked ||
                Boolean(modal) ||
                Boolean(purchaseAttempt.current)
              }
              onRefresh={load}
              onLockChange={setNccLocked}
            />
          </section>

          <section className="purchase-section" hidden={detailTab !== 'documents'}>
            <DocumentPanel
              key={`purchase-${order.id}`}
              mode="purchase"
              id={order.id}
              locked={
                pageBusy ||
                sourceLocked ||
                nccLocked ||
                Boolean(modal) ||
                Boolean(purchaseAttempt.current)
              }
              onEditingChange={setDocumentLocked}
            />
          </section>

          <section className="purchase-section" hidden={detailTab !== 'money'}>
            <PurchaseCard title="THANH TOÁN NHÀ CUNG CẤP" className="purchase-finance-card">
              <div className="purchase-finance">
                <dl className="purchase-finance__rows">
                  <div>
                    <dt>GIÁ TRỊ ĐƠN BAN ĐẦU</dt>
                    <dd>{order.total == null ? 'Chưa xác định' : money(order.total)}</dd>
                  </div>

                  <div>
                    <dt>GIÁ TRỊ HÀNG ĐÃ TRẢ</dt>
                    <dd>
                      {order.returnedValue == null ? 'Chưa xác định' : money(order.returnedValue)}
                    </dd>
                  </div>

                  <div>
                    <dt>ĐIỀU CHỈNH QUA HỒ SƠ NHÀ CUNG CẤP</dt>
                    <dd>
                      {order.nccAdjustment == null ? 'Chưa xác định' : money(order.nccAdjustment)}
                    </dd>
                  </div>

                  <div className="purchase-finance__total">
                    <dt>GIÁ TRỊ ĐƠN SAU ĐIỀU CHỈNH</dt>
                    <dd>
                      {order.netOrderValue == null ? 'Chưa xác định' : money(order.netOrderValue)}
                    </dd>
                  </div>

                  <div>
                    <dt>TỔNG TIỀN ĐÃ CHI</dt>
                    <dd>{order.paid == null ? 'Chưa xác định' : money(order.paid)}</dd>
                  </div>

                  <div>
                    <dt>TỔNG TIỀN ĐÃ NHẬN HOÀN</dt>
                    <dd>{order.refunded == null ? 'Chưa xác định' : money(order.refunded)}</dd>
                  </div>

                  <div className="purchase-finance__paid">
                    <dt>ĐÃ THANH TOÁN SAU HOÀN TIỀN</dt>
                    <dd>{order.netPaid == null ? 'Chưa xác định' : money(order.netPaid)}</dd>
                  </div>
                </dl>

                <div
                  className={`purchase-finance__balance ${
                    order.debt == null
                      ? 'is-unknown'
                      : Number(order.debt) > 0
                        ? 'is-debt'
                        : 'is-clear'
                  }`}
                >
                  <span>CỬA HÀNG CÒN NỢ NHÀ CUNG CẤP</span>

                  <strong>{order.debt == null ? 'Chưa xác định' : money(order.debt)}</strong>
                </div>

                <div
                  className={`purchase-finance__balance ${
                    order.refundDue == null
                      ? 'is-unknown'
                      : Number(order.refundDue) > 0
                        ? 'is-refund'
                        : 'is-neutral'
                  }`}
                >
                  <span>NHÀ CUNG CẤP CÒN PHẢI HOÀN</span>

                  <strong>
                    {order.refundDue == null ? 'Chưa xác định' : money(order.refundDue)}
                  </strong>
                </div>

                <div className="purchase-finance__status">
                  <StatusBadge>{order.paymentStatusLabel}</StatusBadge>
                </div>
              </div>
            </PurchaseCard>
          </section>
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

          <div className="recall-receipt-metadata">
            <label>
              <span>Mã phiếu xuất/giao hàng của Nhà Cung Cấp</span>
              <input
                maxLength={100}
                disabled={receiptLocked}
                aria-invalid={Boolean(receiptErrors.document)}
                value={supplierReceiptDocument}
                onChange={(event) => {
                  setSupplierReceiptDocument(event.target.value);
                  setReceiptServerErrors({});
                  setError('');
                }}
              />
              <ReceiptFieldError message={receiptErrors.document} />
            </label>
          </div>

          <p className="receipt-config-note">
            Nhập số lượng thực nhận. Dòng chưa nhận để số lượng bằng 0.
          </p>

          {error && (
            <p className="receipt-error" role="alert">
              {error}
            </p>
          )}

          <ReceiptFieldError message={receiptErrors.form} />

          <div className="purchase-receive-list">
            {receiptItems.map(({ item, quantity, codes }) => {
              const fieldError = (name) => receiptErrors[`${item.id}.${name}`];

              return (
                <article
                  key={item.id}
                  className={'purchase-receive-item' + (quantity > 0 ? ' is-receiving' : '')}
                >
                  <header>
                    <strong>{item.name}</strong>
                    <span>
                      Đặt {item.qty} · Đã nhập {item.received}
                      {' · '}Còn {item.qty - item.received}
                    </span>
                  </header>

                  <div className="purchase-receive-fields">
                    <label className="receipt-field">
                      <span>Số lượng nhận lần này</span>
                      <input
                        type="number"
                        min="0"
                        max={item.qty - item.received}
                        step="1"
                        disabled={receiptLocked}
                        aria-invalid={Boolean(fieldError('quantity'))}
                        value={receiptQuantities[item.id] ?? 0}
                        onChange={(event) =>
                          changeReceiptValue(setReceiptQuantities, item.id, event.target.value)
                        }
                      />
                      <ReceiptFieldError message={fieldError('quantity')} />
                    </label>

                    <label className="receipt-field receipt-field--lot">
                      <span>
                        <b className="receipt-field-tag">LÔ</b>
                        Mã lô Nhà Cung Cấp
                      </span>
                      <input
                        maxLength={100}
                        placeholder="Mã in trên hàng hoặc chứng từ, nếu có"
                        disabled={receiptLocked || quantity === 0}
                        aria-invalid={Boolean(fieldError('lot'))}
                        value={supplierLots[item.id] || ''}
                        onChange={(event) =>
                          changeReceiptValue(setSupplierLots, item.id, event.target.value)
                        }
                      />
                      <ReceiptFieldError message={fieldError('lot')} />
                    </label>

                    <label className="receipt-field receipt-field--location">
                      <span>Vị trí lưu kho</span>
                      <input
                        maxLength={100}
                        placeholder="Ví dụ: Kệ A – Tầng 2 – Ô 03"
                        disabled={receiptLocked || quantity === 0}
                        aria-invalid={Boolean(fieldError('location'))}
                        value={receiptLocations[item.id] || ''}
                        onChange={(event) =>
                          changeReceiptValue(setReceiptLocations, item.id, event.target.value)
                        }
                      />
                      <small>Để trống giữ vị trí đang có của phiên bản.</small>
                      <ReceiptFieldError message={fieldError('location')} />
                    </label>

                    {item.serialManaged ? (
                      <label className="receipt-field purchase-receive-serials">
                        <span>
                          Serial thực nhận
                          <b className="receipt-serial-count">
                            {codes.length}/{quantity}
                          </b>
                        </span>
                        <textarea
                          rows={4}
                          disabled={receiptLocked || quantity === 0}
                          aria-invalid={Boolean(fieldError('serials'))}
                          value={serialValues[item.id] || ''}
                          onChange={(event) =>
                            changeReceiptValue(setSerialValues, item.id, event.target.value)
                          }
                          placeholder="Mỗi serial một dòng"
                        />
                        <ReceiptFieldError message={fieldError('serials')} />
                      </label>
                    ) : (
                      <p className="receipt-no-serial">Sản phẩm không quản lý serial.</p>
                    )}
                  </div>
                </article>
              );
            })}

          </div>

          {purchaseAttempt.current?.scope === receiptScope && (
            <p className="receipt-config-note">
              Chưa xác định kết quả lần gửi trước. Thử lại giữ nguyên dữ liệu và khóa chống gửi lặp.
            </p>
          )}

          <ModalActions
            busy={busy}
            onClose={() => {
              if (!operationBusy.current) setModal('');
            }}
            confirm={submitReceive}
            label={
              purchaseAttempt.current?.scope === receiptScope
                ? 'THỬ LẠI YÊU CẦU CŨ'
                : 'XÁC NHẬN NHẬP KHO'
            }
            color="green"
            disabled={!purchaseAttempt.current && !receiveValid}
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
            <FormDropdown aria-label="PHƯƠNG THỨC" value={form.method} onChange={(event) => change('method', event.target.value)}>
              {METHODS.map(([code, text]) => (
                <option key={code} value={code}>
                  {text}
                </option>
              ))}
            </FormDropdown>
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
