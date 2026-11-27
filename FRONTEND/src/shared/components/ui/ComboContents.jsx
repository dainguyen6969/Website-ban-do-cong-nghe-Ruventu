import { Link } from "react-router-dom";
import "./ComboContents.css";

export default function ComboContents({
  items = [],
  order = false,
  compact = false,
  scrollable = false,
}) {
  const parts = Array.isArray(items) ? items : [];

  return (
    <section
      className={["combo-contents", compact ? "combo-contents--compact" : "", scrollable ? "combo-contents--scrollable" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Danh sách linh kiện bộ PC"
    >
      <div className="combo-contents__header">
        <b>{order ? "LINH KIỆN TRONG ĐƠN" : "CẤU HÌNH BỘ PC"}</b>
        <small>{parts.length} loại linh kiện</small>
      </div>

      {parts.length === 0 ? (
        <p className="combo-contents__empty">Chưa có cấu hình linh kiện.</p>
      ) : (
        <ul className="combo-contents__list" tabIndex={scrollable ? 0 : undefined} aria-label={scrollable ? 'Cuộn xem linh kiện trong bộ PC' : undefined}>
          {parts.map((part) => (
            <li className="combo-contents__item" key={part.phien_ban_id}>
              <div className="combo-contents__image">
                <small aria-hidden="true">PC</small>

                {part.anh_chinh && (
                  <img
                    key={part.anh_chinh}
                    src={part.anh_chinh}
                    alt={part.ten_san_pham || "Linh kiện"}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                )}
              </div>

              <div className="combo-contents__info">
                {part.san_pham_id && part.co_trang_chi_tiet !== false ? (
                  <Link to={`/product/${part.san_pham_id}`}>
                    {part.ten_san_pham}
                  </Link>
                ) : (
                  <b title={part.co_trang_chi_tiet === false ? 'Linh kiện chưa có trang chi tiết công khai' : undefined}>
                    {part.ten_san_pham || "Linh kiện"}
                  </b>
                )}

                <small>Phiên bản: {part.ten_phien_ban || "—"}</small>

                {part.ma_san_pham && <small>Mã SP: {part.ma_san_pham}</small>}

                {order && (
                  <small>Mỗi bộ: {part.so_luong_trong_bo ?? "—"}</small>
                )}
              </div>

              <div className="combo-contents__quantity">
                <b>
                  ×
                  {order
                    ? (part.so_luong_tong ?? "—")
                    : (part.so_luong_trong_bo ?? "—")}
                </b>
                <small>{order ? "Trong đơn" : "Mỗi bộ"}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
