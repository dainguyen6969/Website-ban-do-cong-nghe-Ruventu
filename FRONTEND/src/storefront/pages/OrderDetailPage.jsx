import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";

import OrderModal from "../../features/admin/orders/components/OrderModal";
import { label, money } from "../../features/admin/orders/api/orderApi";

import { orderService } from "../../shared/services/orderService";
import {
  errorMessage,
  formatDateTimeVN,
} from "../../shared/services/mutationUtils";

import "./OrderDetailPage.css";

const returnLabels = {
  CHO_TIEP_NHAN: "Chờ tiếp nhận",
  DA_NHAN_HANG: "Đã nhận hàng",
  DA_HOAN_TIEN: "Đã hoàn tiền",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returnsError, setReturnsError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);

  const busyRef = useRef(false);

  const loadReturns = useCallback(
    async (signal) => {
      try {
        const response = await orderService.getReturns(
          {
            don_hang_id: Number(id),
            page: 0,
            limit: 100,
          },
          signal,
        );

        if (signal?.aborted) return;

        setReturns(response.data.data?.items || []);
        setReturnsError("");
      } catch (reason) {
        if (!signal?.aborted) {
          setReturnsError(errorMessage(reason));
        }
      }
    },
    [id],
  );

  const load = useCallback(
    async (signal) => {
      try {
        const response = await orderService.getOrder(id, signal);

        if (signal?.aborted) return;

        setOrder(response.data.data);
        setError("");
      } catch (reason) {
        if (!signal?.aborted) {
          setError(errorMessage(reason));
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id],
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
    setError("");

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
    order?.loai_don_hang === "ONLINE" &&
    order?.trang_thai_xuat_kho === "CHUA_XUAT_KHO" &&
    ["CHO_DUYET", "CHO_THANH_TOAN", "CHO_DONG_GOI"].includes(
      order?.trang_thai_don_hang,
    );

  const canReturn =
    order?.trang_thai_don_hang === "HOAN_THANH" &&
    order?.trang_thai_thanh_toan === "DA_THANH_TOAN" &&
    order?.trang_thai_xuat_kho === "DA_XUAT_KHO";

  const updateDialog = (key, value) =>
    setDialog((current) => ({ ...current, [key]: value }));

  const openReturn = () => {
    setError("");

    setDialog({
      type: "return",
      reason: "",
      note: "",
      method: "CHUYEN_KHOAN",
      quantities: Object.fromEntries(
        (order.san_pham || []).map((item) => [item.chi_tiet_don_hang_id, 0]),
      ),
    });
  };

  const submitDialog = () => {
    if (dialog.type === "cancel") {
      return run(() => orderService.cancelOrder(order.id, dialog.reason));
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
      }),
    );
  };

  const returnQuantityValid =
    dialog?.type !== "return" ||
    ((order?.san_pham || []).some(
      (item) => Number(dialog.quantities[item.chi_tiet_don_hang_id]) > 0,
    ) &&
      (order?.san_pham || []).every((item) => {
        const quantity = Number(
          dialog.quantities[item.chi_tiet_don_hang_id] || 0,
        );

        return (
          Number.isInteger(quantity) &&
          quantity >= 0 &&
          quantity <= Number(item.so_luong)
        );
      }));

  return (
    <div className="order-detail-page">
      <Header />

      <main className="order-main-content">
        <div className="container">
          <button
            type="button"
            className="back-btn-outline"
            onClick={() => navigate("/profile?tab=orders")}
          >
            QUAY LẠI
          </button>

          {loading && <p>Đang tải đơn hàng...</p>}
          {error && <p role="alert">{error}</p>}

          {!loading && !order && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/login")}
            >
              ĐĂNG NHẬP LẠI
            </button>
          )}

          {order && (
            <>
              <section className="order-card">
                <h1>{order.ma_don_hang}</h1>
                <p>{formatDateTimeVN(order.ngay_tao)}</p>

                <p>Đơn hàng: {label(order.trang_thai_don_hang)}</p>
                <p>Thanh toán: {label(order.trang_thai_thanh_toan)}</p>
                <p>Đóng gói: {label(order.trang_thai_dong_goi)}</p>
                <p>Xuất kho: {label(order.trang_thai_xuat_kho)}</p>

                {canCancel && (
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setDialog({ type: "cancel", reason: "" });
                    }}
                  >
                    HỦY ĐƠN
                  </button>
                )}

                {canReturn && (
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={busy}
                    onClick={openReturn}
                  >
                    YÊU CẦU TRẢ HÀNG
                  </button>
                )}
              </section>

              <section className="order-card">
                <h2>SẢN PHẨM</h2>

                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Phiên bản</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.san_pham || []).map((item) => (
                      <tr key={item.chi_tiet_don_hang_id}>
                        <td>{item.ten_san_pham}</td>
                        <td>{item.ten_phien_ban || "—"}</td>
                        <td>{item.so_luong}</td>
                        <td>{money(item.don_gia)}</td>
                        <td>{money(item.thanh_tien)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="order-card">
                <h2>NGƯỜI NHẬN</h2>
                <p>{order.ten_nguoi_nhan}</p>
                <p>{order.sdt_nguoi_nhan}</p>
                <p>
                  {order.hinh_thuc_nhan_hang === "NHAN_TAI_CUA_HANG"
                    ? "Nhận tại cửa hàng"
                    : order.dia_chi_giao_hang}
                </p>
              </section>

              <section className="order-card">
                <h2>TỔNG KẾT</h2>
                <p>Tiền hàng: {money(order.tong_tien_hang)}</p>
                <p>Chiết khấu: {money(order.tien_chiet_khau)}</p>
                <p>VAT: {money(order.tong_tien_vat)}</p>
                <p>Phí giao hàng: {money(order.phi_giao_hang)}</p>
                <strong>Tổng thanh toán: {money(order.tong_thanh_toan)}</strong>
              </section>

              <section className="order-card">
                <h2>YÊU CẦU TRẢ HÀNG</h2>

                {returnsError && <p role="alert">{returnsError}</p>}

                {returns.map((item) => (
                  <p key={item.id}>
                    {item.ma_tra_hang}
                    {" · "}
                    {returnLabels[item.trang_thai_tra_hang] ||
                      item.trang_thai_tra_hang}
                    {" · "}
                    {money(item.tong_tien_hoan)}
                  </p>
                ))}

                {!returnsError && returns.length === 0 && (
                  <p>Chưa có yêu cầu trả hàng.</p>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {dialog && (
        <OrderModal
          title={dialog.type === "cancel" ? "HỦY ĐƠN HÀNG" : "YÊU CẦU TRẢ HÀNG"}
          busy={busy}
          close={() => setDialog(null)}
          submit={submitDialog}
          error={error}
          disabled={!dialog.reason.trim() || !returnQuantityValid}
        >
          {dialog.type === "return" && (
            <>
              {(order.san_pham || []).map((item) => (
                <label
                  className="order-operation-field"
                  key={item.chi_tiet_don_hang_id}
                >
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
                      updateDialog("quantities", {
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
                  onChange={(event) =>
                    updateDialog("method", event.target.value)
                  }
                >
                  <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                  <option value="TIEN_MAT">Tiền mặt</option>
                </select>
              </label>

              <label className="order-operation-field">
                <span>GHI CHÚ</span>
                <textarea
                  value={dialog.note}
                  onChange={(event) => updateDialog("note", event.target.value)}
                />
              </label>

              <p>
                Số lượng còn được trả và điều kiện trả hàng sẽ được kiểm tra khi
                gửi yêu cầu.
              </p>
            </>
          )}

          <label className="order-operation-field">
            <span>LÝ DO *</span>
            <textarea
              required
              maxLength={255}
              value={dialog.reason}
              onChange={(event) => updateDialog("reason", event.target.value)}
            />
          </label>
        </OrderModal>
      )}

      <Footer />
    </div>
  );
}
