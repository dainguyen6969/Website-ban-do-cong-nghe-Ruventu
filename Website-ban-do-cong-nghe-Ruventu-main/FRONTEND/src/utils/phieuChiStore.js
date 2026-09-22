let MOCK_PHIEU_CHI = [
  {
    id: "PC0002005",
    nguoiNhan: "Nguyễn Thị Lan",
    chucVu: "Nhân viên",
    nhomDoiTuong: "NHÂN VIÊN",
    maLoai: "LPC004",
    tenLoai: "Chi lương nhân viên",
    phuongThuc: "TIỀN MẶT",
    nguoiTao: "Trần Minh Quân",
    soTien: "12000000",
    ngayGhiNhan: "16/09/2026 09:00",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "-",
    moTa: "Chi lương tháng 9/2026",
    tags: []
  },
  {
    id: "PC0002004",
    nguoiNhan: "GHN Express",
    chucVu: "Đối tác giao hàng",
    nhomDoiTuong: "ĐỐI TÁC GIAO HÀNG",
    maLoai: "LPC003",
    tenLoai: "Chi phí vận chuyển",
    phuongThuc: "CHUYỂN KHOẢN",
    nguoiTao: "Nguyễn Thị Lan",
    soTien: "1250000",
    ngayGhiNhan: "15/09/2026 08:00",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ HỦY",
    chungTu: "HD-0012",
    moTa: "Thanh toán cước vận chuyển",
    tags: []
  },
  {
    id: "PC0002001",
    nguoiNhan: "Trần Văn Bình",
    chucVu: "Nhân viên",
    nhomDoiTuong: "NHÂN VIÊN",
    maLoai: "LPC015",
    tenLoai: "Chi tạm ứng nhân viên",
    phuongThuc: "TIỀN MẶT",
    nguoiTao: "Trần Minh Quân",
    soTien: "500000",
    ngayGhiNhan: "14/09/2026 09:00",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "-",
    moTa: "Tạm ứng mua văn phòng phẩm",
    tags: []
  },
  {
    id: "PC0002003",
    nguoiNhan: "Hoàng Minh Khoa",
    chucVu: "Khách hàng",
    nhomDoiTuong: "KHÁCH HÀNG",
    maLoai: "LPC002",
    tenLoai: "Chi hoàn tiền khách hàng",
    phuongThuc: "CHUYỂN KHOẢN",
    nguoiTao: "HỆ THỐNG",
    soTien: "2800000",
    ngayGhiNhan: "13/09/2026 10:30",
    nguonTao: "TỰ ĐỘNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "ORD-RET-01",
    moTa: "Hoàn tiền trả hàng",
    tags: []
  },
  {
    id: "PC0002002",
    nguoiNhan: "ASUS Vietnam Co.",
    chucVu: "Nhà cung cấp",
    nhomDoiTuong: "NHÀ CUNG CẤP",
    maLoai: "LPC001",
    tenLoai: "Chi nhập hàng",
    phuongThuc: "CHUYỂN KHOẢN",
    nguoiTao: "HỆ THỐNG",
    soTien: "48500000",
    ngayGhiNhan: "12/09/2026 14:00",
    nguonTao: "TỰ ĐỘNG",
    trangThai: "ĐÃ GHI NHẬN",
    chungTu: "PO-0926-01",
    moTa: "Thanh toán lô hàng mainboard",
    tags: []
  }
];

export const getPhieuChiList = () => {
  return [...MOCK_PHIEU_CHI];
};

export const getPhieuChiById = (id) => {
  return MOCK_PHIEU_CHI.find(p => p.id === id);
};

export const createPhieuChi = (phieu) => {
  const newIdNumber = parseInt(MOCK_PHIEU_CHI[0].id.replace("PC", "")) + 1;
  const generatedId = "PC" + newIdNumber.toString().padStart(7, "0");
  const newId = phieu.id || generatedId;
  
  const now = new Date();
  // We use the provided ngayGhiNhan, else current date
  const ngayGhiNhan = phieu.ngayGhiNhan || `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const newPhieu = {
    ...phieu,
    id: newId,
    nguoiTao: "Admin Tổng",
    nguonTao: "THỦ CÔNG",
    trangThai: "ĐÃ GHI NHẬN",
    ngayGhiNhan: ngayGhiNhan,
    chucVu: phieu.nhomDoiTuong === "NHÂN VIÊN" ? "Nhân viên" : 
            (phieu.nhomDoiTuong === "KHÁCH HÀNG" ? "Khách hàng" : 
            (phieu.nhomDoiTuong === "NHÀ CUNG CẤP" ? "Nhà cung cấp" : "Khác")),
    chungTu: phieu.chungTu || "-"
  };
  MOCK_PHIEU_CHI.unshift(newPhieu);
  return newPhieu;
};

export const cancelPhieuChi = (id) => {
  const index = MOCK_PHIEU_CHI.findIndex(p => p.id === id);
  if (index !== -1) {
    MOCK_PHIEU_CHI[index] = { ...MOCK_PHIEU_CHI[index], trangThai: "ĐÃ HỦY" };
  }
};
