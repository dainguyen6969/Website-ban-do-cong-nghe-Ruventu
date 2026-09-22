const MOCK_PROMOTIONS = [
  { id: 'SALE100K', name: 'Giảm 100 nghìn cho đơn hàng', method: 'CHIẾT KHẤU', target: 'TỔNG ĐƠN HÀNG', status: 'ĐANG ÁP DỤNG', description: 'Giảm 100k trên tổng tiền hàng', configType: 'GIẢM TIỀN TRÊN TỔNG ĐƠN', discountValue: '100000', usageMax: 100, usageUsed: 23, usageRemaining: 77, startDate: '2026-09-12T00:00', endDate: '2026-09-30T23:59', timeRemaining: '14 NGÀY', remaining: '77 LƯỢT', start: '12/09/2026', end: '30/09/2026' },
  { id: 'GIAMRAM50K', name: 'Giảm 50 nghìn mỗi RAM', method: 'CHIẾT KHẤU', target: 'PHIÊN BẢN SẢN PHẨM', status: 'ĐANG ÁP DỤNG', description: 'Giảm 50k cho mỗi thanh RAM', configType: 'GIẢM TIỀN SẢN PHẨM', discountValue: '50000', usageMax: 9999, usageUsed: 125, usageRemaining: 'KHÔNG GIỚI HẠN', startDate: '2026-09-12T00:00', endDate: '2026-09-30T23:59', timeRemaining: '14 NGÀY', remaining: 'KHÔNG GIỚI HẠN', start: '12/09/2026', end: '30/09/2026' },
  { id: 'MUARAMTANGCHUOT', name: 'Mua RAM tặng chuột', method: 'TẶNG SẢN PHẨM', target: 'PHIÊN BẢN SẢN PHẨM', status: 'ĐANG ÁP DỤNG', description: 'Mua 1 RAM bất kỳ tặng 1 chuột gaming', configType: 'TẶNG QUÀ THEO SẢN PHẨM', discountValue: '0', usageMax: 100, usageUsed: 58, usageRemaining: 42, startDate: '2026-09-12T00:00', endDate: '2026-09-30T23:59', timeRemaining: '14 NGÀY', remaining: '42 LƯỢT', start: '12/09/2026', end: '30/09/2026' },
  { id: 'NEWUSER200K', name: 'Ưu đãi khách hàng mới 200k', method: 'CHIẾT KHẤU', target: 'TỔNG ĐƠN HÀNG', status: 'HẾT LƯỢT', description: 'Giảm 200k cho khách hàng lần đầu', configType: 'GIẢM TIỀN TRÊN TỔNG ĐƠN', discountValue: '200000', usageMax: 50, usageUsed: 50, usageRemaining: 0, startDate: '2026-08-01T00:00', endDate: '2026-08-31T23:59', timeRemaining: 'ĐÃ KẾT THÚC', remaining: '0 LƯỢT', start: '01/08/2026', end: '31/08/2026' },
  { id: 'FLASH1010', name: 'Flash sale 10/10', method: 'CHIẾT KHẤU', target: 'TỔNG ĐƠN HÀNG', status: 'CHƯA BẮT ĐẦU', description: 'Giảm 10% dịp sale 10/10', configType: 'GIẢM PHẦN TRĂM THEO ĐƠN', discountValue: '10', usageMax: 500, usageUsed: 0, usageRemaining: 500, startDate: '2026-10-10T00:00', endDate: '2026-10-10T23:59', timeRemaining: 'CHƯA TỚI HẠN', remaining: '500 LƯỢT', start: '10/10/2026', end: '10/10/2026' },
  { id: 'SSDSALE', name: 'Giảm SSD dịp khai trương', method: 'CHIẾT KHẤU', target: 'PHIÊN BẢN SẢN PHẨM', status: 'TẠM DỪNG', description: 'Giảm 100k cho SSD', configType: 'GIẢM TIỀN SẢN PHẨM', discountValue: '100000', usageMax: 100, usageUsed: 100, usageRemaining: 0, startDate: '2026-07-01T00:00', endDate: '2026-07-31T23:59', timeRemaining: 'ĐÃ KẾT THÚC', remaining: '0 LƯỢT', start: '01/07/2026', end: '31/07/2026' },
];

export const getPromotions = () => {
  const data = localStorage.getItem('promotions');
  if (data) {
    const parsed = JSON.parse(data);
    // If we only have the 3 items from the previous run, force reset to 6 items.
    // Also if empty, reset it.
    if (parsed && parsed.length > 3) {
      return parsed;
    }
  }
  localStorage.setItem('promotions', JSON.stringify(MOCK_PROMOTIONS));
  return MOCK_PROMOTIONS;
};

export const getPromotionById = (id) => {
  const promos = getPromotions();
  return promos.find(p => p.id === id);
};

export const savePromotion = (promo) => {
  const promos = getPromotions();
  const index = promos.findIndex(p => p.id === promo.id);
  
  if (index >= 0) {
    promos[index] = { ...promos[index], ...promo };
  } else {
    promos.unshift(promo);
  }
  
  localStorage.setItem('promotions', JSON.stringify(promos));
};

export const togglePromoStatus = (id) => {
  const promos = getPromotions();
  const index = promos.findIndex(p => p.id === id);
  if (index >= 0) {
    if (promos[index].status === 'ĐANG ÁP DỤNG') {
      promos[index].status = 'TẠM DỪNG';
    } else if (promos[index].status === 'TẠM DỪNG') {
      promos[index].status = 'ĐANG ÁP DỤNG';
    }
    localStorage.setItem('promotions', JSON.stringify(promos));
  }
};
