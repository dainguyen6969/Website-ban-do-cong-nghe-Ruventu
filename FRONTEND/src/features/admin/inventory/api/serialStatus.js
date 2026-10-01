export const SERIAL_STATUS_META = {
  DA_BAN: { label: 'Đã bán', key: 'sold', description: 'Sản phẩm đã được xuất bán và kích hoạt bảo hành.' },
  TRONG_KHO: { label: 'Trong kho', key: 'stock', description: 'Sản phẩm đang trong kho, chưa bán.' },
  DANG_BAO_HANH: { label: 'Đang bảo hành', key: 'warranty', description: 'Sản phẩm đang được tiếp nhận và xử lý bảo hành.' },
  LOI: { label: 'Lỗi', key: 'error', description: 'Sản phẩm được ghi nhận lỗi và đang chờ xử lý.' },
};

export const nextWarehouseStatus = (status) => ({ TRONG_KHO: 'LOI', LOI: 'TRONG_KHO' })[status] || null;
