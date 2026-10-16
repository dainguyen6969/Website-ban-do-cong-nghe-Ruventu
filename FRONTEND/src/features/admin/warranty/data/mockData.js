export const warrantyStatusLabels = {
  TIEP_NHAN: 'TIẾP NHẬN', DANG_KIEM_TRA: 'ĐANG KIỂM TRA', DA_GUI_BAO_HANH: 'ĐÃ GỬI BẢO HÀNH',
  DANG_BAO_HANH: 'ĐANG BẢO HÀNH', DA_NHAN_LAI: 'ĐÃ NHẬN LẠI', HOAN_TAT: 'HOÀN TẤT',
};

export const progressSteps = [
  'TIẾP NHẬN',
  'ĐANG KIỂM TRA',
  'ĐÃ GỬI BẢO HÀNH',
  'ĐANG BẢO HÀNH',
  'ĐÃ NHẬN LẠI',
  'HOÀN TẤT'
];

export const mockWarrantyData = [
  { 
    id: 'BH-002', 
    orderId: '#1006', 
    customerName: 'Hoàng Minh Đức', 
    customerPhone: '0912 111 222',
    productName: 'Card đồ họa RTX4080', 
    productVariant: '16GB OC', 
    serial: 'VGA4080-SN-002', 
    serialStatus: 'ĐANG BẢO HÀNH',
    activationDate: '06/09/2026',
    warrantyExpiry: '06/09/2029',
    status: 'ĐANG BẢO HÀNH', 
    created: '14/09/2026 14:00', 
    updated: '05/10/2026 21:30',
    receptionReason: 'Màn hình xuất hiện artifact khi tải nặng',
    receptionCondition: 'Artifact màu trên màn hình, vỏ nguyên vẹn',
    receptionUnit: 'ASUS Service Center Vietnam',
    receptionNote: 'Kèm hộp gốc và phụ kiện',
    orderDate: '14/09/2026'
  },
  { 
    id: 'BH-001', 
    orderId: '#1010', 
    customerName: 'Đinh Văn Minh', 
    customerPhone: '0988 123 456',
    productName: 'Ổ cứng SSD NVMe', 
    productVariant: '1TB', 
    serial: 'SSD1T-SN-001', 
    serialStatus: 'ĐANG KIỂM TRA',
    activationDate: '10/09/2026',
    warrantyExpiry: '10/09/2029',
    status: 'ĐANG KIỂM TRA', 
    created: '10/09/2026 09:00', 
    updated: '10/09/2026 10:20',
    receptionReason: 'Không nhận ổ cứng',
    receptionCondition: 'Bình thường',
    receptionUnit: 'Trung tâm bảo hành',
    receptionNote: '',
    orderDate: '10/09/2026'
  },
  { 
    id: 'BH-004', 
    orderId: '#1013', 
    customerName: 'Trương Minh Đức', 
    customerPhone: '0912 333 444',
    productName: 'Ổ cứng SSD NVMe', 
    productVariant: '2TB', 
    serial: 'SSD2T-SN-001', 
    serialStatus: 'ĐANG BẢO HÀNH',
    activationDate: '01/09/2026',
    warrantyExpiry: '01/09/2029',
    status: 'ĐANG BẢO HÀNH', 
    created: '02/09/2026 08:30', 
    updated: '12/09/2026 10:00',
    receptionReason: 'Tốc độ đọc ghi chậm',
    receptionCondition: 'Bình thường',
    receptionUnit: 'Trung tâm bảo hành',
    receptionNote: '',
    orderDate: '01/09/2026'
  },
  { 
    id: 'BH-003', 
    orderId: '#1002', 
    customerName: 'Khách lẻ', 
    customerPhone: '0909 000 000',
    productName: 'Card đồ họa RTX4080', 
    productVariant: '16GB OC', 
    serial: 'VGA4080-SN-001', 
    serialStatus: 'ĐÃ GỬI BẢO HÀNH',
    activationDate: '15/08/2026',
    warrantyExpiry: '15/08/2029',
    status: 'ĐÃ GỬI BẢO HÀNH', 
    created: '20/08/2026 10:00', 
    updated: '07/09/2026 08:50',
    receptionReason: 'Quạt kêu to',
    receptionCondition: 'Bình thường',
    receptionUnit: 'ASUS Service Center Vietnam',
    receptionNote: '',
    orderDate: '15/08/2026'
  },
  { 
    id: 'BH-005', 
    orderId: '#1016', 
    customerName: 'Hồ Thị Thanh', 
    customerPhone: '0911 222 333',
    productName: 'Bàn phím cơ', 
    productVariant: 'Brown Switch', 
    serial: 'KB-BRN-SN-001', 
    serialStatus: 'HOÀN TẤT',
    activationDate: '05/08/2026',
    warrantyExpiry: '05/08/2028',
    status: 'HOÀN TẤT', 
    created: '10/08/2026 11:00', 
    updated: '25/08/2026 15:00',
    receptionReason: 'Liệt phím Space',
    receptionCondition: 'Bình thường',
    receptionUnit: 'Trung tâm bảo hành',
    receptionNote: '',
    orderDate: '05/08/2026'
  }
];

