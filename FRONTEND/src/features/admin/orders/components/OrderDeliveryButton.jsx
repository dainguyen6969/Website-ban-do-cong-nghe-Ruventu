import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrder, startOrderDelivery } from "../api/orderApi";
import StartDeliveryDialog from "./StartDeliveryDialog";

export function canStartOrderDelivery(order) {
  return (
    order?.loai_don_hang === "ONLINE" &&
    order?.hinh_thuc_nhan_hang === "GIAO_HANG" &&
    order?.trang_thai_don_hang === "CHO_LAY_HANG" &&
    order?.trang_thai_dong_goi === "DA_DONG_GOI" &&
    order?.trang_thai_xuat_kho === "DA_XUAT_KHO"
  );
}

export default function OrderDeliveryButton({
  order,
  disabled = false,
  className = "order-detail-button order-delivery-button",
  onCompleted,
}) {
  const navigate = useNavigate();
  const locked = useRef(false);
  const alive = useRef(true);
  const reading = useRef(null);

  const [dialogOrder, setDialogOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      reading.current?.abort();
    };
  }, []);

  async function openDialog() {
    if (locked.current || disabled) return;

    locked.current = true;
    setBusy(true);
    setError("");

    const controller = new AbortController();
    reading.current = controller;

    try {
      // Lấy lại đơn trước khi mở để kiểm tra trạng thái mới nhất.
      const latest = await getOrder(order.id, controller.signal);

      if (!alive.current || controller.signal.aborted) return;

      if (!canStartOrderDelivery(latest)) {
        throw new Error(
          "Đơn chưa đủ điều kiện bàn giao hoặc trạng thái đã thay đổi. Hãy tải lại đơn.",
        );
      }

      setDialogOrder(latest);
    } catch (failure) {
      if (alive.current && !controller.signal.aborted) {
        setError(failure.message || "Không tải được đơn hàng.");
      }
    } finally {
      locked.current = false;

      if (alive.current) setBusy(false);
    }
  }

  async function submit(partnerId, fee, tracking) {
    if (locked.current || !dialogOrder) return;

    locked.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await startOrderDelivery(
        dialogOrder.id,
        partnerId,
        fee,
        tracking,
      );

      if (!alive.current) return;

      setDialogOrder(null);

      if (onCompleted) {
        await onCompleted(result);
      } else {
        const delivery = result?.phieu_giao_hang?.find(
          (item) => item.trang_thai_giao_hang === "DA_NHAN_HANG",
        );

        if (delivery?.id) {
          navigate(`/admin/don-hang/quan-ly-giao-hang/${delivery.id}`);
        } else {
          navigate("/admin/don-hang/quan-ly-giao-hang");
        }
      }
    } catch (failure) {
      if (alive.current) {
        setError(failure.message || "Không thể bàn giao đơn hàng.");
      }
    } finally {
      locked.current = false;

      if (alive.current) setBusy(false);
    }
  }

  function close() {
    if (locked.current) return;
    setDialogOrder(null);
    setError("");
  }

  if (!canStartOrderDelivery(order) && !dialogOrder) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || busy}
        onClick={openDialog}
      >
        {busy && !dialogOrder ? "ĐANG TẢI..." : "BẮT ĐẦU GIAO HÀNG"}
      </button>

      {error && !dialogOrder && (
        <p className="order-delivery-error" role="alert">
          {error}
        </p>
      )}

      {dialogOrder && (
        <StartDeliveryDialog
          key={dialogOrder.id}
          order={dialogOrder}
          busy={busy}
          error={error}
          close={close}
          submit={submit}
        />
      )}
    </>
  );
}
