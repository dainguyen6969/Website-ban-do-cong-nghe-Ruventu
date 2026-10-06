import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineAdjustments, HiOutlineSearch } from "react-icons/hi";
import FilterDropdown from "../../../../shared/components/ui/FilterDropdown";
import TablePagination from "../../../../shared/components/ui/TablePagination";
import { dateTime, getOrders, label, money } from "../api/orderApi";
import "./DanhSachDonHang.css";

const PAGE_SIZE = 10;
const ALL = "Tất cả";
const empty = {
  keyword: "",
  loai_don_hang: "",
  trang_thai_don_hang: "",
  trang_thai_thanh_toan: "",
  trang_thai_dong_goi: "",
  trang_thai_xuat_kho: "",
  tu_ngay: "",
  den_ngay: "",
};
const options = {
  loai_don_hang: [
    [ALL, ""],
    ["Online", "ONLINE"],
    ["Tại quầy", "TAI_QUAY"],
  ],
  trang_thai_don_hang: [
    [ALL, ""],
    ["Chờ duyệt", "CHO_DUYET"],
    ["Chờ thanh toán", "CHO_THANH_TOAN"],
    ["Chờ đóng gói", "CHO_DONG_GOI"],
    ["Chờ lấy hàng", "CHO_LAY_HANG"],
    ["Đang giao hàng", "DANG_GIAO_HANG"],
    ["Hoàn thành", "HOAN_THANH"],
    ["Đã hủy", "HUY_HANG"],
  ],
  trang_thai_thanh_toan: [
    [ALL, ""],
    ["Chưa thanh toán", "CHUA_THANH_TOAN"],
    ["Đã thanh toán", "DA_THANH_TOAN"],
  ],
  trang_thai_dong_goi: [
    [ALL, ""],
    ["Chưa đóng gói", "CHUA_DONG_GOI"],
    ["Đang đóng gói", "DANG_DONG_GOI"],
    ["Đã đóng gói", "DA_DONG_GOI"],
    ["Hủy đóng gói", "HUY_DONG_GOI"],
  ],
  trang_thai_xuat_kho: [
    [ALL, ""],
    ["Chưa xuất kho", "CHUA_XUAT_KHO"],
    ["Đã xuất kho", "DA_XUAT_KHO"],
    ["Đã hoàn kho", "DA_HOAN_KHO"],
  ],
};
const selectedLabel = (field, value) =>
  options[field].find((item) => item[1] === value)?.[0] || ALL;

