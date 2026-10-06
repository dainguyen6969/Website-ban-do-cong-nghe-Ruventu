import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DetailTablePagination from "../../../../shared/components/ui/DetailTablePagination";
import useDetailTablePagination from "../../../../hooks/useDetailTablePagination";

import {
  money,
  Modal,
  PageCrumb,
  PurchaseCard,
  StatusBadge,
} from "./PurchaseShared";
import "./NhapHang.css";

import OrderModal from "../../orders/components/OrderModal";

import {
  errorMessage,
  inputFromApiTime,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
} from "../../../../shared/services/mutationUtils";

import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrder,
  payPurchaseOrder,
  receivePurchaseOrder,
  receivePurchaseRefund,
  returnPurchaseOrder,
} from "../api/purchaseOrderApi";

const METHODS = [
  ["CHUYEN_KHOAN", "Chuyển khoản"],
  ["TIEN_MAT", "Tiền mặt"],
];
const serialCodes = (value = "") =>
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
  const [modal, setModal] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [serialModes, setSerialModes] = useState({});
  const [serialValues, setSerialValues] = useState({});
  const [serialPrefix, setSerialPrefix] = useState("");
  const [locations, setLocations] = useState({});
  const pagination = useDetailTablePagination(order?.items);
  const load = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setOrder(await getPurchaseOrder(id, signal));
        setError("");
      } catch (reason) {
        if (reason.name !== "AbortError") setError(reason.message);
      } finally {
        setLoading(false);
      }
    },
    [id],
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
    if (operationBusy.current) return;

    operationBusy.current = true;
    setBusy(true);
    setError("");

    try {
      await request();
      setModal("");
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
        <p className="purchase-message error">
          {error || "Không tìm thấy đơn nhập hàng."}
        </p>
        <button
          className="purchase-btn outline"
          onClick={() => navigate("/kho-hang/nhap-hang")}
        >
          ‹ DANH SÁCH
        </button>
      </main>
    );

  const openReceive = () => {
    setSerialModes(
      Object.fromEntries(
        order.items.map((item) => [
          item.id,
          item.serialModeEstablished ? String(item.serialManaged) : "",
        ]),
      ),
    );
    setSerialValues({});
    setSerialPrefix("");
    setLocations({});
    setModal("receipt");
    setError("");
  };
  const receiveValid = order.items.every((item) => {
    const mode = serialModes[item.id];
    const codes = serialCodes(serialValues[item.id]);
    return (
      (mode === "true" &&
        codes.length === item.qty &&
        new Set(codes).size === codes.length) ||
      (mode === "false" && codes.length === 0)
    );
  });

  const returnable = order.items.filter(
    (item) => item.serialManaged === false && item.received > item.returned,
  );

  const savePurchaseOperation = (kind, buildBody) =>
    run(() => {
      const body = buildBody();

      return withIdempotency(
        purchaseAttempt,
        `purchase:${order.id}:${kind}`,
        body,
        (key, payload) => {
          switch (kind) {
            case "payment":
              return payPurchaseOrder(order.id, key, payload);

            case "return":
              return returnPurchaseOrder(order.id, key, payload);

            case "refund":
              return receivePurchaseRefund(order.id, key, payload);

            default:
              throw new Error("Nghiệp vụ nhập hàng không hợp lệ.");
          }
        },
      );
    });

  const approved = !["DAT_HANG", "HUY"].includes(order.importStatus);

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
          {order.importStatus === "DAT_HANG" && (
            <>
              <button
                className="purchase-btn outline"
                onClick={() =>
                  navigate(`/kho-hang/nhap-hang/tao-moi?edit=${order.id}`)
                }
              >
                − CHỈNH SỬA
              </button>
              <button
                className="purchase-btn blue"
                onClick={() => setModal("approve")}
              >
                DUYỆT ĐƠN
              </button>
              <button
                className="purchase-btn red-outline"
                onClick={() => setModal("cancel")}
              >
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
                setError("");
                setModal("payment");
              }}
            >
              THANH TOÁN
            </button>
          )}
          {order.importStatus === "DA_DUYET" && (
            <button className="purchase-btn green" onClick={openReceive}>
              NHẬP KHO
            </button>
          )}
          {["DA_NHAP_KHO", "HOAN_TRA_MOT_PHAN"].includes(order.importStatus) &&
            returnable.length > 0 && (
              <button
                type="button"
                className="purchase-btn orange-outline"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setModal("return");
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
                setError("");
                setModal("refund");
              }}
            >
              NHẬN TIỀN NHÀ CUNG CẤP HOÀN
            </button>
          )}
          <button
            className="purchase-btn outline"
            onClick={() => navigate("/kho-hang/nhap-hang")}
          >
            ‹ DANH SÁCH
          </button>
        </div>
      </div>
      {error && <p className="purchase-message error">{error}</p>}
      <div className="purchase-detail-grid">
        <div className="purchase-detail-main">
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

              <span>GIÁ TRỊ HÀNG ĐÃ TRẢ</span>
              <b>
                {order.returnedValue == null ? "—" : money(order.returnedValue)}
              </b>

              <span>GIÁ TRỊ ĐƠN SAU TRẢ</span>
              <b>
                {order.netOrderValue == null ? "—" : money(order.netOrderValue)}
              </b>

              <span>TỔNG TIỀN ĐÃ CHI</span>
              <b>{order.paid == null ? "—" : money(order.paid)}</b>

              <span>TỔNG TIỀN ĐÃ NHẬN HOÀN</span>
              <b>{order.refunded == null ? "—" : money(order.refunded)}</b>

              <span>ĐÃ THANH TOÁN THUẦN</span>
              <b>{order.netPaid == null ? "—" : money(order.netPaid)}</b>

              <span>CỬA HÀNG CÒN NỢ NHÀ CUNG CẤP</span>
              <b>{order.debt == null ? "—" : money(order.debt)}</b>

              <span>NHÀ CUNG CẤP CÒN PHẢI HOÀN</span>
              <b>{order.refundDue == null ? "—" : money(order.refundDue)}</b>
            </div>
          </PurchaseCard>
        </div>
        <aside className="purchase-detail-side">
          <PurchaseCard title="NHÀ CUNG CẤP">
            <InfoRows
              rows={[
                ["MÃ NCC", order.supplier.code],
                ["TÊN NCC", order.supplier.name],
                ["SỐ ĐIỆN THOẠI", order.supplier.phone],
                ["EMAIL", order.supplier.email],
                ["ĐỊA CHỈ", order.supplier.address],
              ]}
            />
          </PurchaseCard>
          <PurchaseCard title="KHO NHẬP">
            <InfoRows
              rows={[
                ["MÃ KHO", order.warehouse.code],
                ["TÊN KHO", order.warehouse.name],
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
              {order.importStatus === "HUY" && (
                <p className="cancel-note">ĐƠN ĐÃ HỦY – LƯU LÀM LỊCH SỬ</p>
              )}
            </div>
          </PurchaseCard>
        </aside>
      </div>

      {modal === "approve" && (
        <Modal onClose={() => setModal("")}>
          <h2>XÁC NHẬN DUYỆT ĐƠN</h2>
          <InfoRows
            rows={[
              ["MÃ ĐƠN", order.code],
              ["NCC", order.supplier.name],
              ["KHO", order.warehouse.name],
              ["TỔNG", money(order.total)],
            ]}
          />
          <p className="modal-note success">
            Sau khi duyệt, sản phẩm, số lượng và giá sẽ bị khóa.
          </p>
          <ModalActions
            busy={busy}
            onClose={() => setModal("")}
            confirm={() => run(() => approvePurchaseOrder(order.id))}
            label="XÁC NHẬN DUYỆT"
            color="blue"
          />
        </Modal>
      )}
      {modal === "cancel" && (
        <Modal onClose={() => setModal("")} className="danger-modal">
          <h2>HỦY ĐƠN NHẬP HÀNG</h2>
          <p>
            Bạn có chắc muốn hủy đơn <b>{order.code}</b>?
          </p>
          <ModalActions
            busy={busy}
            onClose={() => setModal("")}
            confirm={() => run(() => cancelPurchaseOrder(order.id))}
            label="XÁC NHẬN HỦY"
            color="red"
            cancelLabel="ĐỂ SAU"
          />
        </Modal>
      )}
      {modal === "receipt" && (
        <Modal onClose={() => setModal("")} className="receipt-modal">
          <h2>NHẬP TOÀN BỘ ĐƠN VÀO KHO</h2>
          <p className="modal-subtitle">
            {order.code} · Kho: <b>{order.warehouse.name}</b>
          </p>
          <div className="serial-generator">
            <label>
              MÃ SERIAL GỐC
              <input
                value={serialPrefix}
                onChange={(event) => setSerialPrefix(event.target.value)}
                placeholder="VD: RV-PO-"
              />
            </label>
          </div>
          <div className="return-table-scroll">
            <table className="receipt-table serial-receipt-table">
              <thead>
                <tr>
                  <th>PHIÊN BẢN</th>
                  <th>SL NHẬP</th>
                  <th>VỊ TRÍ LƯU KHO</th>
                  <th>CHẾ ĐỘ SERIAL</th>
                  <th>MÃ SERIAL THỰC TẾ</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.qty}</td>
                    <td>
                      <input
                        className="storage-location-input"
                        maxLength="255"
                        value={locations[item.id] || ""}
                        onChange={(event) =>
                          setLocations((old) => ({
                            ...old,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="VD: Kệ A1"
                      />
                    </td>
                    <td>
                      <select
                        value={serialModes[item.id] ?? ""}
                        disabled={item.serialModeEstablished}
                        onChange={(event) =>
                          setSerialModes((old) => ({
                            ...old,
                            [item.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">CHỌN CHẾ ĐỘ</option>
                        <option value="true">CÓ QUẢN LÝ SERIAL</option>
                        <option value="false">KHÔNG QUẢN LÝ SERIAL</option>
                      </select>
                    </td>
                    <td>
                      {serialModes[item.id] === "true" ? (
                        <textarea
                          value={serialValues[item.id] || ""}
                          onChange={(event) =>
                            setSerialValues((old) => ({
                              ...old,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder={`Nhập ${item.qty} mã, mỗi mã một dòng`}
                        />
                      ) : (
                        "Không yêu cầu Serial"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="modal-note success">
            Nhập hoặc quét thủ công đúng số lượng mã Serial thực tế. Mỗi mã phải
            duy nhất trước khi xác nhận.
          </p>
          <ModalActions
            busy={busy}
            onClose={() => setModal("")}
            confirm={() =>
              run(() =>
                receivePurchaseOrder(order.id, {
                  kho_hang_id: order.warehouse.id,
                  items: order.items.map((item) => ({
                    chi_tiet_don_nhap_id: item.id,
                    so_luong_nhap_kho: item.qty,
                    vi_tri_luu_kho: (locations[item.id] || "").trim(),
                    quan_ly_serial: serialModes[item.id] === "true",
                    so_serials:
                      serialModes[item.id] === "true"
                        ? serialCodes(serialValues[item.id])
                        : [],
                  })),
                }),
              )
            }
            label="XÁC NHẬN NHẬP KHO"
            color="green"
            disabled={!receiveValid}
          />
        </Modal>
      )}
      {["payment", "return", "refund"].includes(modal) && (
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
              setModal("");
              setError("");
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
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
function ModalActions({
  onClose,
  confirm,
  label,
  color = "black",
  cancelLabel = "HỦY BỎ",
  disabled,
  busy,
}) {
  return (
    <div className="modal-actions">
      <button className="purchase-btn outline" onClick={onClose}>
        {cancelLabel}
      </button>
      <button
        className={`purchase-btn ${color}`}
        onClick={confirm}
        disabled={disabled || busy}
      >
        {busy ? "ĐANG XỬ LÝ..." : label}
      </button>
    </div>
  );
}

function PurchaseOperationDialog({
  kind,
  order,
  returnable,
  attempt,
  busy,
  error,
  close,
  submit,
}) {
  const scope = `purchase:${order.id}:${kind}`;
  const previous = attempt?.scope === scope ? attempt.body : null;

  const [form, setForm] = useState(() => ({
    amount: previous?.so_tien_thanh_toan ?? "",
    method:
      previous?.phuong_thuc_thanh_toan ||
      previous?.phuong_thuc_hoan ||
      "CHUYEN_KHOAN",

    occurredAt: previous
      ? inputFromApiTime(previous.ngay_thanh_toan || previous.ngay_nhan_tien)
      : nowLocalInput(),

    transaction: previous?.ma_giao_dich || "",
    note: previous?.ghi_chu || "",
    reason: previous?.ly_do || "",

    confirmed: Boolean(
      previous?.xac_nhan_da_chi_tien || previous?.xac_nhan_da_nhan_tien,
    ),

    quantities: Object.fromEntries(
      returnable.map((item) => {
        const saved = previous?.items?.find(
          (line) => Number(line.chi_tiet_don_nhap_id) === item.id,
        );

        return [item.id, saved?.so_luong_tra ?? 0];
      }),
    ),

    defects: Object.fromEntries(
      returnable.map((item) => {
        const saved = previous?.items?.find(
          (line) => Number(line.chi_tiet_don_nhap_id) === item.id,
        );

        return [item.id, saved?.so_luong_loi ?? 0];
      }),
    ),
  }));

  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const returning = kind === "return";
  const paying = kind === "payment";

  const selectedItems = returnable
    .map((item) => ({
      chi_tiet_don_nhap_id: item.id,
      so_luong_tra: Number(form.quantities[item.id] || 0),
      so_luong_loi: Number(form.defects[item.id] || 0),
    }))
    .filter((item) => item.so_luong_tra > 0);

  const quantitiesValid = returnable.every((item) => {
    const quantity = Number(form.quantities[item.id] || 0);
    const defect = Number(form.defects[item.id] || 0);

    return (
      Number.isInteger(quantity) &&
      Number.isInteger(defect) &&
      quantity >= 0 &&
      quantity <= item.received - item.returned &&
      defect >= 0 &&
      defect <= quantity
    );
  });

  const receivingRefund = kind === "refund";

  const moneyFieldsValid = Boolean(
    form.occurredAt &&
    METHODS.some(([code]) => code === form.method) &&
    (form.method === "TIEN_MAT" || form.transaction.trim()),
  );

  const valid = returning
    ? Boolean(
        form.reason.trim() &&
        selectedItems.length > 0 &&
        quantitiesValid &&
        (!form.confirmed || moneyFieldsValid),
      )
    : Boolean(
        form.confirmed &&
        moneyFieldsValid &&
        (paying
          ? Number(form.amount) > 0 && Number(form.amount) <= Number(order.debt)
          : receivingRefund && Number(order.refundDue) > 0),
      );

  const showMoneyFields = !returning || form.confirmed;

  const buildBody = () => {
    if (paying) {
      return {
        so_tien_thanh_toan: Number(form.amount),
        phuong_thuc_thanh_toan: form.method,
        ngay_thanh_toan: toApiDateTime(form.occurredAt),
        xac_nhan_da_chi_tien: true,
        ma_giao_dich:
          form.method === "TIEN_MAT" ? null : form.transaction.trim(),
        ghi_chu: form.note.trim() || null,
      };
    }

    const refundFields = {
      xac_nhan_da_nhan_tien: form.confirmed,
      phuong_thuc_hoan: form.confirmed ? form.method : null,
      ngay_nhan_tien: form.confirmed ? toApiDateTime(form.occurredAt) : null,
      ma_giao_dich:
        form.confirmed && form.method !== "TIEN_MAT"
          ? form.transaction.trim()
          : null,
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
    ? "THANH TOÁN NHÀ CUNG CẤP"
    : returning
      ? "HOÀN TRẢ NHÀ CUNG CẤP"
      : "NHẬN TIỀN NHÀ CUNG CẤP HOÀN";

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
          ? "XÁC NHẬN THANH TOÁN"
          : returning
            ? "XÁC NHẬN TRẢ HÀNG"
            : "XÁC NHẬN ĐÃ NHẬN TIỀN HOÀN"
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
            onChange={(event) => change("amount", event.target.value)}
          />
          <small>Còn nợ: {money(order.debt)}</small>
        </label>
      )}

      {kind === "refund" && (
        <p>Nhà cung cấp còn phải hoàn: {money(order.refundDue)}</p>
      )}

      {returning && (
        <>
          {returnable.map((item) => (
            <div key={item.id}>
              <strong>{item.name}</strong>

              <label className="order-operation-field">
                <span>SỐ LƯỢNG TRẢ</span>
                <input
                  type="number"
                  min="0"
                  max={item.received - item.returned}
                  step="1"
                  value={form.quantities[item.id]}
                  onChange={(event) =>
                    change("quantities", {
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
                  value={form.defects[item.id]}
                  onChange={(event) =>
                    change("defects", {
                      ...form.defects,
                      [item.id]: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          ))}

          <label className="order-operation-field">
            <span>LÝ DO TRẢ *</span>
            <textarea
              required
              value={form.reason}
              onChange={(event) => change("reason", event.target.value)}
            />
          </label>
        </>
      )}

      <label className="order-operation-confirm">
        <input
          type="checkbox"
          checked={form.confirmed}
          onChange={(event) => change("confirmed", event.target.checked)}
        />
        {paying
          ? "Xác nhận cửa hàng đã chi tiền cho nhà cung cấp"
          : "Xác nhận cửa hàng đã nhận tiền nhà cung cấp hoàn"}
      </label>

      {showMoneyFields && (
        <>
          <label className="order-operation-field">
            <span>PHƯƠNG THỨC</span>
            <select
              value={form.method}
              onChange={(event) => change("method", event.target.value)}
            >
              {METHODS.map(([code, text]) => (
                <option key={code} value={code}>
                  {text}
                </option>
              ))}
            </select>
          </label>

          <label className="order-operation-field">
            <span>{paying ? "THỜI ĐIỂM CHI TIỀN" : "THỜI ĐIỂM NHẬN TIỀN"}</span>
            <input
              required
              type="datetime-local"
              value={form.occurredAt}
              onChange={(event) => change("occurredAt", event.target.value)}
            />
          </label>

          {form.method !== "TIEN_MAT" && (
            <label className="order-operation-field">
              <span>MÃ GIAO DỊCH</span>
              <input
                required
                maxLength={2555}
                pattern=".*\S.*"
                value={form.transaction}
                onChange={(event) => change("transaction", event.target.value)}
              />
            </label>
          )}
        </>
      )}

      <label className="order-operation-field">
        <span>GHI CHÚ</span>
        <textarea
          value={form.note}
          onChange={(event) => change("note", event.target.value)}
        />
      </label>

      {!paying && (
        <p>
          Số tiền hoàn do hệ thống xác định. Nhận tiền hoàn sau đó không thực
          hiện trả hàng lần nữa.
        </p>
      )}
    </OrderModal>
  );
}
