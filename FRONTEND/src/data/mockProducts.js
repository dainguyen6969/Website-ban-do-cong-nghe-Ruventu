import workstationImage from '../assets/hero.png';
import { readSharedState, writeSharedState } from '../sync/adminSync';

const STORAGE_KEY = 'ruventu_products_v1';
const MOCK_PRICE_STOCK = {
  'SP-KEY-Q1P': { prices: [3290000, 3500000, 3790000], stocks: [42, 40, 38] },
  'SP-VGA-4090': { prices: [24890000], stocks: [15] },
  'SP-CPU-14900K': { prices: [14490000, 15290000], stocks: [108, 102] },
  'SP-CPU-7950X': { prices: [14990000, 15690000], stocks: [48, 47] },
  'SP-MB-Z790H': { prices: [13990000], stocks: [60] },
  'SP-RAM-D5-64': { prices: [1590000, 1690000, 1840000, 1990000], stocks: [82, 80, 80, 78] },
  'SP-VGA-4080S': { prices: [19990000, 21490000], stocks: [45, 43] },
  'SP-PSU-1000G6': { prices: [4890000], stocks: [155] },
  'SP-CASE-011D': { prices: [3890000, 4190000], stocks: [58, 54] },
  'SP-SSD-990P2T': { prices: [3990000, 4490000, 4890000], stocks: [140, 136, 134] },
  'SP-MON-27GR95': { prices: [19990000], stocks: [45] },
};
const seedProducts = [
  {
    id: 'SP-KEY-Q1P',
    maSanPham: 'SP-KEY-Q1P',
    tenSanPham: 'Bàn phím cơ Keychron Q1 Pro',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'Keychron',
    danhMuc: '',
    soPhienBan: 3,
    tonKho: 120,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-PC-W99',
    maSanPham: 'SP-PC-W99',
    tenSanPham: 'PC Đồ Họa Workstation Core i9',
    phanLoai: 'Theo bộ (Combo)',
    thuongHieu: 'Ruventu Custom',
    danhMuc: '',
    soPhienBan: null,
    tonKho: 5,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: 'Sắp hết',
  },
  {
    id: 'SP-VGA-4090',
    maSanPham: 'SP-VGA-4090',
    tenSanPham: 'VGA ASUS ROG Strix RTX 4090 OC 24GB',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'ASUS',
    danhMuc: 'VGA',
    soPhienBan: null,
    tonKho: 15,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-CPU-14900K',
    maSanPham: 'SP-CPU-14900K',
    tenSanPham: 'CPU Intel Core i9-14900K Box',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'Intel',
    danhMuc: 'CPU',
    soPhienBan: 2,
    tonKho: 210,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-CPU-7950X',
    maSanPham: 'SP-CPU-7950X',
    tenSanPham: 'CPU AMD Ryzen 9 7950X Box',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'AMD',
    danhMuc: 'CPU',
    soPhienBan: 2,
    tonKho: 95,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-MB-Z790H',
    maSanPham: 'SP-MB-Z790H',
    tenSanPham: 'Mainboard ASUS ROG Maximus Z790 Hero WiFi',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'ASUS',
    danhMuc: 'Mainboard',
    soPhienBan: null,
    tonKho: 60,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-RAM-D5-64',
    maSanPham: 'SP-RAM-D5-64',
    tenSanPham: 'RAM Corsair Dominator DDR5 64GB 6400MHz',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'Corsair',
    danhMuc: 'RAM',
    soPhienBan: 4,
    tonKho: 320,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-VGA-4080S',
    maSanPham: 'SP-VGA-4080S',
    tenSanPham: 'VGA MSI GeForce RTX 4080 Super Gaming X Trio',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'MSI',
    danhMuc: 'VGA',
    soPhienBan: 2,
    tonKho: 88,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-PSU-1000G6',
    maSanPham: 'SP-PSU-1000G6',
    tenSanPham: 'PSU EVGA SuperNOVA 1000W G6 80+ Gold',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'EVGA',
    danhMuc: 'PSU',
    soPhienBan: null,
    tonKho: 155,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-CASE-011D',
    maSanPham: 'SP-CASE-011D',
    tenSanPham: 'Case Lian Li PC-011D Dynamic EVO Mid Tower',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'Lian Li',
    danhMuc: 'Case',
    soPhienBan: 2,
    tonKho: 112,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-SSD-990P2T',
    maSanPham: 'SP-SSD-990P2T',
    tenSanPham: 'SSD Samsung 990 Pro NVMe 2TB PCIe 5.0',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'Samsung',
    danhMuc: 'SSD',
    soPhienBan: 3,
    tonKho: 410,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
  {
    id: 'SP-MON-27GR95',
    maSanPham: 'SP-MON-27GR95',
    tenSanPham: 'Màn hình LG UltraGear 27GR95QE-B',
    phanLoai: 'Sản phẩm đơn',
    thuongHieu: 'LG',
    danhMuc: 'Màn hình',
    soPhienBan: null,
    tonKho: 45,
    trangThaiBan: 'Đang kinh doanh',
    canhBao: null,
  },
];

function applyMockPriceStock(product) {
  const defaults = MOCK_PRICE_STOCK[product.id];
  if (!defaults) return product;
  const variantCount = Math.max(product.variants?.length || 0, Number(product.soPhienBan || 1));
  const variants = Array.from({ length: variantCount }, (_, index) => {
    const current = product.variants?.[index] || {};
    return {
      ...current,
      name: current.name || (variantCount === 1 ? 'Mặc định' : `Phiên bản ${index + 1}`),
      sku: current.sku || (variantCount === 1 ? product.maSanPham : `${product.maSanPham}-${index + 1}`),
      giaBanLe: Number(current.giaBanLe) > 0 ? current.giaBanLe : defaults.prices[index] ?? defaults.prices.at(-1),
      giaNhap: current.giaNhap || '',
      khoiLuong: current.khoiLuong || '',
      tonDauKy: Number(current.tonDauKy) > 0 ? current.tonDauKy : defaults.stocks[index] ?? defaults.stocks.at(-1),
      serials: current.serials || [],
    };
  });
  return {
    ...product,
    giaBanLe: Number(product.giaBanLe) > 0 ? product.giaBanLe : defaults.prices[0],
    tonKho: Number(product.tonKho) > 0 ? product.tonKho : defaults.stocks.reduce((sum, stock) => sum + stock, 0),
    variants,
  };
}

function readPricedProducts() {
  const stored = readSharedState(STORAGE_KEY, seedProducts);
  const priced = stored.map(applyMockPriceStock);
  if (JSON.stringify(priced) !== JSON.stringify(stored)) {
    writeSharedState(STORAGE_KEY, priced, { slice: 'products', action: 'mock-prices-updated' });
  }
  return priced;
}

const mockProducts = readPricedProducts();

const workstationComponents = [
  ['SP-CPU-14900K', 'CPU Intel Core i9-14900K Box', 13990000],
  ['SP-VGA-4090', 'VGA ASUS ROG Strix RTX 4090 OC 24GB', 24890000],
  ['SP-MB-Z790H', 'Mainboard ASUS ROG Maximus Z790 Hero WiFi', 13990000],
  ['SP-RAM-D5-64', 'RAM Corsair Dominator DDR5 64GB 6400MHz', 8990000],
  ['SP-SSD-990P2T', 'SSD Samsung 990 Pro NVMe 2TB PCIe 5.0', 4890000],
  ['SP-PSU-1000G6', 'PSU EVGA SuperNOVA 1000W G6 80+ Gold', 4890000],
  ['SP-CASE-011D', 'Case Lian Li PC-011D Dynamic EVO Black', 3890000],
  ['SP-COOL-H150I', 'Tản nhiệt Corsair iCUE H150i Elite 360mm', 5280000],
].map(([id, tenSanPham, giaNhap]) => ({ id, maSanPham: id, tenSanPham, giaNhap, qty: 1 }));

const workstationSpecs = [
  ['CPU', 'Intel Core i9-14900K (24 nhân, 5.8GHz Boost)'],
  ['GPU', 'ASUS ROG STRIX RTX 4090 OC 24GB GDDR6X'],
  ['RAM', 'Corsair Dominator DDR5 64GB 6400MHz'],
  ['Storage', 'Samsung 990 Pro NVMe 2TB PCIe 5.0'],
  ['Mainboard', 'ASUS ROG Maximus Z790 Hero WiFi'],
  ['PSU', 'EVGA SuperNOVA 1000W 80+ Gold'],
  ['Case', 'Lian Li PC-011D Dynamic EVO Black'],
  ['Tản nhiệt', 'Corsair iCUE H150i Elite LCD 360mm'],
  ['Kết nối', 'WiFi 6E, Bluetooth 5.3, 2x Thunderbolt 4'],
  ['Xuất xứ', 'Lắp ráp tại Việt Nam – Ruventu Custom'],
].map(([name, value], index) => ({ id: index + 1, name, value }));

function hydrateProduct(product) {
  if (!product) return null;
  const isCombo = product.phanLoai === 'Theo bộ (Combo)';
  const isWorkstation = product.id === 'SP-PC-W99';
  const variantCount = Number(product.soPhienBan || 1);
  const defaultVariants = product.variants || (variantCount > 1
    ? Array.from({ length: variantCount }, (_, index) => ({ name: `Phiên bản ${index + 1}`, sku: `${product.maSanPham}-${index + 1}`, giaBanLe: '', giaNhap: '', khoiLuong: '', tonDauKy: index === 0 ? Math.ceil((product.tonKho || 0) / variantCount) : Math.floor((product.tonKho || 0) / variantCount), serials: [] }))
    : [{ name: 'Mặc định', sku: product.maSanPham, giaBanLe: '', giaNhap: '', khoiLuong: '', tonDauKy: product.tonKho || 0, serials: [] }]);
  const base = {
    donViTinh: isCombo ? 'Bộ' : 'Cái', vat: '10%', moTa: `Sản phẩm ${product.tenSanPham} chính hãng, được kiểm tra và phân phối bởi Ruventu.`,
    specs: [{ id: 1, name: 'Thương hiệu', value: product.thuongHieu || 'Ruventu' }],
    tags: [product.thuongHieu ? `#${product.thuongHieu.replace(/\s/g, '')}` : '#Ruventu'], attributes: product.attributes || (variantCount > 1 ? [{ name: 'Phiên bản', values: defaultVariants.map((variant) => variant.name) }] : []),
    giaBanLe: 0, giaNhap: 0, giaBanBuon: 0, variants: defaultVariants,
  };
  if (isWorkstation) {
    return { ...base, ...product, tenSanPham: 'PC Đồ Họa Workstation Intel Core i9', hinhAnh: workstationImage, donViTinh: 'Bộ', khoiLuong: '15 kg',
      moTa: 'Hệ thống máy trạm chuyên dụng phục vụ thiết kế đồ họa 3D, render video 4K/8K và xử lý tác vụ tính toán nặng. Tích hợp CPU Intel Core i9-14900K với 24 nhân, VGA ASUS ROG STRIX RTX 4090 OC 24GB GDDR6X, RAM DDR5 64GB, SSD NVMe PCIe 5.0 2TB – đạt điểm benchmark Cinebench vượt 70.000 multicore.',
      specs: workstationSpecs, tags: ['#Workstation', '#Render', '#Core-i9', '#HighEnd'], attributes: ['Màu Đen', 'Tản nhiệt nước 360mm', 'Nguồn 1000W'],
      giaBanLe: 65000000, giaNhap: 56500000, giaBanBuon: 60000000, comboItems: workstationComponents, comboPrice: '65000000', tonKho: 18, coTheBan: 16,
    };
  }
  const first = defaultVariants[0] || {};
  const giaNhap = Number(first.giaNhap || product.giaNhap || 0);
  const giaBanLe = Number(first.giaBanLe || product.giaBanLe || 0);
  return { ...base, ...product, giaNhap, giaBanLe, giaBanBuon: Number(product.giaBanBuon || giaBanLe), coTheBan: product.coTheBan ?? product.tonKho ?? 0 };
}

export function getMockProducts() {
  return mockProducts.map(hydrateProduct);
}

export function getMockProductById(id) {
  return hydrateProduct(mockProducts.find((product) => product.id === id || product.maSanPham === id));
}

export function addMockProduct(product) {
  const existingIndex = mockProducts.findIndex((p) => p.id === product.id);
  if (existingIndex >= 0) {
    mockProducts[existingIndex] = { ...mockProducts[existingIndex], ...product };
  } else {
    mockProducts.unshift(product);
  }
  return getMockProducts();
}

export default mockProducts;