export const statusColors = {
  'TIẾP NHẬN': { color: '#0052cc', border: '#0052cc' },
  'ĐANG KIỂM TRA': { color: '#ff8b00', border: '#ff8b00' },
  'ĐÃ GỬI BẢO HÀNH': { color: '#111', border: '#111' },
  'ĐANG BẢO HÀNH': { color: '#ffb300', border: '#ffb300' },
  'ĐÃ NHẬN LẠI': { color: '#00a3bf', border: '#00a3bf' },
  'HOÀN TẤT': { color: '#555', border: '#555' }
};

// Mock-only examples for the new processing, quotation and settlement layouts.
const demoTickets = [
  ['Nguyễn Minh An', 'Card đồ họa RTX4080', '16GB OC', 'RUV-RTX4080-101', 'TIẾP NHẬN', '', '', 'Không cần hoàn'],
  ['Trần Quốc Bình', 'Chuột không dây 2.4GHz', 'Đen', '', 'ĐANG KIỂM TRA', 'Bản nháp', '', 'Không cần hoàn'],
  ['Lê Phương Chi', 'Ổ cứng SSD NVMe', '2TB', 'RUV-SSD2T-103', 'ĐANG KIỂM TRA', 'Chờ khách phản hồi', '', 'Không cần hoàn'],
  ['Phạm Anh Dũng', 'Bàn phím cơ', 'Brown Switch', 'RUV-KBBRN-104', 'CHỜ TRẢ KHÁCH', 'Khách đã từ chối', 'Không phát sinh phí', 'Không cần hoàn'],
  ['Đặng Thu Hà', 'Ổ cứng SSD NVMe', '1TB', 'RUV-SSD1T-105', 'ĐANG KIỂM TRA', 'Hết hiệu lực', '', 'Không cần hoàn'],
  ['Vũ Gia Huy', 'Card đồ họa RTX4080', '16GB OC', 'RUV-RTX4080-106', 'ĐÃ GỬI BẢO HÀNH', '', 'Không phát sinh phí', 'Không cần hoàn'],
  ['Hoàng Ngọc Khang', 'RAM DDR5', '16GB', 'RUV-RAM16-107', 'ĐANG BẢO HÀNH', 'Khách đã đồng ý', 'Thanh toán một phần', 'Không cần hoàn'],
  ['Bùi Đức Lâm', 'Ổ cứng SSD NVMe', '1TB', 'RUV-SSD1T-108', 'ĐÃ NHẬN LẠI', '', 'Không phát sinh phí', 'Không cần hoàn'],
  ['Ngô Mai Linh', 'Ổ cứng SSD NVMe', '2TB', 'RUV-SSD2T-109', 'CHỜ TRẢ KHÁCH', 'Khách đã đồng ý', 'Đã thanh toán', 'Không cần hoàn'],
  ['Lý Bảo Nam', 'Ổ cứng SSD NVMe', '2TB', 'RUV-SSD2T-110', 'CHỜ ĐỔI SẢN PHẨM', '', 'Không phát sinh phí', 'Không cần hoàn'],
  ['Đỗ Thanh Oanh', 'Card đồ họa RTX4080', '16GB OC', 'RUV-RTX4080-111', 'CHỜ ĐỔI SẢN PHẨM', 'Khách đã đồng ý', 'Chưa thanh toán', 'Không cần hoàn'],
  ['Trịnh Minh Phúc', 'RAM DDR5', '16GB', 'RUV-RAM16-112-OLD', 'HOÀN TẤT', 'Khách đã đồng ý', 'Hóa đơn đã hủy', 'Chờ hoàn tiền', 50000],
  ['Nguyễn Khánh Quỳnh', 'Ổ cứng SSD NVMe', '1TB', 'RUV-SSD1T-113', 'HOÀN TẤT', 'Khách đã đồng ý', 'Hóa đơn đã hủy', 'Hoàn tiền một phần', 30000],
  ['Phan Tuấn Sơn', 'Chuột không dây 2.4GHz', 'Đen', '', 'HOÀN TẤT', 'Khách đã đồng ý', 'Hóa đơn đã hủy', 'Đã hoàn tiền', 0],
];

