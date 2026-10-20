import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Layers, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { productService } from '../../shared/services/productService';
import './ComponentSelectionModal.css';

// Cache details between modal opens so we don't refetch repeated product details
const productDetailCache = new Map();

// Keyword & Category matching rules for each build slot
const SLOT_CRITERIA = {
  cpu: {
    categoryIds: [7], // category 7 in DB is "CPU"
    categoryNames: ['cpu', 'bộ vi xử lý', 'vi xử lý', 'processor'],
    keywords: [
      'cpu',
      'intel',
      'core i3',
      'core i5',
      'core i7',
      'core i9',
      'ryzen',
      'amd ryzen',
      'xeon',
    ],
  },
  mainboard: {
    categoryNames: ['mainboard', 'bo mạch chủ', 'motherboard', 'main'],
    keywords: [
      'mainboard',
      'bo mạch',
      'motherboard',
      'b760',
      'b650',
      'z790',
      'z890',
      'x670',
      'x870',
      'h610',
      'a620',
      'asrock',
      'gigabyte',
      'asus',
      'msi',
    ],
  },
  ram: {
    categoryNames: ['ram', 'bộ nhớ trong', 'bộ nhớ ram', 'memory'],
    keywords: [
      'ram',
      'ddr4',
      'ddr5',
      'bộ nhớ trong',
      'fury',
      'trident',
      'vengeance',
      'kingston fury',
    ],
  },
  ssd1: {
    categoryNames: ['ssd', 'ổ cứng ssd', 'ổ cứng thể rắn', 'ổ cứng'],
    keywords: [
      'ssd',
      'nvme',
      'm.2',
      'pcie',
      '980 pro',
      '990 pro',
      'sn850',
      'sn770',
      'kingston',
      'ổ cứng ssd',
    ],
  },
  ssd2: {
    categoryNames: ['ssd', 'ổ cứng ssd', 'ổ cứng thể rắn', 'ổ cứng'],
    keywords: [
      'ssd',
      'nvme',
      'm.2',
      'pcie',
      '980 pro',
      '990 pro',
      'sn850',
      'sn770',
      'kingston',
      'ổ cứng ssd',
    ],
  },
  hdd: {
    categoryNames: ['hdd', 'ổ cứng hdd', 'ổ cứng', 'hard drive'],
    keywords: ['hdd', 'barracuda', 'western digital', 'wd blue', 'wd red', 'seagate', 'ổ cứng hdd'],
  },
  vga: {
    categoryNames: ['vga', 'card màn hình', 'gpu', 'graphics card'],
    keywords: [
      'vga',
      'card màn hình',
      'rtx',
      'gtx',
      'geforce',
      'radeon',
      'rx 7',
      'rx 6',
      '4060',
      '4070',
      '4080',
      '4090',
      '3060',
      '3070',
      '3080',
    ],
  },
  psu: {
    categoryNames: ['psu', 'nguồn', 'nguồn máy tính', 'power supply'],
    keywords: [
      'psu',
      'nguồn',
      'power supply',
      'gold',
      'bronze',
      'platinum',
      'cooler master',
      'corsair',
      'seasonic',
      'deepcool',
    ],
  },
  case: {
    categoryIds: [6], // category 6 in DB is "Case"
    categoryNames: ['case', 'vỏ máy tính', 'thùng máy', 'vỏ case'],
    keywords: [
      'case',
      'vỏ case',
      'vỏ máy tính',
      'thùng máy',
      'chos',
      'nzxt',
      'antec',
      'xigmatek',
      'montech',
      'lian li',
    ],
  },
  cooler_air: {
    categoryNames: ['tản nhiệt', 'tản nhiệt khí', 'quạt tản nhiệt'],
    keywords: [
      'tản nhiệt khí',
      'air cooler',
      'cpu cooler',
      'cr-1000',
      'peerless assassin',
      'deepcool ak',
      'noctua',
    ],
  },
  cooler_aio: {
    categoryNames: ['tản nhiệt', 'tản nhiệt nước', 'tản nhiệt aio'],
    keywords: [
      'aio',
      'tản nhiệt nước',
      'liquid cooler',
      '240',
      '360',
      'kraken',
      'galahad',
      'corsair nautico',
    ],
  },
  fan: {
    categoryNames: ['fan', 'quạt', 'fan tản nhiệt', 'fan case'],
    keywords: ['fan', 'quạt', 'fan case', 'quạt tản nhiệt', 'argb', '120mm', '140mm'],
  },
  monitor1: {
    categoryIds: [2, 5], // category 2 is Màn hình, 5 is Màn hình đồ họa
    categoryNames: ['màn hình', 'màn hình đồ họa', 'monitor', 'display'],
    keywords: [
      'màn hình',
      'monitor',
      'display',
      'ips',
      'oled',
      '144hz',
      '165hz',
      '240hz',
      '24 inch',
      '27 inch',
      '32 inch',
      'hello',
      'sanphamne',
    ],
  },
  monitor2: {
    categoryIds: [2, 5],
    categoryNames: ['màn hình', 'màn hình đồ họa', 'monitor', 'display'],
    keywords: [
      'màn hình',
      'monitor',
      'display',
      'ips',
      'oled',
      '144hz',
      '165hz',
      '240hz',
      '24 inch',
      '27 inch',
      '32 inch',
      'hello',
      'sanphamne',
    ],
  },
  keyboard: {
    categoryIds: [4], // category 4 in DB is "Bàn phím cơ"
    categoryNames: ['bàn phím', 'bàn phím cơ', 'keyboard'],
    keywords: [
      'bàn phím',
      'bàn phím cơ',
      'keyboard',
      'akko',
      'keychron',
      'dareu',
      'logitech',
      'rk',
    ],
  },
  mouse: {
    categoryNames: ['chuột', 'chuột gaming', 'mouse'],
    keywords: [
      'chuột',
      'mouse',
      'logitech g',
      'razer',
      'superlight',
      'pulsar',
      'dareu',
      'chuột gaming',
    ],
  },
  pad: {
    categoryNames: ['pad', 'bàn di chuột', 'lót chuột', 'mousepad'],
    keywords: ['pad', 'lót chuột', 'bàn di chuột', 'mousepad', 'deskmat'],
  },
  headset: {
    categoryNames: ['tai nghe', 'headset', 'headphone', 'earphone'],
    keywords: ['tai nghe', 'headset', 'headphone', 'hyperx', 'steelseries', 'logitech g435'],
  },
  speaker: {
    categoryNames: ['loa', 'speaker', 'loa vi tính', 'soundbar'],
    keywords: ['loa', 'speaker', 'soundbar', 'edifier', 'creative', 'microlab'],
  },
  chair: {
    categoryNames: ['ghế', 'ghế gaming', 'ghế công thái học'],
    keywords: ['ghế gaming', 'ghế', 'chair', 'sihoo', 'warrior', 'corsair tc'],
  },
  desk: {
    categoryNames: ['bàn', 'bàn gaming', 'bàn nâng hạ'],
    keywords: ['bàn gaming', 'bàn nâng hạ', 'bàn', 'desk'],
  },
  webcam: {
    categoryNames: ['webcam', 'camera', 'webcam trực tuyến'],
    keywords: ['webcam', 'camera', 'logitech c920', 'c922', 'razer kiyo'],
  },
  mic: {
    categoryNames: ['microphone', 'micro', 'thu âm', 'mic'],
    keywords: ['micro', 'microphone', 'mic', 'quadcast', 'rode', 'shure', 'fifine'],
  },
  studio: {
    categoryNames: ['stream', 'thiết bị studio', 'phụ kiện stream'],
    keywords: ['stream', 'elgato', 'capture card', 'cam link', 'stream deck', 'key light'],
  },
  network: {
    categoryNames: ['mạng', 'thiết bị mạng', 'router', 'wifi'],
    keywords: ['router', 'wifi', 'switch', 'card wifi', 'tplink', 'asus router', 'mạng'],
  },
  arm: {
    categoryNames: ['arm', 'giá treo', 'giá treo màn hình', 'chân đế'],
    keywords: ['arm', 'giá treo', 'human motion', 'north bayou', 'nb f80', 'nb g40'],
  },
};

