import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import InfoBar from '../components/InfoBar';
import CategoryBar from '../components/CategoryBar';
import ProductSection from '../components/ProductSection';
import Footer from '../components/Footer';
import { mockPcBuildProducts, mockLinhKien, mockGamingGear } from '../data/categoryData';
import { productService } from '../../shared/services/productService';

import ConsultationBanner from '../components/ConsultationBanner';

const Home = () => {
  const [realProducts, setRealProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productService.getProducts({ ton_kho: true });
        if (response && response.data && response.data.danhSachSanPham) {
          const mappedProducts = response.data.danhSachSanPham.map(p => ({
            id: p.id,
            title: p.tenSanPham,
            image: p.anhChinh || 'https://via.placeholder.com/300',
            price: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.giaThapNhat),
            category: p.tenDanhMuc,
            outOfStock: !p.conHang
          }));
          setRealProducts(mappedProducts);
        }
      } catch (error) {
        console.error("Lỗi fetch sản phẩm:", error);
      }
    };
    loadProducts();
  }, []);

  return (
    <div className="home-page">
      <Header />
      <HeroBanner />
      <InfoBar />
      <CategoryBar />
      
      {/* Real Products Section */}
      <ProductSection 
        title="PC BUILD SẴN" 
        subtitle="Cấu hình hoàn chỉnh - Lắp ráp & kiểm tra 100% - Bảo hành 36 tháng"
        linkText="XEM TẤT CẢ"
        linkUrl="/category/pc-build"
        products={realProducts.length > 0 ? realProducts : mockPcBuildProducts}
      />

      {/* Consultation Banner */}
      <ConsultationBanner />

      {/* Linh Kien Section */}
      <ProductSection 
        title="LINH KIỆN KHỦNG" 
        subtitle="GPU flagship & mainboard cao cấp - Hiệu năng không thỏa hiệp"
        linkText="XEM TẤT CẢ"
        linkUrl="/category/linh-kien"
        products={mockLinhKien}
        categories={['GPU', 'Mainboard', 'CPU', 'RAM', 'SSD']}
      />

      {/* Gaming Gear Section - Dark Theme */}
      <ProductSection 
        title="GAMING GEAR" 
        subtitle="Bàn phím cơ & chuột gaming - Độ trễ 0 - Chiến thắng mọi đối thủ"
        linkText="XEM TẤT CẢ"
        linkUrl="/category/gaming-gear"
        products={mockGamingGear}
        darkTheme={true}
      />

      <Footer />
    </div>
  );
};

export default Home;
