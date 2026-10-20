import { createCashbookSourceFilters } from "../api/cashbookFilterParams";

import "./CashbookSourceFilters.css";

const idFields = [
  ["hoa_don_bao_hanh_id", "HÓA ĐƠN BẢO HÀNH ID"],
  ["phieu_bao_hanh_id", "PHIẾU BẢO HÀNH ID"],
  ["phieu_tra_hang_id", "PHIẾU TRẢ HÀNG ID"],
];

const businesses = [
  ["THU_KHACH_BAO_HANH", "Thu khách bảo hành"],
  ["HOAN_KHACH_BAO_HANH", "Hoàn khách bảo hành"],
  ["CHI_DON_VI_BAO_HANH", "Chi đơn vị bảo hành"],
  ["THU_HOAN_DON_VI_BAO_HANH", "Thu hoàn từ đơn vị bảo hành"],
  ["HOAN_TIEN_TRA_HANG", "Hoàn tiền trả hàng"],
];

export default function CashbookSourceFilters({
  value,
  onChange,
  applyRequired = false,
}) {
  const update = (field, nextValue) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  return (
    <section className="cb-source-filters">
      <div className="cb-source-filters__heading">
        <strong>LIÊN KẾT NGHIỆP VỤ</strong>

        <button
          type="button"
          onClick={() => onChange(createCashbookSourceFilters())}
        >
          XÓA LỌC NGUỒN
        </button>
      </div>

      <div className="cb-source-filters__grid">
        {idFields.map(([field, title]) => (
          <label key={field}>
            <span>{title}</span>

            <input
              type="text"
              inputMode="numeric"
              value={value[field]}
              placeholder="Nhập ID"
              onChange={(event) => update(field, event.target.value)}
            />
          </label>
        ))}

        <label>
          <span>NGHIỆP VỤ NGUỒN</span>

          <select
            value={value.nghiep_vu_nguon}
            onChange={(event) => update("nghiep_vu_nguon", event.target.value)}
          >
            <option value="">TẤT CẢ</option>

            {businesses.map(([code, title]) => (
              <option value={code} key={code}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {applyRequired && (
        <p className="cb-source-filters__hint">
          Chọn ÁP DỤNG để tải dữ liệu theo bộ lọc đã nhập.
        </p>
      )}
    </section>
  );
}
