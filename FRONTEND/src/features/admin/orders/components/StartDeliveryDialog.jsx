import { useEffect, useState } from "react";
import { searchDeliveryPartners } from "../api/orderApi";
import OrderModal from "./OrderModal";

const validFee = (value) =>
  /^\d{1,13}(?:\.\d{1,2})?$/.test(value.trim()) &&
  Number(value) >= 0 &&
  Number(value) <= 9999999999999.99;

export default function StartDeliveryDialog({
  order,
  delivery = null,
  mode = "start",
  busy,
  error,
  close,
  submit,
}) {
  const waiting = order.phieu_giao_hang?.find(
    (item) => item.trang_thai_giao_hang === "CHO_GIAO",
  );

  const initialPartner = delivery?.doi_tac_van_chuyen || null;

  const [query, setQuery] = useState(
    initialPartner?.ten_doi_tac || waiting?.ten_doi_tac_van_chuyen || "",
  );

  const [selected, setSelected] = useState(initialPartner);
  const [fee, setFee] = useState(
    String(delivery?.phi_tra_doi_tac ?? waiting?.phi_tra_doi_tac ?? ""),
  );

  const [tracking, setTracking] = useState(
    delivery?.ma_van_don || waiting?.ma_van_don || "",
  );

  const [confirmed, setConfirmed] = useState(false);
  const [partners, setPartners] = useState([]);
  const [search, setSearch] = useState({
    loading: false,
    error: "",
  });

  useEffect(() => {
    if (selected) return undefined;

    const controller = new AbortController();

    setSearch({ loading: true, error: "" });

    const timer = setTimeout(async () => {
      try {
        const result = await searchDeliveryPartners(
          query.trim(),
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setPartners(result?.items || []);
        setSearch({ loading: false, error: "" });
      } catch (failure) {
        if (controller.signal.aborted) return;

        setPartners([]);
        setSearch({
          loading: false,
          error: failure.message || "Không tải được đối tác.",
        });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  const editing = mode === "edit";

  const valid =
    selected &&
    Number(selected.trang_thai) === 1 &&
    validFee(fee) &&
    tracking.trim().length <= 50 &&
    (editing || confirmed);

  return (
    <OrderModal
      title={editing ? "CHỈNH SỬA THÔNG TIN VẬN ĐƠN" : "BẮT ĐẦU GIAO HÀNG"}
      className="order-start-delivery"
      showClose
      cancelLabel="HỦY"
      confirmLabel={editing ? "LƯU THÔNG TIN" : "XÁC NHẬN ĐÃ BÀN GIAO"}
      busy={busy}
      close={close}
      error={error || search.error}
      disabled={!valid}
      submit={() => submit(Number(selected.id), Number(fee), tracking.trim())}
    >
      <p className="order-start-delivery__intro">
        {editing
          ? "THÔNG TIN VẬN ĐƠN CHỈ SỬA ĐƯỢC KHI PHIẾU CHỜ GIAO"
          : "CHỌN ĐỐI TÁC VÀ XÁC NHẬN HÀNG ĐÃ ĐƯỢC BÀN GIAO"}
      </p>

      <dl className="order-start-delivery__summary">
        <div>
          <dt>MÃ ĐƠN HÀNG</dt>
          <dd>{order.ma_don_hang}</dd>
        </div>
        <div>
          <dt>NGƯỜI NHẬN</dt>
          <dd>{order.ten_nguoi_nhan || "—"}</dd>
        </div>
        <div>
          <dt>SỐ ĐIỆN THOẠI</dt>
          <dd>{order.sdt_nguoi_nhan || "—"}</dd>
        </div>
        <div>
          <dt>ĐỊA CHỈ GIAO HÀNG</dt>
          <dd>{order.dia_chi_giao_hang || "—"}</dd>
        </div>
      </dl>

      <div className="order-operation-field">
        <label htmlFor="delivery-person-search">ĐỐI TÁC GIAO HÀNG *</label>

        <input
          id="delivery-person-search"
          maxLength={100}
          autoComplete="off"
          value={query}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setPartners([]);
          }}
        />

        <div className="order-courier-list">
          {(selected ? [selected] : partners).map((partner) => (
            <button
              type="button"
              className="order-courier-card"
              key={partner.id}
              aria-pressed={selected?.id === partner.id}
              onClick={() => {
                setSelected(partner);
                setQuery(partner.ten_doi_tac || "");
              }}
            >
              <span>
                <strong>{partner.ten_doi_tac}</strong>
                <small>
                  {[partner.ma_doi_tac, partner.so_dien_thoai]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>

              <span className="order-courier-card__type">
                {partner.loai_doi_tac === "SHIP_CUA_HANG"
                  ? "SHIP CỬA HÀNG"
                  : "SHIP CÁ NHÂN"}
              </span>
            </button>
          ))}
        </div>

        {!selected && search.loading && (
          <small role="status">Đang tìm đối tác...</small>
        )}

        {!selected &&
          !search.loading &&
          !search.error &&
          partners.length === 0 && (
            <small>Không tìm thấy đối tác đang hoạt động.</small>
          )}

        {selected && Number(selected.trang_thai) !== 1 && (
          <small>Đối tác đã ngừng hoạt động. Hãy chọn đối tác khác.</small>
        )}
      </div>

      <label className="order-operation-field">
        <span>MÃ VẬN ĐƠN</span>
        <input
          maxLength={50}
          value={tracking}
          onChange={(event) => setTracking(event.target.value)}
          placeholder="Có thể để trống"
        />
      </label>

      <label className="order-operation-field">
        <span>PHÍ TRẢ ĐỐI TÁC (đ) *</span>
        <input
          type="number"
          required
          min="0"
          max="9999999999999.99"
          step="0.01"
          value={fee}
          onChange={(event) => setFee(event.target.value)}
        />
        <small>
          Đây là phí trả người giao, khác với phí giao hàng thu từ khách.
        </small>
      </label>

      {!editing && (
        <label className="order-operation-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Tôi xác nhận đối tác đã nhận hàng từ cửa hàng/kho.
        </label>
      )}
    </OrderModal>
  );
}
