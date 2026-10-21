import { isWaitingCodSettlement } from '../../features/admin/orders/api/orderApi';

export function customerOrderProgress(order) {
  const pickup = order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG';

  const waitingCod = isWaitingCodSettlement(order);

  const completed = order.trang_thai_don_hang === 'HOAN_THANH' && !waitingCod;

  const stages = [
    'ĐẶT HÀNG',
    order.trang_thai_don_hang === 'CHO_THANH_TOAN' ? 'CHỜ THANH TOÁN' : 'CHỜ XÁC NHẬN',
    'ĐÓNG GÓI',
    waitingCod ? 'ĐÃ NHẬN HÀNG' : pickup ? 'CHỜ NHẬN HÀNG' : 'GIAO HÀNG',
    waitingCod ? 'ĐANG HOÀN TẤT ĐƠN' : 'HOÀN THÀNH',
  ];

  const current = waitingCod
    ? 4
    : {
        CHO_DUYET: 1,
        CHO_THANH_TOAN: 1,
        CHO_DONG_GOI: 2,
        CHO_LAY_HANG: 3,
        DANG_GIAO_HANG: 3,
        HOAN_THANH: 4,
      }[order.trang_thai_don_hang];

  return stages.map((title, index) => ({
    title,
    state:
      current == null
        ? index === 0
          ? 'done'
          : 'pending'
        : completed || index < current
          ? 'done'
          : index === current
            ? 'active'
            : 'pending',
  }));
}
