export const money = value => value == null ? '—' : Number(value).toLocaleString('vi-VN') + 'đ';

// BE dùng biên bao gồm; giá DB có 2 số thập phân nên các khoảng không chồng nhau.
export const pcBuilderPriceBands = [
  { value: 'ALL', label: 'TẤT CẢ', min: '', max: '' },
  { value: 'UNDER_5M', label: 'DƯỚI 5 TRIỆU', min: '', max: '4999999.99' },
  { value: '5M_15M', label: '5 – 15 TRIỆU', min: '5000000', max: '15000000' },
  { value: 'OVER_15M', label: 'TRÊN 15 TRIỆU', min: '15000000.01', max: '' },
];

export const socketLabels = {
  KHOP_SOCKET: 'Khớp socket',
  KHONG_KHOP_SOCKET: 'Không khớp socket',
  CHUA_DU_DU_LIEU: 'Chưa đủ dữ liệu socket',
  CHUA_CHON_DU: 'Chưa chọn đủ CPU và Mainboard',
};

export function buildItems(selections) {
  return Object.entries(selections).map(([ma_hang_muc, item]) => ({
    ma_hang_muc, phien_ban_id: item.phien_ban_id, so_luong: item.so_luong,
  }));
}

export function availableQuantity(product, slotCode, selections, stock = product.ton_co_the_ban) {
  const elsewhere = Object.entries(selections).reduce((total, [code, item]) =>
    total + (code !== slotCode && item.phien_ban_id === product.phien_ban_id ? item.so_luong : 0), 0);
  return Math.max(0, stock - elsewhere);
}

export function confirmedBuild(preview) {
  if (!preview?.co_the_gui_yeu_cau_them_gio || !preview.items?.length) {
    throw new Error('Cấu hình chưa đủ điều kiện thêm vào giỏ hàng.');
  }
  return { items: preview.items.map(item => {
    if (!Number.isFinite(item.don_gia) || item.don_gia < 0) {
      throw new Error('Chưa có đơn giá xác nhận. Vui lòng tính lại cấu hình.');
    }
    return {
      ma_hang_muc: item.ma_hang_muc, phien_ban_id: item.phien_ban_id,
      so_luong: item.so_luong, don_gia_xac_nhan: item.don_gia,
    };
  }) };
}
