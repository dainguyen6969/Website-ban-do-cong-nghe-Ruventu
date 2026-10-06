import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiRequest } from "../../../../auth/backendAuth";
import { dateTime, label, money } from "../../orders/api/orderApi";
import OrderModal from "../../orders/components/OrderModal";
import { OrderStateBadge } from "../../orders/pages/DanhSachDonHang";
import DetailTablePagination from "../../../../shared/components/ui/DetailTablePagination";
import useDetailTablePagination from "../../../../hooks/useDetailTablePagination";

import "./QuanLyGiaoHang.css";

const API = "/api/v1/admin/deliveries";
const LIST = "/admin/don-hang/quan-ly-giao-hang";

const STATUSES = [
  "CHO_GIAO",
  "DA_NHAN_HANG",
  "DANG_GIAO",
  "GIAO_THANH_CONG",
  "GIAO_THAT_BAI",
  "CHO_HOAN_HANG",
  "DA_HOAN_HANG",
  "HUY_GIAO_HANG",
];

export default function QuanLyGiaoHang() {
  const { deliveryId } = useParams();

  return deliveryId ? (
    <ShipmentDetail key={deliveryId} id={deliveryId} />
  ) : (
    <ShipmentList />
  );
}

function ShipmentList() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    loading: true,
    error: "",
    items: [],
    pagination: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });

    if (keyword.trim()) {
      params.set("keyword", keyword.trim());
    }

    if (status) {
      params.set("trang_thai_giao_hang", status);
    }

    apiRequest(`${API}?${params}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;

        setState({
          loading: false,
          error: "",
          items: data?.items || [],
          pagination: data?.pagination || null,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        }));
      });

    return () => controller.abort();
  }, [keyword, status, page, revision]);

  const totalPages = Number(state.pagination?.total_pages || 0);

  return (
    <section
      className="delivery-page delivery-api-page"
      aria-busy={state.loading}
    >
      <header className="delivery-api-header">
        <h1>QUẢN LÝ GIAO HÀNG</h1>

        <button
          type="button"
          disabled={state.loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          TẢI LẠI
        </button>
      </header>

      <div className="delivery-api-filters">
        <input
          aria-label="Tìm phiếu giao hàng"
          placeholder="Mã phiếu, mã đơn, vận đơn, người nhận..."
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(0);
          }}
        />

        <select
          aria-label="Trạng thái giao hàng"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
        >
          <option value="">Tất cả trạng thái</option>

          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <p className="delivery-api-error" role="alert">
          {state.error}
        </p>
      )}

      <div className="delivery-table-scroll">
        <table className="delivery-table">
          <thead>
            <tr>
              <th>MÃ PHIẾU</th>
              <th>MÃ VẬN ĐƠN</th>
              <th>MÃ ĐƠN HÀNG</th>
              <th>TRẠNG THÁI</th>
              <th>NGƯỜI NHẬN</th>
              <th>SĐT</th>
              <th>COD</th>
              <th>PHÍ ĐỐI TÁC</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>

          <tbody>
            {state.loading ? (
              <tr>
                <td colSpan={9}>Đang tải phiếu giao hàng...</td>
              </tr>
            ) : state.error ? (
              <tr>
                <td colSpan={9}>Không thể tải danh sách.</td>
              </tr>
            ) : state.items.length === 0 ? (
              <tr>
                <td colSpan={9}>Không có phiếu phù hợp.</td>
              </tr>
            ) : (
              state.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.ma_phieu_giao_hang}</td>
                  <td>{item.ma_van_don || "—"}</td>

                  <td>
                    <button
                      type="button"
                      className="delivery-link"
                      onClick={() =>
                        navigate(
                          `/admin/don-hang/danh-sach-don-hang/${item.don_hang_id}`,
                        )
                      }
                    >
                      {item.ma_don_hang}
                    </button>
                  </td>

                  <td>{label(item.trang_thai_giao_hang)}</td>
                  <td>{item.ten_nguoi_nhan || "—"}</td>
                  <td>{item.sdt_nguoi_nhan || "—"}</td>
                  <td>{money(item.tien_thu_ho_cod)}</td>
                  <td>{money(item.phi_tra_doi_tac)}</td>

                  <td>
                    <button
                      type="button"
                      className="delivery-detail-btn"
                      onClick={() => navigate(`${LIST}/${item.id}`)}
                    >
                      XEM CHI TIẾT
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="delivery-api-pagination">
        <span>
          Trang {page + 1} / {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          disabled={state.loading || page === 0}
          onClick={() => setPage((value) => value - 1)}
        >
          TRƯỚC
        </button>

        <button
          type="button"
          disabled={state.loading || page + 1 >= totalPages}
          onClick={() => setPage((value) => value + 1)}
        >
          SAU
        </button>
      </footer>
    </section>
  );
}

function ShipmentDetail({ id }) {
  const navigate = useNavigate();
  const operationBusy = useRef(false);
  const mounted = useRef(true);

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [returnDocument, setReturnDocument] = useState(null);
  const [revision, setRevision] = useState(0);

  const products = delivery?.san_pham || [];
  const productPages = useDetailTablePagination(products);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setLoadError("");

    apiRequest(`${API}/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;

        if (!data?.id) {
          throw new Error("Không nhận được dữ liệu phiếu giao hàng.");
        }

        setDelivery(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(error.message || "Không tải được phiếu giao hàng.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, revision]);

  const open = (kind) => {
    if (operationBusy.current || loading) return;

    setOperationError("");
    setNotice("");
    setModal(kind);
  };

  const close = () => {
    if (!operationBusy.current) {
      setModal("");
      setOperationError("");
    }
  };

  const save = async (method, suffix, body, message) => {
    if (operationBusy.current) return;

    operationBusy.current = true;
    setBusy(true);
    setOperationError("");

    try {
      const path = `${API}/${encodeURIComponent(id)}${
        suffix ? `/${suffix}` : ""
      }`;

      const result = await apiRequest(path, {
        method,
        body: JSON.stringify(body),
      });

      if (!mounted.current) return;

      // Action chỉ trả một phần dữ liệu; giữ lại sản phẩm và người nhận.
      setDelivery((current) => ({ ...current, ...result }));

      if (result?.phieu_tra_hang) {
        setReturnDocument(result.phieu_tra_hang);
      }

      setNotice(message);
      setModal("");
      setRevision((value) => value + 1);
    } catch (error) {
      if (mounted.current) {
        setOperationError(error.message || "Không thực hiện được thao tác.");
      }
    } finally {
      operationBusy.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  };

  if (!delivery) {
    return (
      <section className="delivery-page delivery-detail-page">
        <div className="delivery-not-found">
          <p role={loadError ? "alert" : "status"}>
            {loadError || "Đang tải phiếu giao hàng..."}
          </p>

          {loadError && (
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              THỬ LẠI
            </button>
          )}

          <button type="button" onClick={() => navigate(LIST)}>
            QUAY LẠI DANH SÁCH
          </button>
        </div>
      </section>
    );
  }

  const order = delivery.don_hang || {};
  const recipient = delivery.nguoi_nhan || {};
  const partner = delivery.doi_tac_van_chuyen || {};
  const totals = delivery.tong_tien || {};
  const status = delivery.trang_thai_giao_hang;
  const locked = busy || loading;

  const openOrder =
    order.loai_don_hang === "ONLINE" &&
    !["HUY_HANG", "HOAN_THANH"].includes(order.trang_thai_don_hang) &&
    order.trang_thai_xuat_kho !== "DA_HOAN_KHO";

  const packedAndExported =
    order.trang_thai_dong_goi === "DA_DONG_GOI" &&
    order.trang_thai_xuat_kho === "DA_XUAT_KHO";

  const inTransit =
    openOrder &&
    packedAndExported &&
    order.trang_thai_don_hang === "DANG_GIAO_HANG";

  const canHandoff =
    status === "CHO_GIAO" &&
    openOrder &&
    packedAndExported &&
    order.trang_thai_don_hang === "CHO_LAY_HANG";

  const canCancel =
    status === "CHO_GIAO" &&
    openOrder &&
    order.trang_thai_don_hang === "CHO_DONG_GOI" &&
    order.trang_thai_xuat_kho === "CHUA_XUAT_KHO" &&
    ["DANG_DONG_GOI", "DA_DONG_GOI"].includes(order.trang_thai_dong_goi);

  const stages = [
    ["ĐƠN HÀNG", order.trang_thai_don_hang],
    ["THANH TOÁN", order.trang_thai_thanh_toan],
    ["ĐÓNG GÓI", order.trang_thai_dong_goi],
    ["XUẤT KHO", order.trang_thai_xuat_kho],
  ];

  return (
    <section className="delivery-page delivery-detail-page">
      <header className="delivery-detail-head">
        <div>
          <nav>
            ADMIN <span>›</span> GIAO HÀNG <span>›</span>
            <strong>CHI TIẾT PHIẾU GIAO HÀNG</strong>
          </nav>
          <p className="delivery-detail-code">{delivery.ma_phieu_giao_hang}</p>
        </div>

        <button
          type="button"
          className="delivery-back"
          disabled={busy}
          onClick={() => navigate(LIST)}
        >
          ← QUAY LẠI
        </button>
      </header>

      <div className="delivery-detail-inner">
        {loadError && (
          <div className="delivery-feedback is-error" role="alert">
            <span>{loadError}</span>
            <button
              type="button"
              disabled={locked}
              onClick={() => setRevision((value) => value + 1)}
            >
              TẢI LẠI
            </button>
          </div>
        )}

        {notice && (
          <div className="delivery-feedback is-success" role="status">
            {notice}
          </div>
        )}

        {returnDocument && (
          <div className="delivery-feedback">
            <span>
              Phiếu trả: <strong>{returnDocument.ma_tra_hang}</strong>.
              {returnDocument.can_hoan_tien
                ? ` Khoản cần xử lý hoàn tiền: ${money(
                    returnDocument.tong_tien_hoan,
                  )}.`
                : " Không phát sinh khoản hoàn tiền."}
            </span>
          </div>
        )}

        <div className="delivery-status-strip">
          {stages.map(([title, value]) => (
            <div key={title}>
              <span>{title}</span>
              <OrderStateBadge value={value} />
            </div>
          ))}

          <div>
            <span>GIAO HÀNG</span>
            <ShipmentBadge value={status} />
          </div>
        </div>

        <div className="delivery-detail-grid">
          <div className="delivery-detail-main">
            <ShipmentPanel
              title="THÔNG TIN GIAO HÀNG"
              tools={
                status === "CHO_GIAO" && openOrder ? (
                  <button
                    type="button"
                    className="delivery-small-btn"
                    disabled={locked}
                    onClick={() => open("edit")}
                  >
                    CHỈNH SỬA THÔNG TIN VẬN ĐƠN
                  </button>
                ) : (
                  <span className="delivery-lock-note">
                    THÔNG TIN VẬN ĐƠN ĐÃ KHÓA
                  </span>
                )
              }
            >
              <dl className="delivery-info-grid">
                <ShipmentInfo title="MÃ PHIẾU GIAO HÀNG">
                  {delivery.ma_phieu_giao_hang}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ VẬN ĐƠN">
                  {delivery.ma_van_don || "—"}
                </ShipmentInfo>
                <ShipmentInfo title="TRẠNG THÁI">{label(status)}</ShipmentInfo>
                <ShipmentInfo title="NGÀY TẠO">
                  {dateTime(delivery.ngay_tao)}
                </ShipmentInfo>
                <ShipmentInfo title="NGƯỜI NHẬN">
                  {recipient.ten_nguoi_nhan || "—"}
                </ShipmentInfo>
                <ShipmentInfo title="SỐ ĐIỆN THOẠI">
                  {recipient.sdt_nguoi_nhan || "—"}
                </ShipmentInfo>
                <ShipmentInfo title="ĐỊA CHỈ GIAO HÀNG" wide>
                  {recipient.dia_chi_giao_hang || "—"}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ ĐƠN HÀNG">
                  <button
                    type="button"
                    className="delivery-link"
                    onClick={() =>
                      navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`)
                    }
                  >
                    {order.ma_don_hang}
                  </button>
                </ShipmentInfo>
                <ShipmentInfo title="CẬP NHẬT CUỐI">
                  {dateTime(delivery.ngay_cap_nhat)}
                </ShipmentInfo>
                {delivery.ghi_chu && (
                  <ShipmentInfo title="GHI CHÚ" wide>
                    {delivery.ghi_chu}
                  </ShipmentInfo>
                )}
              </dl>
            </ShipmentPanel>

            <ShipmentPanel title="CHI TIẾT HÀNG HÓA">
              <div className="delivery-items-wrap">
                <table className="delivery-items">
                  <thead>
                    <tr>
                      <th>SẢN PHẨM</th>
                      <th>PHIÊN BẢN</th>
                      <th>ĐƠN GIÁ</th>
                      <th>SL</th>
                      <th>THÀNH TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPages.visibleItems.map((item) => (
                      <tr key={item.chi_tiet_don_hang_id}>
                        <td>
                          <strong>{item.ten_san_pham}</strong>
                          <small>{item.ma_san_pham}</small>
                        </td>
                        <td>{item.ten_phien_ban || "—"}</td>
                        <td>{money(item.don_gia)}</td>
                        <td>{item.so_luong}</td>
                        <td className="delivery-money-red">
                          {money(item.thanh_tien)}
                        </td>
                      </tr>
                    ))}

                    {!products.length && (
                      <tr>
                        <td colSpan={5} className="delivery-empty">
                          Không có dữ liệu hàng hóa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <DetailTablePagination
                totalItems={products.length}
                currentPage={productPages.currentPage}
                onPageChange={productPages.onPageChange}
                idPrefix={`delivery-${id}-products`}
              />

              <dl className="delivery-summary">
                <ShipmentInfo title="Tổng tiền hàng">
                  {money(totals.tong_tien_hang)}
                </ShipmentInfo>
                <ShipmentInfo title="Chiết khấu">
                  {money(totals.tien_chiet_khau)}
                </ShipmentInfo>
                <ShipmentInfo title="VAT">
                  {money(totals.tong_tien_vat)}
                </ShipmentInfo>
                <ShipmentInfo title="Phí giao hàng">
                  {money(totals.phi_giao_hang)}
                </ShipmentInfo>
                <div className="delivery-total">
                  <dt>KHÁCH PHẢI TRẢ</dt>
                  <dd>{money(totals.tong_thanh_toan)}</dd>
                </div>
              </dl>
            </ShipmentPanel>
          </div>

          <aside className="delivery-detail-side">
            <ShipmentPanel title="THÔNG TIN VẬN CHUYỂN">
              <dl className="delivery-side-info">
                <ShipmentInfo title="ĐỐI TÁC VẬN CHUYỂN">
                  {partner.id ? (
                    <button
                      type="button"
                      className="delivery-link"
                      onClick={() =>
                        navigate(
                          "/admin/khach-hang-doi-tac/doi-tac-van-chuyen",
                          { state: { partnerId: Number(partner.id) } },
                        )
                      }
                    >
                      {partner.ten_doi_tac}
                    </button>
                  ) : (
                    "—"
                  )}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ ĐỐI TÁC">
                  {partner.ma_doi_tac || "—"}
                </ShipmentInfo>
                <ShipmentInfo title="LOẠI ĐỐI TÁC">
                  {partner.loai_doi_tac === "SHIP_CUA_HANG"
                    ? "Ship cửa hàng"
                    : partner.loai_doi_tac === "SHIP_CA_NHAN"
                      ? "Ship cá nhân"
                      : "—"}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ VẬN ĐƠN">
                  {delivery.ma_van_don || "—"}
                </ShipmentInfo>
                <ShipmentInfo title="TIỀN THU HỘ COD">
                  {Number(delivery.tien_thu_ho_cod) > 0
                    ? money(delivery.tien_thu_ho_cod)
                    : "Không thu COD"}
                </ShipmentInfo>
                <ShipmentInfo title="PHÍ TRẢ ĐỐI TÁC">
                  {money(delivery.phi_tra_doi_tac)}
                </ShipmentInfo>
              </dl>
            </ShipmentPanel>

            <section className="delivery-actions-panel">
              <h2>
                <i aria-hidden="true" />
                THAO TÁC
              </h2>

              <div>
                {canHandoff && (
                  <button
                    type="button"
                    className="delivery-action black"
                    disabled={locked}
                    onClick={() => open("handoff")}
                  >
                    XÁC NHẬN ĐỐI TÁC ĐÃ NHẬN HÀNG
                  </button>
                )}

                {status === "DA_NHAN_HANG" && inTransit && (
                  <button
                    type="button"
                    className="delivery-action black"
                    disabled={locked}
                    onClick={() => open("transit")}
                  >
                    CẬP NHẬT ĐANG GIAO
                  </button>
                )}

                {status === "DANG_GIAO" && inTransit && (
                  <>
                    <button
                      type="button"
                      className="delivery-action success"
                      disabled={locked}
                      onClick={() => open("success")}
                    >
                      GIAO THÀNH CÔNG
                    </button>

                    <button
                      type="button"
                      className="delivery-action danger"
                      disabled={locked}
                      onClick={() => open("failure")}
                    >
                      GIAO THẤT BẠI
                    </button>
                  </>
                )}

                {status === "CHO_HOAN_HANG" && (
                  <>
                    <p className="delivery-action waiting">
                      ĐANG CHỜ ĐỐI TÁC HOÀN HÀNG VỀ CỬA HÀNG
                    </p>

                    <button
                      type="button"
                      className="delivery-action return"
                      disabled={locked || !inTransit}
                      onClick={() => open("return")}
                    >
                      XÁC NHẬN ĐÃ NHẬN HÀNG HOÀN
                    </button>
                  </>
                )}

                {canCancel && (
                  <button
                    type="button"
                    className="delivery-action danger"
                    disabled={locked}
                    onClick={() => open("cancel")}
                  >
                    HỦY PHIẾU GIAO HÀNG
                  </button>
                )}

                {status === "GIAO_THANH_CONG" && (
                  <p className="delivery-terminal">
                    ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG
                  </p>
                )}

                {status === "DA_HOAN_HANG" && (
                  <p className="delivery-terminal">
                    ĐÃ NHẬN HÀNG HOÀN VÀ NHẬP LẠI KHO
                  </p>
                )}

                {status === "HUY_GIAO_HANG" && (
                  <p className="delivery-terminal">PHIẾU GIAO HÀNG ĐÃ HỦY</p>
                )}

                {status === "CHO_GIAO" && !canHandoff && !canCancel && (
                  <p className="delivery-terminal">
                    Hoàn tất đóng gói và xuất kho trước khi bàn giao hàng.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {modal === "edit" && (
        <ShipmentEditDialog
          delivery={delivery}
          busy={busy}
          error={operationError}
          close={close}
          submit={save}
        />
      )}

      {modal === "return" && (
        <ShipmentReturnDialog
          delivery={delivery}
          busy={busy}
          error={operationError}
          close={close}
          submit={save}
        />
      )}

      {["handoff", "transit", "success", "failure", "cancel"].includes(
        modal,
      ) && (
        <ShipmentStatusDialog
          key={modal}
          kind={modal}
          delivery={delivery}
          busy={busy}
          error={operationError}
          close={close}
          submit={save}
        />
      )}
    </section>
  );
}

function ShipmentEditDialog({ delivery, busy, error, close, submit }) {
  const [partnerId, setPartnerId] = useState(
    String(delivery.doi_tac_van_chuyen?.id || ""),
  );
  const [tracking, setTracking] = useState(delivery.ma_van_don || "");
  const [fee, setFee] = useState(String(delivery.phi_tra_doi_tac ?? 0));
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const items = [];
        let totalPages = 1;

        for (let page = 0; page < totalPages; page++) {
          const result = await apiRequest(
            `/api/v1/admin/shipping-partners?trang_thai=1&page=${page}&limit=100`,
            { signal: controller.signal },
          );

          if (controller.signal.aborted) return;

          items.push(...(result?.items || []));
          totalPages = Math.max(
            1,
            Number(result?.pagination?.total_pages) || 1,
          );
        }

        setPartners(items.filter((item) => Number(item.trang_thai) === 1));
      } catch (exception) {
        if (!controller.signal.aborted) {
          setLoadError(exception.message || "Không tải được đối tác.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [revision]);

  const valid =
    !loading &&
    !loadError &&
    partners.some((item) => String(item.id) === partnerId) &&
    /^\d{1,13}(\.\d{1,2})?$/.test(fee) &&
    tracking.trim().length <= 50;

  return (
    <OrderModal
      title="CHỈNH SỬA THÔNG TIN VẬN ĐƠN"
      className="delivery-operation-dialog"
      showClose
      busy={busy}
      close={close}
      error={error || loadError}
      disabled={!valid}
      confirmLabel="LƯU THÔNG TIN"
      submit={() =>
        submit(
          "PUT",
          "",
          {
            doi_tac_van_chuyen_id: Number(partnerId),
            ma_van_don: tracking.trim() || null,
            phi_tra_doi_tac: Number(fee),
          },
          "Đã cập nhật thông tin vận đơn.",
        )
      }
    >
      <label className="delivery-field">
        <span>ĐỐI TÁC VẬN CHUYỂN *</span>
        <select
          required
          value={partnerId}
          disabled={loading}
          onChange={(event) => setPartnerId(event.target.value)}
        >
          <option value="">
            {loading ? "Đang tải đối tác..." : "Chọn đối tác"}
          </option>
          {partners.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.ten_doi_tac} — {item.ma_doi_tac}
            </option>
          ))}
        </select>
      </label>

      {loadError && (
        <button
          type="button"
          className="delivery-small-btn"
          onClick={() => setRevision((value) => value + 1)}
        >
          TẢI LẠI ĐỐI TÁC
        </button>
      )}

      <label className="delivery-field">
        <span>MÃ VẬN ĐƠN</span>
        <input
          value={tracking}
          maxLength={50}
          onChange={(event) => setTracking(event.target.value)}
          placeholder="Có thể để trống"
        />
      </label>

      <label className="delivery-field">
        <span>PHÍ TRẢ ĐỐI TÁC (đ) *</span>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={fee}
          onChange={(event) => setFee(event.target.value)}
        />
      </label>
    </OrderModal>
  );
}

function ShipmentStatusDialog({ kind, delivery, busy, error, close, submit }) {
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const cod = Number(delivery.tien_thu_ho_cod || 0);

  const configurations = {
    handoff: {
      title: "XÁC NHẬN ĐỐI TÁC ĐÃ NHẬN HÀNG",
      target: "DA_NHAN_HANG",
      confirmLabel: "XÁC NHẬN BÀN GIAO",
      confirmation: "Tôi xác nhận đã bàn giao hàng cho đối tác.",
      message: "Đã xác nhận đối tác nhận hàng.",
      tone: "",
    },
    transit: {
      title: "CẬP NHẬT ĐANG GIAO HÀNG",
      target: "DANG_GIAO",
      confirmLabel: "XÁC NHẬN ĐANG GIAO",
      confirmation: "Tôi xác nhận đối tác đang vận chuyển đơn hàng.",
      message: "Đã cập nhật trạng thái đang giao hàng.",
      tone: "",
    },
    success: {
      title: "XÁC NHẬN GIAO THÀNH CÔNG",
      target: "GIAO_THANH_CONG",
      confirmLabel: "XÁC NHẬN ĐÃ GIAO",
      confirmation:
        cod > 0
          ? "Xác nhận shipper đã thu đủ tiền COD từ khách."
          : "Tôi xác nhận khách hàng đã nhận đủ hàng.",
      message: "Đã xác nhận giao hàng thành công.",
      tone: "is-success",
    },
    failure: {
      title: "XÁC NHẬN GIAO HÀNG THẤT BẠI",
      target: "GIAO_THAT_BAI",
      confirmLabel: "XÁC NHẬN THẤT BẠI",
      confirmation: "Tôi xác nhận đơn hàng giao không thành công.",
      message: "Đã ghi nhận giao thất bại và chuyển sang chờ hoàn hàng.",
      tone: "is-danger",
    },
    cancel: {
      title: "HỦY PHIẾU GIAO HÀNG",
      confirmLabel: "XÁC NHẬN HỦY",
      confirmation: "Tôi xác nhận hủy phiếu giao hàng.",
      message: "Đã hủy phiếu giao hàng.",
      tone: "is-danger",
    },
  };

  const config = configurations[kind];
  const valid =
    confirmed &&
    (kind !== "cancel" || (reason.trim() && reason.trim().length <= 255));

  const save = () => {
    if (kind === "cancel") {
      return submit("POST", "cancel", { ly_do: reason.trim() }, config.message);
    }

    return submit(
      "PATCH",
      "status",
      {
        trang_thai_giao_hang: config.target,
        ...(kind === "success" && cod > 0 ? { xac_nhan_da_thu_cod: true } : {}),
      },
      config.message,
    );
  };

  return (
    <OrderModal
      title={config.title}
      className={`delivery-operation-dialog ${config.tone}`}
      showClose
      busy={busy}
      close={close}
      submit={save}
      error={error}
      disabled={!valid}
      confirmLabel={config.confirmLabel}
    >
      {kind === "success" && (
        <div className="delivery-cod">
          <span>TIỀN COD CẦN THU</span>
          <strong>{money(cod)}</strong>
        </div>
      )}

      {kind === "failure" && (
        <p className="delivery-warning">
          Hàng sẽ chuyển sang trạng thái CHỜ HOÀN VỀ CỬA HÀNG. Xác nhận nhận
          hàng hoàn khi hàng đã về kho.
        </p>
      )}

      {kind === "cancel" && (
        <label className="delivery-field">
          <span>LÝ DO HỦY *</span>
          <textarea
            required
            maxLength={255}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      )}

      <label className="delivery-checkbox">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>{config.confirmation}</span>
      </label>
    </OrderModal>
  );
}

function ShipmentReturnDialog({ delivery, busy, error, close, submit }) {
  const [requirements, setRequirements] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [refundMethod, setRefundMethod] = useState("CHUYEN_KHOAN");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setLoadError("");

    apiRequest(
      `${API}/${encodeURIComponent(delivery.id)}/return-requirements`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;

        if (
          !data?.kho_hang_id ||
          !Array.isArray(data.items) ||
          !data.items.length
        ) {
          throw new Error("Không có danh sách hàng cần nhận hoàn.");
        }

        const receivedRows = data.items.map((item) => {
          // Đọc đúng trường backend đang trả.
          const quantity = Number(item.so_luong_can_nhan);

          if (
            item.so_luong_can_nhan == null ||
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
          ) {
            throw new Error(
              `Số lượng cần nhận không hợp lệ của sản phẩm ${
                item.ten_san_pham || item.phien_ban_id
              }.`,
            );
          }

          return {
            ...item,

            // Chuẩn hóa sang tên đang dùng trong form:
            // max, updateQuantity và validReturnRow.
            so_luong_da_xuat: quantity,

            good: String(quantity),
            bad: "0",
            serials: (item.serials || []).map((serial) => ({
              ...serial,
              trang_thai_sau_nhan: "",
            })),
          };
        });

        setRequirements(data);
        setRows(receivedRows);
        setConfirmed(false);
      })
      .catch((exception) => {
        if (!controller.signal.aborted) {
          setLoadError(
            exception.message || "Không tải được hàng cần nhận hoàn.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [delivery.id, revision]);

  const updateQuantity = (index, field, rawValue) => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index || row.quan_ly_serial) {
          return row;
        }

        const limit = Number(row.so_luong_da_xuat);

        if (!Number.isSafeInteger(limit) || limit <= 0) {
          return row;
        }

        // Cho phép xóa để nhập lại; nút xác nhận vẫn bị khóa.
        if (rawValue === "") {
          return { ...row, [field]: "" };
        }

        // Chỉ nhận số nguyên không âm.
        if (!/^\d+$/.test(rawValue)) {
          return row;
        }

        const entered = Number(rawValue);

        if (!Number.isSafeInteger(entered)) {
          return row;
        }

        const quantity = Math.min(limit, entered);
        const otherField = field === "good" ? "bad" : "good";

        return {
          ...row,
          [field]: String(quantity),
          [otherField]: String(limit - quantity),
        };
      }),
    );
  };

  const updateSerial = (index, serialId, status) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              serials: row.serials.map((serial) =>
                serial.so_serial_id === serialId
                  ? { ...serial, trang_thai_sau_nhan: status }
                  : serial,
              ),
            }
          : row,
      ),
    );
  };

  const valid =
    !loading &&
    !loadError &&
    requirements &&
    rows.length > 0 &&
    rows.every(validReturnRow) &&
    confirmed &&
    reason.trim().length > 0 &&
    reason.trim().length <= 255 &&
    note.trim().length <= 2000;

  const save = () => {
    const body = {
      xac_nhan_da_nhan_du_hang: true,
      ly_do_tra: reason.trim(),
      hinh_thuc_hoan_tien: refundMethod,
      ghi_chu: note.trim() || null,
      hang_nhan: rows.map((row) => {
        const counts = getReturnCounts(row);

        return {
          chi_tiet_don_hang_id: row.chi_tiet_don_hang_id,
          phien_ban_id: row.phien_ban_id,
          kho_hang_id: requirements.kho_hang_id,
          so_luong_nguyen_ven: counts.good,
          so_luong_loi: counts.bad,
          serials: row.quan_ly_serial
            ? row.serials.map((serial) => ({
                so_serial_id: serial.so_serial_id,
                trang_thai_sau_nhan: serial.trang_thai_sau_nhan,
              }))
            : [],
        };
      }),
    };

    return submit(
      "POST",
      "return-receipt",
      body,
      "Đã nhận đủ hàng hoàn và nhập lại kho.",
    );
  };

  return (
    <OrderModal
      title="XÁC NHẬN HÀNG HOÀN VỀ KHO"
      className="delivery-operation-dialog delivery-return-dialog is-return"
      showClose
      busy={busy}
      close={close}
      submit={save}
      disabled={!valid}
      error={error || loadError}
      confirmLabel="XÁC NHẬN ĐÃ NHẬN HÀNG HOÀN"
    >
      <p className="delivery-warning">
        Hàng hoàn được nhập về{" "}
        <strong>{requirements?.ten_kho || "kho mặc định của cửa hàng"}</strong>.
        Không chọn kho khác.
      </p>

      {loading && <p role="status">Đang tải hàng cần nhận hoàn...</p>}

      {loadError && (
        <button
          type="button"
          className="delivery-small-btn"
          onClick={() => setRevision((value) => value + 1)}
        >
          TẢI LẠI HÀNG CẦN NHẬN
        </button>
      )}

      {!loading && !loadError && (
        <>
          <h3 className="delivery-form-heading">HÀNG NHẬN VỀ</h3>

          {rows.map((row, index) => {
            const counts = getReturnCounts(row);
            const managed = row.quan_ly_serial;

            return (
              <section
                className="delivery-return-row"
                key={`${row.chi_tiet_don_hang_id}:${row.phien_ban_id}`}
              >
                <strong>{row.ten_san_pham}</strong>
                <small>
                  {row.ten_phien_ban} · Số lượng đã xuất: {row.so_luong_da_xuat}
                </small>

                <div className="delivery-return-quantities">
                  <label>
                    <span>SỐ LƯỢNG NGUYÊN VẸN</span>
                    <input
                      type="number"
                      min="0"
                      max={row.so_luong_da_xuat}
                      step="1"
                      required
                      readOnly={managed}
                      value={managed ? counts.good : row.good}
                      onChange={(event) =>
                        updateQuantity(index, "good", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>SỐ LƯỢNG LỖI</span>
                    <input
                      type="number"
                      min="0"
                      max={row.so_luong_da_xuat}
                      step="1"
                      required
                      readOnly={managed}
                      value={managed ? counts.bad : row.bad}
                      onChange={(event) =>
                        updateQuantity(index, "bad", event.target.value)
                      }
                    />
                  </label>
                </div>

                {managed && (
                  <div className="delivery-return-serials">
                    <p>
                      Chọn tình trạng từng serial. Số lượng phía trên được tính
                      theo serial đã chọn.
                    </p>

                    {row.serials.map((serial) => (
                      <label key={serial.so_serial_id}>
                        <span>{serial.so_serial}</span>
                        <select
                          required
                          value={serial.trang_thai_sau_nhan}
                          onChange={(event) =>
                            updateSerial(
                              index,
                              serial.so_serial_id,
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Chọn tình trạng</option>
                          <option value="TRONG_KHO">Nguyên vẹn</option>
                          <option value="LOI">Hàng lỗi</option>
                        </select>
                      </label>
                    ))}
                  </div>
                )}

                {!validReturnRow(row) && (
                  <em>
                    {managed
                      ? "Cần phân loại đủ tất cả serial đã xuất."
                      : "Nguyên vẹn + lỗi phải bằng số lượng đã xuất."}
                  </em>
                )}
              </section>
            );
          })}

          <label className="delivery-field">
            <span>LÝ DO TRẢ *</span>
            <textarea
              required
              maxLength={255}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ví dụ: Khách không nhận, đối tác đã hoàn đủ hàng..."
            />
          </label>

          <label className="delivery-field">
            <span>GHI CHÚ</span>
            <textarea
              maxLength={2000}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tình trạng hàng khi nhận lại..."
            />
          </label>

          <label className="delivery-field">
            <span>HÌNH THỨC HOÀN TIỀN DỰ KIẾN, NẾU CÓ *</span>
            <select
              value={refundMethod}
              onChange={(event) => setRefundMethod(event.target.value)}
            >
              <option value="CHUYEN_KHOAN">Chuyển khoản</option>
              <option value="TIEN_MAT">Tiền mặt</option>
            </select>
            <small>
              Thao tác này ghi nhận hàng hoàn. Việc hoàn tiền được xử lý ở
              nghiệp vụ hoàn tiền.
            </small>
          </label>

          <label className="delivery-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              Tôi xác nhận đã nhận đủ hàng và kiểm tra tình trạng hàng.
            </span>
          </label>
        </>
      )}
    </OrderModal>
  );
}

function getReturnCounts(row) {
  if (row.quan_ly_serial) {
    return {
      good: row.serials.filter(
        (serial) => serial.trang_thai_sau_nhan === "TRONG_KHO",
      ).length,
      bad: row.serials.filter((serial) => serial.trang_thai_sau_nhan === "LOI")
        .length,
    };
  }

  return {
    good: /^\d+$/.test(row.good) ? Number(row.good) : NaN,
    bad: /^\d+$/.test(row.bad) ? Number(row.bad) : NaN,
  };
}

function validReturnRow(row) {
  const expected = Number(row.so_luong_da_xuat);
  const counts = getReturnCounts(row);

  if (
    !Number.isSafeInteger(expected) ||
    expected <= 0 ||
    !Number.isSafeInteger(counts.good) ||
    !Number.isSafeInteger(counts.bad) ||
    counts.good < 0 ||
    counts.bad < 0 ||
    counts.good + counts.bad !== expected
  ) {
    return false;
  }

  if (!row.quan_ly_serial) return true;

  return (
    row.serials.length === expected &&
    new Set(row.serials.map((serial) => serial.so_serial_id)).size ===
      expected &&
    row.serials.every((serial) =>
      ["TRONG_KHO", "LOI"].includes(serial.trang_thai_sau_nhan),
    )
  );
}

function ShipmentPanel({ title, tools, children }) {
  return (
    <section className="delivery-panel">
      <header>
        <h2>
          <i aria-hidden="true" />
          {title}
        </h2>
        {tools}
      </header>
      {children}
    </section>
  );
}

function ShipmentInfo({ title, wide = false, children }) {
  return (
    <div className={wide ? "wide" : undefined}>
      <dt>{title}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ShipmentBadge({ value }) {
  return (
    <span className={`delivery-badge delivery-badge--${value}`}>
      {label(value).toUpperCase()}
    </span>
  );
}