function matchesSlotCriteria(product, slot) {
  if (!slot) return true;
  const criteria = SLOT_CRITERIA[slot.key];
  const pName = (product.title || '').toLowerCase();
  const pCat = (product.category || '').toLowerCase();
  const pParentCat = (product.parentCategory || '').toLowerCase();
  const pSlug = (product.categorySlug || '').toLowerCase();
  const pCatId = product.categoryId;

  // 1. By Category ID if specified
  if (criteria?.categoryIds && pCatId && criteria.categoryIds.includes(Number(pCatId))) {
    return true;
  }

  // 2. By Category Name or filterCategory
  const filterCat = (slot.filterCategory || '').toLowerCase();
  if (
    filterCat &&
    (pCat.includes(filterCat) || pParentCat.includes(filterCat) || pSlug.includes(filterCat))
  ) {
    return true;
  }

  if (criteria?.categoryNames) {
    if (
      criteria.categoryNames.some(
        (c) => pCat.includes(c) || pParentCat.includes(c) || pSlug.includes(c)
      )
    ) {
      return true;
    }
  }

  // 3. By Keywords in product title
  if (criteria?.keywords) {
    if (criteria.keywords.some((kw) => pName.includes(kw))) {
      return true;
    }
  }

  // 4. By Specs if product has specs matching slot key (e.g., specs.CPU)
  if (product.specs && typeof product.specs === 'object') {
    const slotKeyUpper = slot.key.toUpperCase();
    if (product.specs[slotKeyUpper] || product.specs[slot.title]) {
      return true;
    }
  }

  return false;
}