export default function DanhSachDonHang() {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draft, setDraft] = useState(empty);
  const [filters, setFilters] = useState(empty);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: {} });
  const [state, setState] = useState({ loading: true, error: "" });
  const request = useMemo(
    () => ({
      ...filters,
      page: page - 1,
      limit: PAGE_SIZE,
      sort: "ngay_tao,desc",
    }),
    [filters, page],
  );

  useEffect(() => {
    const controller = new AbortController();

    setState({ loading: true, error: "" });

    const timer = setTimeout(() => {
      getOrders(request, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;

          setData({
            items: result?.items || [],
            pagination: result?.pagination || {},
          });

          setState({ loading: false, error: "" });
        })
        .catch((error) => {
          if (controller.signal.aborted) return;

          setData({ items: [], pagination: {} });
          setState({
            loading: false,
            error: error.message,
          });
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [request]);

  const updateImmediate = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));

    // Chỉ áp dụng trường vừa thay đổi.
    // Không vô tình áp dụng các bộ lọc nâng cao còn đang nhập.
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));

    setPage(1);
  };

  const apply = () => {
    if (draft.tu_ngay && draft.den_ngay && draft.tu_ngay > draft.den_ngay) {
      setState((current) => ({
        ...current,
        error: "Từ ngày phải nhỏ hơn hoặc bằng đến ngày.",
      }));
      return;
    }

    setFilters({ ...draft });
    setPage(1);
  };

  const clear = () => {
    setDraft(empty);
    setFilters(empty);
    setPage(1);
  };

  const total = Number(data.pagination?.total_elements || 0);

  return (
    <>
      <section className="order-toolbar" aria-label="Bộ lọc đơn hàng">
        <div className="order-toolbar__primary">
          <label className="order-search">
            <HiOutlineSearch size={17} />
            <input
              type="search"
              value={draft.keyword}
              onChange={(event) =>
                updateImmediate("keyword", event.target.value)
              }
              placeholder="TÌM MÃ ĐƠN HÀNG / TÊN KHÁCH HÀNG / SỐ ĐIỆN THOẠI..."
            />
          </label>
          {[
            "loai_don_hang",
            "trang_thai_don_hang",
            "trang_thai_thanh_toan",
          ].map((field) => (
            <FilterDropdown
              key={field}
              label={
                {
                  loai_don_hang: "LOẠI ĐƠN",
                  trang_thai_don_hang: "TRẠNG THÁI ĐƠN",
                  trang_thai_thanh_toan: "THANH TOÁN",
                }[field]
              }
              options={options[field].map(([text]) => text)}
              value={selectedLabel(field, draft[field])}
              onSelect={(text) =>
                updateImmediate(
                  field,
                  options[field].find(([name]) => name === text)?.[1] || "",
                )
              }
            />
          ))}
          <button
            type="button"
            className={`order-advanced-toggle ${showAdvanced ? "order-advanced-toggle--active" : ""}`}
            onClick={() => setShowAdvanced((value) => !value)}
          >
            <HiOutlineAdjustments size={16} /> BỘ LỌC NÂNG CAO
          </button>
        </div>
        {showAdvanced && (
          <div className="order-toolbar__advanced">
            {["trang_thai_dong_goi", "trang_thai_xuat_kho"].map((field) => (
              <Advanced
                key={field}
                label={
                  field === "trang_thai_dong_goi"
                    ? "TRẠNG THÁI ĐÓNG GÓI"
                    : "TRẠNG THÁI XUẤT KHO"
                }
              >
                <FilterDropdown
                  options={options[field].map(([text]) => text)}
                  value={selectedLabel(field, draft[field])}
                  onSelect={(text) =>
                    setDraft((current) => ({
                      ...current,
                      [field]:
                        options[field].find(([name]) => name === text)?.[1] ||
                        "",
                    }))
                  }
                />
              </Advanced>
            ))}
            <Advanced label="TỪ NGÀY">
              <input
                className="order-date-input"
                type="date"
                value={draft.tu_ngay}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tu_ngay: event.target.value,
                  }))
                }
              />
            </Advanced>
            <Advanced label="ĐẾN NGÀY">
              <input
                className="order-date-input"
                type="date"
                value={draft.den_ngay}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    den_ngay: event.target.value,
                  }))
                }
              />
            </Advanced>
            <div className="order-filter-actions">
              <button
                type="button"
                className="order-filter-clear"
                onClick={clear}
              >
                XÓA
              </button>
              <button
                type="button"
                className="order-filter-apply"
                onClick={apply}
              >
                ÁP DỤNG
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="order-list-content">
        {state.error && (
          <p className="order-api-message order-api-message--error">
            {state.error}
          </p>
        )}
        <div className="order-table-scroll">
          <table className="order-list-table">
            <thead>
              <tr>
                <th>ẢNH</th>
                <th>ĐƠN HÀNG</th>
                <th>NGÀY TẠO</th>
                <th>KHÁCH HÀNG</th>
                <th>TRẠNG THÁI ĐƠN</th>
                <th>THANH TOÁN</th>
                <th>ĐÓNG GÓI</th>
                <th>XUẤT KHO</th>
                <th>TỔNG TIỀN</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => (
                <tr
                  key={order.id}
                  className={
                    order.trang_thai_don_hang === "HUY_HANG"
                      ? "order-row--cancelled"
                      : ""
                  }
                >
                  <td>
                    {order.anh_dai_dien_san_pham ? (
                      <img
                        className="order-thumbnail"
                        src={order.anh_dai_dien_san_pham}
                        alt=""
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <strong className="order-primary">
                      {order.ma_don_hang}
                    </strong>
                    <OrderStateBadge value={order.loai_don_hang} />
                  </td>
                  <td>
                    <strong>{dateTime(order.ngay_tao)}</strong>
                  </td>
                  <td>
                    <strong>{order.ten_khach_hang || "Khách lẻ"}</strong>
                    <small>
                      {order.sdt_nguoi_nhan ||
                        order.so_dien_thoai_khach_hang ||
                        "—"}
                    </small>
                  </td>
                  <td>
                    <OrderStateBadge value={order.trang_thai_don_hang} />
                  </td>
                  <td>
                    <OrderStateBadge value={order.trang_thai_thanh_toan} />
                  </td>
                  <td>
                    <OrderStateBadge value={order.trang_thai_dong_goi} />
                  </td>
                  <td>
                    <OrderStateBadge value={order.trang_thai_xuat_kho} />
                  </td>
                  <td>
                    <strong className="order-total">
                      {money(order.tong_thanh_toan)}
                    </strong>
                  </td>
                  <td className="order-actions-cell">
                    <div className="order-row-actions">
                      <button
                        className="order-detail-button"
                        type="button"
                        disabled={state.loading}
                        onClick={() =>
                          navigate(
                            `/admin/don-hang/danh-sach-don-hang/${order.id}`,
                          )
                        }
                      >
                        XEM CHI TIẾT
                      </button>

                      {Number(order.phieu_giao_hang_gan_nhat_id) > 0 && (
                        <button
                          className="order-detail-button order-shipment-button"
                          type="button"
                          disabled={state.loading}
                          onClick={() =>
                            navigate(
                              `/admin/don-hang/quan-ly-giao-hang/${order.phieu_giao_hang_gan_nhat_id}`,
                            )
                          }
                        >
                          XEM PHIẾU GIAO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!state.loading && !data.items.length && (
                <tr className="order-empty-row">
                  <td colSpan="10">Không tìm thấy đơn hàng phù hợp.</td>
                </tr>
              )}
              {state.loading && (
                <tr className="order-empty-row">
                  <td colSpan="10">Đang tải dữ liệu...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="order-list-footer">
          <p>
            HIỂN THỊ {data.items.length} TRÊN TỔNG SỐ {total} ĐƠN HÀNG
          </p>
          <TablePagination
            currentPage={page}
            pageSize={PAGE_SIZE}
            totalItems={total}
            onPageChange={setPage}
            idPrefix="orders"
          />
        </div>
      </section>
    </>
  );
}

function Advanced({ label: text, children }) {
  return (
    <label className="order-advanced-field">
      <span>{text}</span>
      {children}
    </label>
  );
}
export function OrderStateBadge({ value }) {
  const text = label(value);
  const variant = [
    "ONLINE",
    "DANG_GIAO_HANG",
    "CHO_DONG_GOI",
    "DANG_DONG_GOI",
  ].includes(value)
    ? "blue"
    : value === "CHO_LAY_HANG"
      ? "purple"
      : ["HUY_HANG", "HUY_DONG_GOI"].includes(value)
        ? "red"
        : ["CHO_DUYET", "CHO_THANH_TOAN", "CHUA_THANH_TOAN"].includes(value)
          ? "amber"
          : [
                "HOAN_THANH",
                "DA_THANH_TOAN",
                "DA_DONG_GOI",
                "DA_XUAT_KHO",
              ].includes(value)
            ? "green"
            : "neutral";
  return (
    <span className={`order-state-badge order-state-badge--${variant}`}>
      {text.toUpperCase()}
    </span>
  );
}
