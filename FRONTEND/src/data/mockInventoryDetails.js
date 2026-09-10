import mockVersions from './mockVersions';

const warehouses = [
  { name: 'Kho Hà Nội', code: 'HN01', location: 'Kệ A-01' },
  { name: 'Kho HCM', code: 'HCM02', location: 'Kệ B-03' },
  { name: 'Kho Đà Nẵng', code: 'DN03', location: 'Kệ C-02' },
];

const brandRules = [
  ['ASUS', 'ASUS ROG'], ['Intel', 'Intel'], ['AMD', 'AMD'], ['Corsair', 'Corsair'],
  ['Keychron', 'Keychron'], ['Samsung', 'Samsung'], ['MSI', 'MSI'], ['LG', 'LG'],
  ['EVGA', 'EVGA'], ['Lian Li', 'Lian Li'], ['PC ', 'RUVENTU Custom'],
];

function inferBrand(name) {
  return brandRules.find(([token]) => name.includes(token))?.[1] || 'RUVENTU';
}

function splitStock(total, index, count) {
  const positiveTotal = Math.max(0, total);
  const base = Math.floor(positiveTotal / count);
  return base + (index < positiveTotal % count ? 1 : 0);
}

function makeAllocations(actual, available) {
  return warehouses.map((warehouse, index) => ({
    ...warehouse,
    actual: splitStock(actual, index, warehouses.length),
    available: splitStock(available, index, warehouses.length),
  })).filter((row) => row.actual > 0 || row.available > 0);
}

function makeHistory(seed, sku) {
  const rows = [
    ['2026-09-07T09:30', 'Nhập hàng', `DN-${seed}25`, 'Nguyễn Văn B', 6, 'Kho Hà Nội', 'Nhập hàng từ nhà cung cấp'],
    ['2026-09-06T15:20', 'Xuất bán', `DH-${seed}28`, 'Trần Văn C', -1, 'Kho HCM', 'Xuất hàng cho đơn bán online'],
    ['2026-09-05T10:15', 'Kiểm kho', `KK-${seed}08`, 'Lê Văn D', 0, 'Kho Hà Nội', 'Không chênh lệch tồn kho'],
    ['2026-09-03T11:00', 'Khách trả', `RT-${seed}08`, 'Phạm Thị E', 2, 'Kho Đà Nẵng', 'Khách trả hàng – lỗi hiển thị'],
    ['2026-09-01T14:30', 'Xuất bán', `DH-${seed}12`, 'Trần Văn C', -3, 'Kho Hà Nội', 'Xuất 3 đơn lẻ cùng ngày'],
    ['2026-08-29T09:00', 'Trả NCC', `TN-${seed}05`, 'Hoàng Văn F', -1, 'Kho HCM', 'Trả 1 sản phẩm lỗi cho nhà cung cấp'],
    ['2026-08-27T16:45', 'Nhập hàng', `DN-${seed}19`, 'Nguyễn Văn B', 8, 'Kho Đà Nẵng', 'Nhập lô đầu tiên'],
    ['2026-08-25T08:40', 'Kiểm kho', `KK-${seed}02`, 'Lê Văn D', 0, 'Kho HCM', `Đối chiếu thẻ kho ${sku}`],
  ];

  let closing = 0;
  return rows.slice().reverse().map((row, index) => {
    closing = Math.max(0, closing + row[4]);
    return { id: `${sku}-history-${index}`, date: row[0], transactionType: row[1], documentCode: row[2], user: row[3], change: row[4], warehouse: row[5], note: row[6], closing };
  }).reverse();
}

function makeGenericDetail(item, itemIndex) {
  const versionCount = item.type === 'Combo' ? 1 : 3;
  const suffixes = versionCount === 1 ? ['Tiêu chuẩn'] : ['Bản tiêu chuẩn', 'Bản nâng cấp', 'Bản giới hạn'];
  const versions = suffixes.map((suffix, index) => {
    const actual = splitStock(item.actual, index, versionCount);
    const available = item.available < 0 && index === 0
      ? item.available
      : splitStock(item.available, index, versionCount);
    const sku = index === 0 ? item.sku : `${item.sku}-${index + 1}`;
    return {
      id: `${item.id}-v${index + 1}`,
      name: `${item.displayName} – ${suffix}`,
      sku,
      actual,
      available,
      allocations: makeAllocations(actual, Math.max(0, available)),
      history: makeHistory(String(itemIndex + 1).padStart(3, '0'), sku),
    };
  });

  return {
    id: item.id,
    productCode: item.displayCode,
    name: item.displayName,
    image: item.image,
    brand: inferBrand(item.displayName),
    category: item.category,
    unit: item.type === 'Combo' ? 'Bộ' : 'Cái',
    productType: item.type === 'Combo' ? 'Combo sản phẩm' : 'Có phiên bản',
    status: 'Đang kinh doanh',
    stats: {
      actual: versions.reduce((sum, version) => sum + version.actual, 0),
      available: versions.reduce((sum, version) => sum + version.available, 0),
      versionCount: versions.length,
    },
    versions,
  };
}

const details = mockVersions.map(makeGenericDetail);

const vgaDetail = details.find((detail) => detail.id === 'VER-VGA-4090-OC');
if (vgaDetail) {
  const vgaVersions = [
    { id: 'rtx4090-oc', name: 'RTX 4090 OC 24GB', sku: 'VGA-RTX4090-OC', actual: 11, available: -2 },
    { id: 'rtx4090-blw', name: 'RTX 4090 Blower 24GB', sku: 'VGA-RTX4090-BLW', actual: 3, available: 3 },
    { id: 'rtx4090-lc', name: 'RTX 4090 Liquid Cool 24GB', sku: 'VGA-RTX4090-LC', actual: 0, available: 0 },
  ].map((version, index) => ({
    ...version,
    allocations: makeAllocations(version.actual, Math.max(0, version.available)),
    history: makeHistory(`00${index + 1}`, version.sku).map((row) => ({
      ...row,
      note: row.transactionType === 'Trả NCC' ? 'Trả 1 card lỗi cho ASUS' : row.note.replace('nhà cung cấp', 'nhà cung cấp ASUS'),
    })),
  }));

  Object.assign(vgaDetail, {
    productCode: 'VGA-ASUS-RTX4090',
    name: 'VGA ASUS ROG STRIX RTX 4090 OC 24GB',
    brand: 'ASUS ROG',
    category: 'Card đồ họa (VGA)',
    stats: { actual: 14, available: 1, versionCount: 3 },
    versions: vgaVersions,
  });
}

export function getInventoryDetail(id) {
  return details.find((detail) => detail.id === id) || details[0];
}

export default details;
