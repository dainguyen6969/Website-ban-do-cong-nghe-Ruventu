import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductGallery from '../components/ProductGallery';
import ProductInfoSidebar from '../components/ProductInfoSidebar';
import ProductPurchaseRightSidebar from '../components/ProductPurchaseRightSidebar';
import ProductSpecsTabs from '../components/ProductSpecsTabs';
import { mockProducts } from '../data/mockProducts';
import { productService } from '../../shared/services/productService';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await productService.getProductDetail(id);
        if (response && response.data) {
          const backendData = response.data;
          const mainVariant = backendData.danhSachPhienBan && backendData.danhSachPhienBan[0] ? backendData.danhSachPhienBan[0] : null;
          
          const mappedProduct = {
            id: backendData.id,
            category: backendData.danhMuc?.tenDanhMuc || 'Chưa phân loại',
            brand: backendData.thuongHieu?.tenThuongHieu || 'Chưa rõ',
            name: backendData.tenSanPham,
            currentPrice: mainVariant ? mainVariant.giaBanLe : 0,
            originalPrice: mainVariant ? mainVariant.giaBanLe : 0,
            stock: mainVariant ? mainVariant.tonCoTheBan : 0,
            discountPercent: 0,
            images: backendData.anhSanPham?.map(img => img.duongDanAnh) || [],
            specsSummary: backendData.thongSoKyThuat ? Object.keys(backendData.thongSoKyThuat).slice(0,4).map(k => ({ label: k, value: backendData.thongSoKyThuat[k] })) : [],
            fullSpecs: backendData.thongSoKyThuat ? Object.keys(backendData.thongSoKyThuat).map(k => ({ label: k, value: backendData.thongSoKyThuat[k] })) : [],
            tags: [],
            policies: [
              { title: "MIỄN PHÍ VẬN CHUYỂN", desc: "Đơn từ 5tr", icon: "truck" },
              { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
            ],
            description: backendData.moTa,
            variants: backendData.danhSachPhienBan || []
          };
          setProduct(mappedProduct);
          if (mappedProduct.variants && mappedProduct.variants.length > 0) {
            setSelectedVariantId(mappedProduct.variants[0].id);
          }
        }
      } catch (err) {
        console.error("Lỗi fetch chi tiết sản phẩm:", err);
        // Fallback to mock data if API fails
        const foundProduct = mockProducts[id] || mockProducts["RVT-MB-X670E-MSI-TOM"];
        setProduct(foundProduct);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div style={{textAlign: 'center', padding: '50px'}}>Đang tải thông tin sản phẩm...</div>;
  if (!product) return <div style={{textAlign: 'center', padding: '50px'}}>Không tìm thấy sản phẩm.</div>;

  return (
    <div className="product-detail-page">
      <Header />
      
      {/* Breadcrumbs */}
      <div className="breadcrumb-container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="separator">&gt;</span>
          <Link to={`/category/${product.category.toLowerCase()}`}>{product.category}</Link>
          <span className="separator">&gt;</span>
          <span className="current">{product.name}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="product-main-container">
        {/* Left Sidebar - Specs summary and thumbnail */}
        <div className="info-sidebar-column">
          <ProductInfoSidebar 
            product={product} 
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
          />
        </div>

        {/* Center - Gallery */}
        <div className="gallery-column">
          <ProductGallery 
            images={product.images || []} 
            discountPercent={product.discountPercent} 
            isFullBuild={false} 
          />
        </div>

        {/* Right Sidebar - Purchase Info */}
        <div className="purchase-right-sidebar-column">
          <ProductPurchaseRightSidebar 
            product={product} 
            selectedVariantId={selectedVariantId}
          />
        </div>
      </div>

      {/* Bottom Tabs Area */}
      <div className="tabs-container">
        <ProductSpecsTabs product={product} />
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;
