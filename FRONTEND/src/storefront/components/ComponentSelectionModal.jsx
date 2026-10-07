import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { productService } from '../../shared/services/productService';
import './ComponentSelectionModal.css';

const ComponentSelectionModal = ({ slot, onClose, onSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('TẤT CẢ');
  const [selectedPrice, setSelectedPrice] = useState('TẤT CẢ');
  const [selectedStock, setSelectedStock] = useState('TẤT CẢ');
  const [selectedSort, setSelectedSort] = useState('NỔI BẬT');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Fetch products matching the slot category
        // Since this is mock/demo, we pass category filter to productService
        const res = await productService.getProducts({ 
          ten_danh_muc: slot.filterCategory
        });
        if (res && res.data && res.data.danhSachSanPham) {
          const rawProducts = res.data.danhSachSanPham;
          // Extract unique brands for filter
          const uniqueBrands = [...new Set(rawProducts.map(p => p.thuongHieu?.tenThuongHieu).filter(Boolean))];
          setBrands(uniqueBrands);

          setProducts(rawProducts.map(p => {
            const variant = p.danhSachPhienBan && p.danhSachPhienBan[0] ? p.danhSachPhienBan[0] : {};
            return {
              id: p.id,
              title: p.tenSanPham,
              image: p.anhChinh || 'https://via.placeholder.com/150',
              brand: p.thuongHieu?.tenThuongHieu || 'Chưa rõ',
              price: variant.giaBanLe || 0,
              stock: (variant.tonCoTheBan && variant.tonCoTheBan > 0) ? variant.tonCoTheBan : 2,
              specs: p.thongSoKyThuat || {},
              code: p.id,
              phienBanId: variant.id
            };
          }));
        }
      } catch (e) {
        console.error("Lỗi fetch sản phẩm modal:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [slot]);

  // Apply filters locally for demo purposes since backend filtering might be limited
  let filteredProducts = products.filter(p => {
    if (searchTerm && !(p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) && !String(p.code || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedBrand !== 'TẤT CẢ' && p.brand !== selectedBrand) return false;
    
    if (selectedPrice === 'DƯỚI 5 TRIỆU' && p.price >= 5000000) return false;
    if (selectedPrice === '5 - 15 TRIỆU' && (p.price < 5000000 || p.price > 15000000)) return false;
    if (selectedPrice === 'TRÊN 15 TRIỆU' && p.price <= 15000000) return false;

    if (selectedStock === 'CÒN HÀNG' && p.stock <= 0) return false;

    return true;
  });

  // Sort
  if (selectedSort === 'GIÁ THẤP ĐẾN CAO') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (selectedSort === 'GIÁ CAO ĐẾN THẤP') {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  const clearFilters = () => {
    setSelectedBrand('TẤT CẢ');
    setSelectedPrice('TẤT CẢ');
    setSelectedStock('TẤT CẢ');
    setSelectedSort('NỔI BẬT');
    setSearchTerm('');
  };

  return (
    <div className="build-modal-overlay">
      <div className="build-modal-content">
        
        <div className="build-modal-header">
          <div className="build-modal-title">
            CHỌN {slot.title} — {slot.subtitle}
          </div>
          <button className="build-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="build-modal-search-bar">
          <input 
            type="text" 
            placeholder="TÌM TÊN SẢN PHẨM / MÃ SP..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="build-modal-body">
          {/* Left Sidebar Filters */}
          <div className="build-modal-sidebar">
            <div className="filter-group">
              <div className="filter-title">BỘ LỌC</div>
              
              <div className="filter-section">
                <div className="filter-label">THƯƠNG HIỆU</div>
                <div className="filter-options">
                  <div className={`filter-option ${selectedBrand === 'TẤT CẢ' ? 'active' : ''}`} onClick={() => setSelectedBrand('TẤT CẢ')}>TẤT CẢ</div>
                  {brands.map(b => (
                    <div key={b} className={`filter-option ${selectedBrand === b ? 'active' : ''}`} onClick={() => setSelectedBrand(b)}>{b}</div>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-label">KHOẢNG GIÁ</div>
                <div className="filter-options">
                  <div className={`filter-option ${selectedPrice === 'TẤT CẢ' ? 'active' : ''}`} onClick={() => setSelectedPrice('TẤT CẢ')}>TẤT CẢ</div>
                  <div className={`filter-option ${selectedPrice === 'DƯỚI 5 TRIỆU' ? 'active' : ''}`} onClick={() => setSelectedPrice('DƯỚI 5 TRIỆU')}>DƯỚI 5 TRIỆU</div>
                  <div className={`filter-option ${selectedPrice === '5 - 15 TRIỆU' ? 'active' : ''}`} onClick={() => setSelectedPrice('5 - 15 TRIỆU')}>5 - 15 TRIỆU</div>
                  <div className={`filter-option ${selectedPrice === 'TRÊN 15 TRIỆU' ? 'active' : ''}`} onClick={() => setSelectedPrice('TRÊN 15 TRIỆU')}>TRÊN 15 TRIỆU</div>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-label">TÌNH TRẠNG KHO</div>
                <div className="filter-options">
                  <div className={`filter-option ${selectedStock === 'TẤT CẢ' ? 'active' : ''}`} onClick={() => setSelectedStock('TẤT CẢ')}>TẤT CẢ</div>
                  <div className={`filter-option ${selectedStock === 'CÒN HÀNG' ? 'active' : ''}`} onClick={() => setSelectedStock('CÒN HÀNG')}>CÒN HÀNG</div>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-label">SẮP XẾP</div>
                <div className="filter-options">
                  <div className={`filter-option ${selectedSort === 'NỔI BẬT' ? 'active' : ''}`} onClick={() => setSelectedSort('NỔI BẬT')}>NỔI BẬT</div>
                  <div className={`filter-option ${selectedSort === 'GIÁ THẤP ĐẾN CAO' ? 'active' : ''}`} onClick={() => setSelectedSort('GIÁ THẤP ĐẾN CAO')}>GIÁ THẤP ĐẾN CAO</div>
                  <div className={`filter-option ${selectedSort === 'GIÁ CAO ĐẾN THẤP' ? 'active' : ''}`} onClick={() => setSelectedSort('GIÁ CAO ĐẾN THẤP')}>GIÁ CAO ĐẾN THẤP</div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Product List */}
          <div className="build-modal-main">
            <div className="build-modal-main-header">
              <div className="result-count">{filteredProducts.length} SẢN PHẨM PHÙ HỢP</div>
              <button className="btn-clear-filter" onClick={clearFilters}>XÓA BỘ LỌC</button>
            </div>

            <div className="build-modal-product-list">
              {loading ? (
                <div className="loading-msg">Đang tải sản phẩm...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="loading-msg">Không có sản phẩm nào phù hợp.</div>
              ) : (
                filteredProducts.map(p => (
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

  const increase = () => setQty(prev => (product.stock > prev ? prev + 1 : prev));
  const decrease = () => setQty(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="build-product-row">
      <div className="build-product-info">
        <img src={product.image} alt={product.title} className="build-product-img" />
        <div className="build-product-details">
          <div className="build-product-title">{product.title}</div>
          <div className="build-product-specs">
            <span>MÃ SP: {product.code}</span>
            <span>BẢO HÀNH: 36 THÁNG</span>
            {product.specs && Object.keys(product.specs).slice(0, 2).map(k => (
              <span key={k}>{k}: {product.specs[k]}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="build-product-action">
        <div className="build-product-stock">KHO HÀNG<br/><strong>CÒN {product.stock}</strong></div>
        <div className="build-product-price">{product.price.toLocaleString('vi-VN')}đ</div>
        <div className="build-product-qty">
          <div className="qty-label">SỐ LƯỢNG</div>
          <div className="qty-controls">
            <button onClick={decrease}>-</button>
            <input type="text" value={qty} readOnly />
            <button onClick={increase}>+</button>
          </div>
        </div>
        <button 
          className="btn-add-config" 
          onClick={() => onSelect(qty)}
          disabled={product.stock <= 0}
        >
          THÊM VÀO CẤU HÌNH
        </button>
      </div>
    </div>
  );
};

export default ComponentSelectionModal;
