export const PERIODS = {
  HOM_NAY: "Hôm nay",
  HOM_QUA: "Hôm qua",
  TUAN_NAY: "Tuần này",
  THANG_NAY: "Tháng này",
  NAM_NAY: "Năm nay",
  TUY_CHINH: "Tùy chỉnh",
};
export const CHANNELS = {
  TAT_CA: "Tất cả",
  ONLINE: "Online",
  TAI_QUAY: "Tại quầy",
};
export const CASH_FILTERS = [
  "tu_ngay",
  "den_ngay",
  "keyword",
  "loai_phieu",
  "loai_thu_chi_id",
  "phuong_thuc_thanh_toan",
  "nhom_nguoi_nop_nhan",
  "nguoi_nop_nhan_id",
  "nha_cung_cap_id",
  "doi_tac_van_chuyen_id",
  "ten_nguoi_nop_nhan",
  "nguoi_tao_id",
  "nguon_tao",
  "hoa_don_bao_hanh_id",
  "phieu_bao_hanh_id",
  "phieu_tra_hang_id",
  "nghiep_vu_nguon",
];
export const queryString = (values) =>
  new URLSearchParams(
    Object.entries(values).filter(([, value]) => value != null && value !== ""),
  ).toString();
export const cashbookQuery = (values) =>
  queryString(
    Object.fromEntries(CASH_FILTERS.map((key) => [key, values[key]])),
  );

export function dateRange(period, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const from = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  const to = new Date(from);
  switch (period) {
    case "HOM_NAY":
      break;
    case "HOM_QUA":
      from.setUTCDate(from.getUTCDate() - 1);
      to.setUTCDate(to.getUTCDate() - 1);
      break;
    case "TUAN_NAY":
      from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));
      to.setTime(from.getTime());
      to.setUTCDate(to.getUTCDate() + 6);
      break;
    case "THANG_NAY":
      from.setUTCDate(1);
      to.setUTCMonth(to.getUTCMonth() + 1, 0);
      break;
    case "NAM_NAY":
      from.setUTCMonth(0, 1);
      to.setUTCMonth(11, 31);
      break;
    default:
      throw new Error("Kỳ thống kê không hợp lệ.");
  }
  return {
    tu_ngay: from.toISOString().slice(0, 10),
    den_ngay: to.toISOString().slice(0, 10),
  };
}

export function validateDates(from, to) {
  const valid = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to))
    throw new Error("Vui lòng chọn ngày bắt đầu và ngày kết thúc hợp lệ.");
  if (from > to)
    throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
}

export function businessChartData(chart, field) {
  const length = Math.max(chart.ky_hien_tai.length, chart.ky_truoc.length);
  return {
    labels: Array.from(
      { length },
      (_, i) => chart.ky_hien_tai[i]?.tu_ngay || `Mốc ${i + 1}`,
    ),
    datasets: [
      {
        label: "Kỳ hiện tại",
        borderColor: "#E31E24",
        backgroundColor: "#E31E24",
        data: Array.from(
          { length },
          (_, i) => chart.ky_hien_tai[i]?.[field] ?? null,
        ),
        pointRadius: 2,
      },
      {
        label: "Kỳ trước",
        borderColor: "#888",
        backgroundColor: "#888",
        borderDash: [5, 5],
        data: Array.from(
          { length },
          (_, i) => chart.ky_truoc[i]?.[field] ?? null,
        ),
        pointRadius: 2,
      },
    ],
  };
}