mockWarrantyData.push(...demoTickets.map(([customerName, productName, productVariant, serial, status, quoteStatus, paymentStatus, refundStatus, remainingRefund], index) => {
  const number = index + 101;
  const day = String(index + 1).padStart(2, '0');
  return {
    id: `BH-${number}`, orderId: `ORD-DEMO-${number}`, customerName, customerPhone: `0901000${number}`,
    productName, productVariant, serial, trackingCode: `TB-DEMO-${number}`, status,
    serialStatus: status, quoteStatus, paymentStatus, refundStatus, remainingRefund,
    created: `${day}/10/2026 09:00`, updated: `${day}/10/2026 11:00`,
    receptionReason: 'Thiết bị hoạt động không ổn định khi sử dụng.',
    receptionCondition: 'Đã kiểm tra tình trạng bên ngoài và phụ kiện khi nhận.',
    receptionUnit: 'Bàn kiểm thử Ruventu', receptionNote: '',
    custodyName: 'Bàn kiểm thử Ruventu', custodyType: 'Cửa hàng',
    eligibility: 'Đủ điều kiện miễn phí', verification: 'Đối chiếu đơn gốc, tem và tình trạng vật lý khi nhận.',
    warrantyExpiry: '30/09/2029', expiryBasis: 'Ngày giao thành công của đơn hàng gốc',
    accessories: ['Hộp thiết bị × 1'], pendingSettlement: number === 110 || number === 112,
    history: [],
  };
}));
mockWarrantyData.sort((a, b) => a.id.localeCompare(b.id));

Object.assign(mockWarrantyData.find(item => item.id === 'BH-001'), {
  quoteStatus: 'Bản nháp', paymentStatus: 'Thanh toán một phần', refundStatus: 'Không cần hoàn',
  quotes: [
    { version: 1, status: 'Khách đã đồng ý', amount: 100000, note: 'Kiểm tra và xử lý lỗi kết nối' },
    { version: 2, status: 'Hết hiệu lực', amount: 150000, note: 'Phương án sửa chữa trước' },
    { version: 3, status: 'Bản nháp', amount: 175000, note: 'Phương án sửa thay thế đang soạn' },
  ],
  invoices: [{ code: 'BH-INV-3801', version: 'Chưa có dữ liệu', total: 150000, paid: 50000, due: 100000, refund: 0 }],
  canceledInvoices: [{ code: 'BH-INV-3802', version: 1, total: 50000, paid: 50000, refunded: 0, refund: 50000 }],
});
