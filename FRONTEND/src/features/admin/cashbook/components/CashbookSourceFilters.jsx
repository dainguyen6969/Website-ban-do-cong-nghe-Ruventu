import { createCashbookSourceFilters } from "../api/cashbookFilterParams";

import "./CashbookSourceFilters.css";

const sourceIdFields = [
  ["hoa_don_bao_hanh_id", "HÓA ĐƠN BẢO HÀNH ID"],
  ["phieu_bao_hanh_id", "PHIẾU BẢO HÀNH ID"],
  ["phieu_tra_hang_id", "PHIẾU TRẢ HÀNG ID"],
];

const extendedIdFields = [
  ["loai_thu_chi_id", "LOẠI THU / CHI ID"],
  ["nguoi_nop_nhan_id", "KHÁCH HÀNG / NHÂN VIÊN ID"],
  ["nha_cung_cap_id", "NHÀ CUNG CẤP ID"],
  ["doi_tac_van_chuyen_id", "ĐỐI TÁC VẬN CHUYỂN ID"],
  ["nguoi_tao_id", "NGƯỜI TẠO ID"],
];

const groups = [
  ["KHACH_HANG", "Khách hàng"],
  ["NHAN_VIEN", "Nhân viên"],
  ["NHA_CUNG_CAP", "Nhà cung cấp"],
  ["DOI_TAC_GIAO_HANG", "Đối tác giao hàng"],
  ["KHAC", "Khác"],
];

const sources = [
  ["THU_CONG", "Thủ công"],
  ["TU_DONG", "Tự động"],
];

const businesses = [
  ["THU_KHACH_BAO_HANH", "Thu khách bảo hành"],
  ["HOAN_KHACH_BAO_HANH", "Hoàn khách bảo hành"],
  ["CHI_DON_VI_BAO_HANH", "Chi đơn vị bảo hành"],
  ["THU_HOAN_DON_VI_BAO_HANH", "Thu hoàn từ đơn vị bảo hành"],
  ["HOAN_TIEN_TRA_HANG", "Hoàn tiền trả hàng"],
];

export default function CashbookSourceFilters({
  value = {},
  onChange,
  applyRequired = false,
  extended = false,
}) {
  const update = (field, nextValue) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  const selectField = (field, title, options) => (
    <label>
      <span>{title}</span>

      <select
        value={value[field] ?? ""}
        onChange={(event) => update(field, event.target.value)}
      >
        <option value="">TẤT CẢ</option>

        {options.map(([code, label]) => (
          <option value={code} key={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );

  const idFields = extended
    ? [...extendedIdFields, ...sourceIdFields]
    : sourceIdFields;

  return (
    <section className="cb-source-filters">
      <div className="cb-source-filters__heading">
        <strong>
          {extended
            ? "BỘ LỌC BỔ SUNG / LIÊN KẾT NGHIỆP VỤ"
            : "LIÊN KẾT NGHIỆP VỤ"}
        </strong>

        <button
          type="button"
          onClick={() => onChange(createCashbookSourceFilters())}
        >
          {extended ? "XÓA LỌC BỔ SUNG" : "XÓA LỌC NGUỒN"}
        </button>
      </div>

      <div className="cb-source-filters__grid">
        {extended && (
          <>
            <label>
              <span>TỪ KHÓA</span>

              <input
                type="text"
                value={value.keyword ?? ""}
                placeholder="Nhập từ khóa tìm phiếu..."
                onChange={(event) => update("keyword", event.target.value)}
              />
            </label>

            {selectField(
              "nhom_nguoi_nop_nhan",
              "NHÓM NGƯỜI NỘP / NHẬN",
              groups,
            )}

            {selectField("nguon_tao", "NGUỒN TẠO", sources)}
          </>
        )}

        {idFields.map(([field, title]) => (
          <label key={field}>
            <span>{title}</span>

            <input
              type="text"
              inputMode="numeric"
              value={value[field] ?? ""}
              placeholder="Nhập ID"
              onChange={(event) => update(field, event.target.value)}
            />
          </label>
        ))}

        {selectField("nghiep_vu_nguon", "NGHIỆP VỤ NGUỒN", businesses)}
      </div>

      {applyRequired && (
        <p className="cb-source-filters__hint">
          Chọn ÁP DỤNG để tải dữ liệu theo bộ lọc đã nhập.
        </p>
      )}
    </section>
  );
}
