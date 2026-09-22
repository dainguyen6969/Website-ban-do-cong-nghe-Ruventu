let MOCK_LOAI_PHIEU_CHI = [
  { maLoai: "LPC001", tenLoai: "Chi nhập hàng", loaiPhieu: "CHI", ghiChu: "Thanh toán tiền mua hàng hóa", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPC002", tenLoai: "Chi hoàn tiền khách hàng", loaiPhieu: "CHI", ghiChu: "Trả lại tiền cho khách do trả hàng, hủy đơn", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPC003", tenLoai: "Chi phí vận chuyển", loaiPhieu: "CHI", ghiChu: "Chi trả cước vận chuyển, giao hàng", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPC004", tenLoai: "Chi lương nhân viên", loaiPhieu: "CHI", ghiChu: "Thanh toán lương định kỳ", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPC015", tenLoai: "Chi tạm ứng nhân viên", loaiPhieu: "CHI", ghiChu: "Cho nhân viên ứng lương hoặc đi công tác", trangThai: "HOẠT ĐỘNG" },
  { maLoai: "LPC020", tenLoai: "Chi phí thuê mặt bằng", loaiPhieu: "CHI", ghiChu: "Thanh toán tiền thuê cửa hàng, kho bãi", trangThai: "NGỪNG HOẠT ĐỘNG" }
];

export const getLoaiPhieuChiList = () => {
  return [...MOCK_LOAI_PHIEU_CHI];
};

export const createLoaiPhieuChi = (newLoai) => {
  const item = {
    ...newLoai,
    loaiPhieu: "CHI",
    trangThai: "HOẠT ĐỘNG"
  };
  MOCK_LOAI_PHIEU_CHI.unshift(item);
  return item;
};

export const getLoaiPhieuChiById = (id) => {
  return MOCK_LOAI_PHIEU_CHI.find(item => item.maLoai === id);
};

export const updateLoaiPhieuChiStatus = (id, newStatus) => {
  const index = MOCK_LOAI_PHIEU_CHI.findIndex(item => item.maLoai === id);
  if (index !== -1) {
    MOCK_LOAI_PHIEU_CHI[index].trangThai = newStatus;
  }
};
