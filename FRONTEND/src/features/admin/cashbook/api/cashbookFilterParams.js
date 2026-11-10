const sourceFields = [
  "keyword",
  "loai_thu_chi_id",
  "nhom_nguoi_nop_nhan",
  "nguoi_nop_nhan_id",
  "nha_cung_cap_id",
  "doi_tac_van_chuyen_id",
  "nguoi_tao_id",
  "nguon_tao",

  "hoa_don_bao_hanh_id",
  "phieu_bao_hanh_id",
  "phieu_tra_hang_id",
  "nghiep_vu_nguon",
];

export function createCashbookSourceFilters(params) {
  return Object.fromEntries(
    sourceFields.map((field) => [
      field,
      String(params?.get?.(field) ?? "").trim(),
    ]),
  );
}

export function cashbookSourceParams(filters) {
  return Object.fromEntries(
    sourceFields
      .map((field) => [field, String(filters?.[field] ?? "").trim()])
      .filter(([, value]) => value !== ""),
  );
}
