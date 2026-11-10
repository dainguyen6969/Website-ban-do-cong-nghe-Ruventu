export const catalogScopes = {
  'pc-build': { title: 'PC BUILD SẴN', combo: true },
  'linh-kien': { title: 'LINH KIỆN PC', categories: ['CPU', 'Mainboard', 'RAM', 'VGA', 'PSU', 'Case', 'SSD', 'HDD', 'Tản nhiệt'] },
  'gaming-gear': { title: 'GAMING GEAR', standalone: true },
  'man-hinh': { title: 'MÀN HÌNH', categories: ['Màn hình'] },
  laptop: { title: 'LAPTOP', categories: ['Laptop'] },
  cpu: { title: 'VI XỬ LÝ (CPU)', categories: ['CPU'] },
  mainboard: { title: 'BO MẠCH CHỦ', categories: ['Mainboard'] },
  ram: { title: 'BỘ NHỚ RAM', categories: ['RAM'] },
  vga: { title: 'CARD ĐỒ HỌA (VGA)', categories: ['VGA'] },
  psu: { title: 'NGUỒN MÁY TÍNH', categories: ['PSU'] },
  case: { title: 'VỎ MÁY TÍNH', categories: ['Case'] },
  ssd: { title: 'Ổ CỨNG SSD / HDD', categories: ['SSD', 'HDD'] },
  'tan-nhiet': { title: 'TẢN NHIỆT', categories: ['Tản nhiệt'] },
};

export function inCatalogScope(product, slug) {
  const scope = catalogScopes[slug];
  if (!scope) return false;
  if (scope.combo) return product.loaiSanPham === 'BO_PC';
  if (scope.standalone) return product.loaiSanPham === 'DON';
  return product.loaiSanPham === 'DON' && scope.categories.some(name => name.toLocaleLowerCase('vi-VN') === (product.category || '').toLocaleLowerCase('vi-VN'));
}

export function shuffleProducts(products) {
  const shuffled = [...products];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export function categoryTreeIds(categories, rootId) {
  const ids = new Set([Number(rootId)]);
  for (let changed = true; changed;) {
    changed = false;
    for (const category of categories) {
      if (category.danhMucChaId != null && ids.has(Number(category.danhMucChaId)) && !ids.has(Number(category.id))) {
        ids.add(Number(category.id));
        changed = true;
      }
    }
  }
  return ids;
}

export function componentCategoryIds(categories) {
  const specialized = categories.filter(c => ['phu-kien', 'gaming-gear', 'man-hinh', 'laptop', 'pc-build', 'pc-build-san'].includes(c.duongDanUrl));
  const excluded = new Set(specialized.flatMap(c => [...categoryTreeIds(categories, c.id)]));
  return new Set(categories.filter(c => !excluded.has(Number(c.id))).map(c => Number(c.id)));
}
