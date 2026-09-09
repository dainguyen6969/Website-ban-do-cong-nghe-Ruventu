import { getMockProducts } from './mockProducts';

export const mockCustomers = [
  { id: 'KH001', name: 'Nguyễn Văn An', phone: '0901 234 567', type: 'Lẻ', priceList: 'retail' },
  { id: 'KH002', name: 'Trần Thị Mai', phone: '0912 345 678', type: 'Lẻ', priceList: 'retail' },
  { id: 'KH003', name: 'Lê Minh Tuấn', phone: '0933 456 789', type: 'Lẻ', priceList: 'retail' },
  { id: 'KH004', name: 'Phạm Quốc Anh', phone: '0984 567 890', type: 'Đại lý', priceList: 'dealer' },
  { id: 'KH005', name: 'Vũ Thu Hà', phone: '0965 678 901', type: 'Đại lý', priceList: 'dealer' },
  { id: 'KH006', name: 'Công ty TNHH Công Nghệ Đại Phát', phone: '0976 789 012', type: 'Doanh nghiệp', priceList: 'business' },
];

export { mockEmployees } from './mockEmployees.js';
export const priceLists = [ ['retail', 'Giá lẻ'], ['dealer', 'Giá đại lý'], ['business', 'Giá doanh nghiệp'] ];

// POS-only sample prices for catalog entries whose selling prices are still empty.
const retailPrices = {
  'SP-KEY-Q1P': 4990000, 'SP-PC-W99': 65000000, 'SP-VGA-4090': 48990000,
  'SP-CPU-14900K': 13990000, 'SP-CPU-7950X': 15300000, 'SP-MB-Z790H': 13990000,
  'SP-RAM-D5-64': 8990000, 'SP-VGA-4080S': 24990000, 'SP-PSU-1000G6': 4890000,
  'SP-CASE-011D': 3890000, 'SP-SSD-990P2T': 4890000, 'SP-MON-27GR95': 19990000,
};

export function getSalesProducts() {
  return getMockProducts().map((product) => {
    const retail = product.giaBanLe || retailPrices[product.id] || 0;
    return { ...product, vatRate: Number.parseFloat(product.vat) || 0, prices: {
      retail,
      dealer: product.giaBanBuon > 0 && product.giaBanBuon !== product.giaBanLe ? product.giaBanBuon : Math.round(retail * 0.95),
      business: product.giaDoanhNghiep || Math.round(retail * 0.9),
    } };
  });
}
