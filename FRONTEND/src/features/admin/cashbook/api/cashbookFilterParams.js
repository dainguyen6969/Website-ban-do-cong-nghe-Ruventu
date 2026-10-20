const sourceFields = [
  "hoa_don_bao_hanh_id",
  "phieu_bao_hanh_id",
  "phieu_tra_hang_id",
  "nghiep_vu_nguon",
];

export function createCashbookSourceFilters(params) {
  return Object.fromEntries(
    sourceFields.map((field) => [field, params?.get?.(field) || ""]),
  );
}

export function cashbookSourceParams(filters) {
  return Object.fromEntries(
    sourceFields
      .map((field) => [field, String(filters?.[field] ?? "").trim()])
      .filter((entry) => entry[1] !== ""),
  );
}