const ComponentSelectionModal = ({ slot, onClose, onSelect }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('matched'); // 'matched' | 'all'

  // Filters
  const [selectedBrand, setSelectedBrand] = useState('TẤT CẢ');
  const [selectedPrice, setSelectedPrice] = useState('TẤT CẢ');
  const [selectedStock, setSelectedStock] = useState('TẤT CẢ');
  const [selectedSort, setSelectedSort] = useState('NỔI BẬT');

  useEffect(() => {
    let isMounted = true;

    const fetchAllRealProducts = async () => {
      setLoading(true);
      try {
        // Fetch all products with limit 100
        const res = await productService.getProducts({ limit: 100 });
        const rawProducts = res?.data?.danhSachSanPham || [];

        // Parallel enrich each product with its detail & first variant
        const enriched = await Promise.all(
          rawProducts.map(async (p) => {
            let detail = productDetailCache.get(p.id);
            if (!detail) {
              try {
                const detailRes = await productService.getProductDetail(p.id);
                detail = detailRes?.data;
                if (detail) {
                  productDetailCache.set(p.id, detail);
                }
              } catch (err) {
                // fallback to null if detail fails
                detail = null;
              }
            }

            const defaultVariant = detail?.danhSachPhienBan?.[0] || {};
            let parsedSpecs = {};
            if (detail?.thongSoKyThuat) {
              try {
                parsedSpecs =
                  typeof detail.thongSoKyThuat === 'string'
                    ? JSON.parse(detail.thongSoKyThuat)
                    : detail.thongSoKyThuat;
              } catch (e) {
                parsedSpecs = {};
              }
            }

            const price =
              defaultVariant.giaBanLe != null
                ? Number(defaultVariant.giaBanLe)
                : Number(p.giaThapNhat ?? 0);

            const stock =
              defaultVariant.tonCoTheBan != null
                ? Number(defaultVariant.tonCoTheBan)
                : p.tonKhoKhaDung != null
                  ? Number(p.tonKhoKhaDung)
                  : p.conHang
                    ? 10
                    : 0;

            const image =
              detail?.anhSanPham?.find((img) => img.laAnhChinh)?.duongDanAnh ||
              detail?.anhSanPham?.[0]?.duongDanAnh ||
              p.anhChinh ||
              'https://via.placeholder.com/150';

            return {
              id: p.id,
              code: detail?.maSanPham || p.maSanPham || `SP-${p.id}`,
              title: detail?.tenSanPham || p.tenSanPham,
              brand: detail?.thuongHieu?.tenThuongHieu || p.tenThuongHieu || 'Chưa rõ',
              category: detail?.danhMuc?.tenDanhMuc || p.tenDanhMuc || '',
              categoryId: detail?.danhMuc?.id || p.danhMucId || null,
              parentCategory: p.tenDanhMucCha || '',
              parentCategoryId: p.danhMucChaId || null,
              categorySlug: p.duongDanUrl || '',
              image,
              price,
              currentPrice: price,
              stock,
              inStock: Boolean(p.conHang && stock > 0),
              specs: parsedSpecs,
              phienBanId: defaultVariant.id || null,
              danhSachPhienBan: detail?.danhSachPhienBan || [],
            };
          })
        );

        if (isMounted) {
          setAllProducts(enriched);

          // Decide initial active tab
          const matched = enriched.filter((p) => matchesSlotCriteria(p, slot));
          if (matched.length > 0) {
            setActiveTab('matched');
          } else {
            setActiveTab('all');
          }
        }
      } catch (e) {
        console.error('Lỗi fetch sản phẩm thật:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllRealProducts();

    return () => {
      isMounted = false;
    };
  }, [slot]);

  // Derived: matched products according to slot criteria
  const slotMatchedProducts = useMemo(() => {
    return allProducts.filter((p) => matchesSlotCriteria(p, slot));
  }, [allProducts, slot]);

  // Products under current tab
  const tabProducts = activeTab === 'matched' ? slotMatchedProducts : allProducts;

  // Extract unique brands for current list
  const uniqueBrands = useMemo(() => {
    return [...new Set(tabProducts.map((p) => p.brand).filter((b) => b && b !== 'Chưa rõ'))];
  }, [tabProducts]);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    let result = tabProducts.filter((p) => {
      // Search keyword
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchTitle = (p.title || '').toLowerCase().includes(query);
        const matchCode = String(p.code || '')
          .toLowerCase()
          .includes(query);
        const matchBrand = (p.brand || '').toLowerCase().includes(query);
        const matchCat = (p.category || '').toLowerCase().includes(query);
        const matchSpecs = Object.values(p.specs || {}).some((val) =>
          String(val).toLowerCase().includes(query)
        );
        if (!matchTitle && !matchCode && !matchBrand && !matchCat && !matchSpecs) return false;
      }

      // Brand filter
      if (selectedBrand !== 'TẤT CẢ' && p.brand !== selectedBrand) return false;

      // Price filter
      if (selectedPrice === 'DƯỚI 5 TRIỆU' && p.price >= 5000000) return false;
      if (selectedPrice === '5 - 15 TRIỆU' && (p.price < 5000000 || p.price > 15000000))
        return false;
      if (selectedPrice === 'TRÊN 15 TRIỆU' && p.price <= 15000000) return false;

      // Stock filter
      if (selectedStock === 'CÒN HÀNG' && p.stock <= 0) return false;

      return true;
    });

    // Sort
    if (selectedSort === 'GIÁ THẤP ĐẾN CAO') {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'GIÁ CAO ĐẾN THẤP') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [tabProducts, searchTerm, selectedBrand, selectedPrice, selectedStock, selectedSort]);

  const clearFilters = () => {
    setSelectedBrand('TẤT CẢ');
    setSelectedPrice('TẤT CẢ');
    setSelectedStock('TẤT CẢ');
    setSelectedSort('NỔI BẬT');
    setSearchTerm('');
  };

  return (
    <div
      className="build-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="build-modal-content">
        {/* Header */}
        <div className="build-modal-header">
          <div className="build-modal-header-left">
            <span className="modal-slot-badge">{slot.id.toString().padStart(2, '0')}</span>
            <div className="build-modal-title">
              CHỌN {slot.title} — {slot.subtitle}
            </div>
          </div>
          <button className="build-modal-close" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher: Matched category vs All products */}
        <div className="build-modal-tabs-bar">
          <button
            type="button"
            className={`build-modal-tab-btn ${activeTab === 'matched' ? 'active' : ''}`}
            onClick={() => setActiveTab('matched')}
          >
            <CheckCircle2 size={16} />
            HẠNG MỤC: {slot.title} ({slotMatchedProducts.length})
          </button>
          <button
            type="button"
            className={`build-modal-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Layers size={16} />
            TẤT CẢ SẢN PHẨM ({allProducts.length})
          </button>
        </div>

        {/* Informational banner if 0 matched products */}
        {activeTab === 'all' && slotMatchedProducts.length === 0 && (
          <div className="build-modal-notice-banner">
            <AlertCircle size={16} />
            <span>
              Chưa có sản phẩm gán danh mục riêng cho <strong>{slot.title}</strong>. Đang hiển thị
              toàn bộ sản phẩm thực tế trong kho để bạn dễ dàng lựa chọn.
            </span>
          </div>
        )}

        {/* Search bar */}
        <div className="build-modal-search-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm, mã SP, thương hiệu, thông số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="search-clear-btn" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="build-modal-body">
          {/* Left Sidebar Filters */}
          <div className="build-modal-sidebar">
            <div className="build-modal-filter-group">
              <div className="build-modal-filter-title">BỘ LỌC TÌM KIẾM</div>

              {/* Brand filter */}
              <div className="build-modal-filter-section">
                <div className="build-modal-filter-label">THƯƠNG HIỆU</div>
                <div className="build-modal-filter-options">
                  <div
                    className={`build-modal-filter-option ${selectedBrand === 'TẤT CẢ' ? 'active' : ''}`}
                    onClick={() => setSelectedBrand('TẤT CẢ')}
                  >
                    TẤT CẢ
                  </div>
                  {uniqueBrands.map((b) => (
                    <div
                      key={b}
                      className={`build-modal-filter-option ${selectedBrand === b ? 'active' : ''}`}
                      onClick={() => setSelectedBrand(b)}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price filter */}
              <div className="build-modal-filter-section">
                <div className="build-modal-filter-label">KHOẢNG GIÁ</div>
                <div className="build-modal-filter-options">
                  <div
                    className={`build-modal-filter-option ${selectedPrice === 'TẤT CẢ' ? 'active' : ''}`}
                    onClick={() => setSelectedPrice('TẤT CẢ')}
                  >
                    TẤT CẢ
                  </div>
                  <div
                    className={`build-modal-filter-option ${selectedPrice === 'DƯỚI 5 TRIỆU' ? 'active' : ''}`}
                    onClick={() => setSelectedPrice('DƯỚI 5 TRIỆU')}
                  >
                    DƯỚI 5 TRIỆU
                  </div>
                  <div
                    className={`build-modal-filter-option ${selectedPrice === '5 - 15 TRIỆU' ? 'active' : ''}`}
                    onClick={() => setSelectedPrice('5 - 15 TRIỆU')}
                  >
                    5 - 15 TRIỆU
                  </div>
                  <div
                    className={`build-modal-filter-option ${selectedPrice === 'TRÊN 15 TRIỆU' ? 'active' : ''}`}
                    onClick={() => setSelectedPrice('TRÊN 15 TRIỆU')}
                  >
                    TRÊN 15 TRIỆU
                  </div>
                </div>
              </div>

              {/* Stock filter */}
              <div className="build-modal-filter-section">
                <div className="build-modal-filter-label">TÌNH TRẠNG KHO</div>
                <div className="build-modal-filter-options">
                  <div
                    className={`build-modal-filter-option ${selectedStock === 'TẤT CẢ' ? 'active' : ''}`}
                    onClick={() => setSelectedStock('TẤT CẢ')}
                  >
                    TẤT CẢ
                  </div>
                  <div
                    className={`build-modal-filter-option ${selectedStock === 'CÒN HÀNG' ? 'active' : ''}`}
                    onClick={() => setSelectedStock('CÒN HÀNG')}
                  >
                    CÒN HÀNG
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div className="build-modal-filter-section">
                <div className="build-modal-filter-label">SẮP XẾP</div>
                <div className="build-modal-filter-options">
                  <div
                    className={`build-modal-filter-option ${selectedSort === 'NỔI BẬT' ? 'active' : ''}`}
                    onClick={() => setSelectedSort('NỔI BẬT')}
                  >
                    MẶC ĐỊNH
                  </div>
                  <div
                    className={`build-modal-filter-option ${selectedSort === 'GIÁ THẤP ĐẾN CAO' ? 'active' : ''}`}
                    onClick={() => setSelectedSort('GIÁ THẤP ĐẾN CAO')}
                  >
                    GIÁ THẤP ➔ CAO
                  </div>
                  <div
                    className={`build-modal-filter-option ${selectedSort === 'GIÁ CAO ĐẾN THẤP' ? 'active' : ''}`}
                    onClick={() => setSelectedSort('GIÁ CAO ĐẾN THẤP')}
                  >
                    GIÁ CAO ➔ THẤP
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Product List */}
          <div className="build-modal-main">
            <div className="build-modal-main-header">
              <div className="result-count">
                TÌM THẤY <strong>{filteredProducts.length}</strong> SẢN PHẨM KHẢ DỤNG
              </div>
              <button className="btn-clear-filter" onClick={clearFilters}>
                XÓA TẤT CẢ BỘ LỌC
              </button>
            </div>

            <div className="build-modal-product-list">
              {loading ? (
                <div className="loading-container">
                  <Loader2 size={36} className="spinner" />
                  <p>Đang tải dữ liệu sản phẩm từ hệ thống...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-products-box">
                  <AlertCircle size={40} className="empty-icon" />
                  <p className="empty-title">Không tìm thấy sản phẩm phù hợp</p>
                  <p className="empty-desc">
                    {activeTab === 'matched'
                      ? 'Chưa có sản phẩm nào thuộc hạng mục này.'
                      : 'Không có sản phẩm nào thỏa mãn điều kiện tìm kiếm hoặc bộ lọc.'}
                  </p>
                  {activeTab === 'matched' && allProducts.length > 0 && (
                    <button className="btn-switch-all" onClick={() => setActiveTab('all')}>
                      XEM TẤT CẢ {allProducts.length} SẢN PHẨM TRONG KHO
                    </button>
                  )}
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <ProductRow key={p.id} product={p} onSelect={(qty) => onSelect(p, qty)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductRow = ({ product, onSelect }) => {
  const [qty, setQty] = useState(1);
  const maxStock = Math.max(1, product.stock || 1);

  const increase = () => setQty((prev) => (prev < maxStock ? prev + 1 : prev));
  const decrease = () => setQty((prev) => (prev > 1 ? prev - 1 : 1));

  const specsEntries = Object.entries(product.specs || {}).slice(0, 3);

  return (
    <div className={`build-product-row ${product.stock <= 0 ? 'out-of-stock-row' : ''}`}>
      <div className="build-product-info">
        <div className="build-product-img-wrapper">
          <img
            src={product.image}
            alt={product.title}
            className="build-product-img"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/150';
            }}
          />
          {product.category && (
            <span className="build-product-category-tag">{product.category}</span>
          )}
        </div>
        <div className="build-product-details">
          <div className="build-product-title" title={product.title}>
            {product.title}
          </div>
          <div className="build-product-specs">
            <span className="spec-item">
              <strong>MÃ SP:</strong> {product.code}
            </span>
            <span className="spec-item">
              <strong>THƯƠNG HIỆU:</strong> {product.brand}
            </span>
            <span className="spec-item">
              <strong>BẢO HÀNH:</strong> 36 THÁNG
            </span>
            {specsEntries.map(([k, v]) => (
              <span key={k} className="spec-item">
                <strong>{k}:</strong> {String(v)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="build-product-action">
        <div className="build-product-stock">
          TÌNH TRẠNG
          <br />
          {product.stock > 0 ? (
            <strong className="stock-in">CÒN {product.stock} SP</strong>
          ) : (
            <strong className="stock-out">HẾT HÀNG</strong>
          )}
        </div>

        <div className="build-product-price">{Number(product.price).toLocaleString('vi-VN')}đ</div>

        <div className="build-product-qty">
          <div className="qty-label">SỐ LƯỢNG</div>
          <div className="qty-controls">
            <button type="button" onClick={decrease} disabled={product.stock <= 0 || qty <= 1}>
              -
            </button>
            <input type="text" value={qty} readOnly />
            <button
              type="button"
              onClick={increase}
              disabled={product.stock <= 0 || qty >= maxStock}
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn-add-config"
          onClick={() => onSelect(qty)}
          disabled={product.stock <= 0}
        >
          {product.stock > 0 ? 'THÊM VÀO CẤU HÌNH' : 'HẾT HÀNG'}
        </button>
      </div>
    </div>
  );
};

export default ComponentSelectionModal;
