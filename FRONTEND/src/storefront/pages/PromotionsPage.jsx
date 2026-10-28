import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import TablePagination from '../../shared/components/ui/TablePagination';
import { productService } from '../../shared/services/productService';
import './CategoryPage.css';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const PromotionsPage = () => {
  const [products, setProducts] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await productService.getProducts({
          ton_kho: true,
          limit: 100,
          sort: 'moi_nhat',
        });
        if (response?.data?.danhSachSanPham) {
          const mapped = response.data.danhSachSanPham
            .map((p) => ({
              id: p.id,
              title: p.tenSanPham,
              name: p.tenSanPham,
              image: p.anhChinh || 'https://via.placeholder.com/300',
              priceRaw: Number(p.giaThapNhat ?? 0),
              price: formatVND(p.giaThapNhat),
              brand: p.tenThuongHieu || '',
              category: p.tenDanhMuc || '',
              outOfStock: !p.conHang,
            }))
            .filter((p) => !p.outOfStock);
          setProducts(mapped);
        }
      } catch (error) {
        console.error('Lỗi tải sản phẩm khuyến mãi:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === 'price-asc') {
      return list.sort((a, b) => a.priceRaw - b.priceRaw);
    }
    if (sortBy === 'price-desc') {
      return list.sort((a, b) => b.priceRaw - a.priceRaw);
    }
    return list;
  }, [products, sortBy]);

  return (
    <div className="storefront-category-page">
      <Header />

      {/* Breadcrumb */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="separator">/</span>
            <span className="current">Khuyến Mãi</span>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div
        className="category-banner"
        style={{ background: 'linear-gradient(90deg, #8b0000, #ff0000)' }}
      >
        <div className="container">
          <h1 className="category-title" style={{ color: '#fff', textTransform: 'uppercase' }}>
            CHƯƠNG TRÌNH KHUYẾN MÃI
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="category-main container" style={{ display: 'block' }}>
        {/* Product Grid Area (Full Width since no sidebar) */}
        <div className="category-content">
          <div className="category-toolbar">
            <div className="toolbar-left">
              <span>
                Hiển thị <strong>{sortedProducts.length}</strong> sản phẩm
              </span>
            </div>
            <div className="toolbar-right">
              <label>Sắp xếp theo:</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="sort-select"
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
              </select>
            </div>
          </div>

          <div className="category-product-grid">
            {isLoading ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px',
                  color: '#888',
                }}
              >
                Đang tải sản phẩm...
              </div>
            ) : sortedProducts.length > 0 ? (
              sortedProducts.slice((page - 1) * pageSize, page * pageSize).map((product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px',
                  color: '#888',
                }}
              >
                Chưa có sản phẩm nào.
              </div>
            )}
          </div>

          <TablePagination totalItems={sortedProducts.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} idPrefix="storefront-promotions" />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PromotionsPage;
