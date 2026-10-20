export function customerOrderProgress(order) {
  const pickup = order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG';
  const stages = ['ĐẶT HÀNG', 'CHỜ XÁC NHẬN', 'ĐÓNG GÓI', pickup ? 'CHỜ NHẬN HÀNG' : 'ĐANG GIAO', 'HOÀN THÀNH'];
  const current = {
    CHO_DUYET: 1, CHO_THANH_TOAN: 2, CHO_DONG_GOI: 2,
    CHO_LAY_HANG: 3, DANG_GIAO_HANG: 3, HOAN_THANH: 4,
  }[order.trang_thai_don_hang];
  return stages.map((title, index) => ({
    title,
    state: current == null ? (index === 0 ? 'done' : 'pending')
      : index < current ? 'done' : index === current ? 'active' : 'pending',
  }));
}
