import "./OrderSaleDetails.css";

const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const money = (value) => formatter.format(Number(value));

const usageLabels = {
  GIU_CHO: "Đang giữ lượt",
  DA_SU_DUNG: "Đã sử dụng",
  DA_GIAI_PHONG: "Đã giải phóng",
};

export function OrderLineNotice({ item }) {
  return (
    <>
      {item.la_qua_tang && <span className="sale-history-gift">QUÀ TẶNG</span>}

      {item.canh_bao_du_lieu && (
        <p className="sale-history-warning">{item.canh_bao_du_lieu}</p>
      )}
    </>
  );
}

export function OrderLineAmount({ item }) {
  return (
    <div className="sale-history-amount">
      <strong>
        {item.thanh_toan_dong == null
          ? "Chưa có dữ liệu"
          : money(item.thanh_toan_dong)}
      </strong>

      {Number(item.tien_chiet_khau) > 0 && (
        <small>Giảm {money(item.tien_chiet_khau)}</small>
      )}

      {item.tien_vat != null && <small>VAT {money(item.tien_vat)}</small>}
    </div>
  );
}

export function OrderPromotionSummary({ order, showUsage = false }) {
  const promotion = order?.khuyen_mai;

  if (!promotion) {
    return (
      <p className="sale-history-note">
        {Number(order?.tien_chiet_khau) > 0
          ? "Đơn cũ chưa có bản chụp chương trình khuyến mại."
          : "Không áp dụng khuyến mại."}
      </p>
    );
  }

  return (
    <div className="sale-history-promotion">
      <strong>{promotion.ten_chuong_trinh}</strong>
      <span>{promotion.ma_chuong_trinh}</span>

      <p>Giảm trên đơn: {money(promotion.so_tien_giam)}</p>

      {showUsage && (
        <small>
          {usageLabels[promotion.trang_thai_ap_dung] ||
            promotion.trang_thai_ap_dung}
        </small>
      )}

      {promotion.canh_bao_du_lieu && (
        <p className="sale-history-warning">{promotion.canh_bao_du_lieu}</p>
      )}
    </div>
  );
}
