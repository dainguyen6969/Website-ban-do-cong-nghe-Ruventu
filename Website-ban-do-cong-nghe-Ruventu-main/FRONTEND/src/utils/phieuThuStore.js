let MOCK_PHIEU_THU = [
  {
    id: "PT0001006",
    nguoiNop: "ASUS Vietnam Co.",
    nhom: "NHÀ CUNG CẤP",
    maLoai: "LPT005",
    tenLoai: "Thu phí dịch vụ",
    phuongThuc: "CHUYỂN KHOẢN",
    nguoiTao: "Nguyễn Thị Lan",
    soTien: "3500000",
    ngayGhiNhan: "15/09/2026 10:00",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "DN-008",
    moTa: "Thu phí bảo hành"
  },
  {
    id: "PT0001005",
    nguoiNop: "Vũ Thị Ngọc",
    nhom: "KHÁCH HÀNG",
    maLoai: "LPT003",
    tenLoai: "Thu đặt cọc",
    phuongThuc: "TIỀN MẶT",
    nguoiTao: "Trần Minh Quân",
    soTien: "2000000",
    ngayGhiNhan: "14/09/2026 15:00",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ HỦY",
    chungTu: "",
    moTa: "Khách hủy cọc"
  },
  {
    id: "PT0001004",
    nguoiNop: "Phạm Quốc Hùng",
    nhom: "KHÁCH HÀNG",
    maLoai: "LPT002",
    tenLoai: "Thu nợ khách hàng",
    phuongThuc: "CHUYỂN KHOẢN",
    nguoiTao: "Nguyễn Thị Lan",
    soTien: "8990000",
    ngayGhiNhan: "13/09/2026 11:00",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "DN-005",
    moTa: "Thu nợ cũ"
  },
  {
    id: "PT0001003",
    nguoiNop: "Trần Văn Bình",
    nhom: "NHÂN VIÊN",
    maLoai: "LPT004",
    tenLoai: "Thu hoàn ứng",
    phuongThuc: "TIỀN MẶT",
    nguoiTao: "Trần Minh Quân",
    soTien: "500000",
    ngayGhiNhan: "12/09/2026 09:00",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "",
    moTa: "Hoàn ứng công tác"
  },
  {
    id: "PT0001002",
    nguoiNop: "Hoàng Minh Khoa",
    nhom: "KHÁCH HÀNG",
    maLoai: "LPT001",
    tenLoai: "Thu bán hàng",
    phuongThuc: "CHUYỂN KHOẢN",
    nguoiTao: "HỆ THỐNG",
    soTien: "12800000",
    ngayGhiNhan: "10/09/2026 14:30",
    nguonTao: "TỰ ĐỘNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "ORD-1234",
    moTa: "Thanh toán đơn hàng ORD-1234"
  },
  {
    id: "PT0001001",
    nguoiNop: "Nguyễn Thị Lan",
    nhom: "KHÁCH HÀNG",
    maLoai: "LPT001",
    tenLoai: "Thu bán hàng",
    phuongThuc: "TIỀN MẶT",
    nguoiTao: "Trần Minh Quân",
    soTien: "5200000",
    ngayGhiNhan: "10/09/2026 09:00",
    nguonTao: "TỰ ĐỘNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "ORD-1233",
    moTa: "Thanh toán đơn hàng ORD-1233"
  }
];

export const getPhieuThuList = () => {
  return [...MOCK_PHIEU_THU];
};

export const getPhieuThuById = (id) => {
  return MOCK_PHIEU_THU.find(p => p.id === id);
};

export const createPhieuThu = (phieu) => {
  const generatedId = `PT${Math.floor(1000000 + Math.random() * 9000000)}`;
  const newPhieu = {
    ...phieu,
    id: phieu.id || generatedId,
    nguoiTao: "Admin Tổng",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ GHI NHẬN",
  };
  MOCK_PHIEU_THU.unshift(newPhieu);
  return newPhieu;
};

export const cancelPhieuThu = (id) => {
  const index = MOCK_PHIEU_THU.findIndex(p => p.id === id);
  if (index !== -1) {
    MOCK_PHIEU_THU[index] = { ...MOCK_PHIEU_THU[index], trangThai: "ĐÃ HỦY" };
  }
};
