export const SERIAL_STATUS_META = {
  TRONG_KHO: {
    label: "Trong kho",
    key: "stock",
    description: "Serial đang trong kho cửa hàng.",
  },

  DA_BAN: {
    label: "Đã bán",
    key: "sold",
    description: "Serial đã được xuất bán.",
  },

  DANG_BAO_HANH: {
    label: "Đang bảo hành",
    key: "warranty",
    description: "Serial đang được xử lý bảo hành.",
  },

  LOI: {
    label: "Lỗi",
    key: "error",
    description: "Serial được ghi nhận là hàng lỗi.",
  },

  GIU_CHO_BAO_HANH: {
    label: "Giữ cho bảo hành",
    key: "held",
    description:
      "Serial đang được giữ cho nghiệp vụ bảo hành.",
  },

  DA_THAY_THE_BAO_HANH: {
    label: "Đã thay thế bảo hành",
    key: "replaced",
    description:
      "Serial cũ đã được thay bằng thiết bị khác.",
  },
};

export const nextWarehouseStatus = (status) =>
  ({
    TRONG_KHO: "LOI",
    LOI: "TRONG_KHO",
  })[status] || null;