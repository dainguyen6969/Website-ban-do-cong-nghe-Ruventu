let MOCK_LOAI_PHIEU_THU = [
  { maLoai: "LPT001", tenLoai: "Thu bán hàng", loaiPhieu: "THU", ghiChu: "Doanh thu từ bán hàng tại quầy và online", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPT002", tenLoai: "Thu nợ khách hàng", loaiPhieu: "THU", ghiChu: "Thu hồi công nợ từ khách hàng", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPT003", tenLoai: "Thu đặt cọc", loaiPhieu: "THU", ghiChu: "Khách hàng đặt cọc giữ hàng hoặc dịch vụ", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPT004", tenLoai: "Thu hoàn ứng", loaiPhieu: "THU", ghiChu: "Nhân viên hoàn lại tiền tạm ứng còn thừa", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPT005", tenLoai: "Thu phí dịch vụ", loaiPhieu: "THU", ghiChu: "-", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPT006", tenLoai: "Thu bồi thường", loaiPhieu: "THU", ghiChu: "Thu bồi thường từ đối tác, nhà cung cấp", trangThai: "NGỪNG HOẠT ĐỘNG" }
];

export const getLoaiPhieuThuList = () => {
  return [...MOCK_LOAI_PHIEU_THU];
};

export const getLoaiPhieuThuById = (id) => {
  return MOCK_LOAI_PHIEU_THU.find(p => p.maLoai === id);
};

export const updateLoaiPhieuThuStatus = (id, newStatus) => {
  const index = MOCK_LOAI_PHIEU_THU.findIndex(p => p.maLoai === id);
  if (index !== -1) {
    MOCK_LOAI_PHIEU_THU[index] = { ...MOCK_LOAI_PHIEU_THU[index], trangThai: newStatus };
  }
};

export const createLoaiPhieuThu = (newLoai) => {
  const item = {
    ...newLoai,
    loaiPhieu: "THU",
    trangThai: "HOẠT ĐỘNG"
  };
  MOCK_LOAI_PHIEU_THU.unshift(item);
  return item;
};
