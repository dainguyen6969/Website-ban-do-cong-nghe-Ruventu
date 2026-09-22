import React from 'react';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import InfoBar from '../components/InfoBar';
import CategoryBar from '../components/CategoryBar';
import ProductSection from '../components/ProductSection';
import Footer from '../components/Footer';
import { mockPcBuildProducts, mockLinhKien, mockGamingGear } from '../data/categoryData';

import ConsultationBanner from '../components/ConsultationBanner';

const Home = () => {
  return (
    <div className="home-page">
      <Header />
      <HeroBanner />
      <InfoBar />
      <CategoryBar />
      
      {/* PC Build Section */}
      <ProductSection 
        title="PC BUILD SẴN" 
        subtitle="Cấu hình hoàn chỉnh - Lắp ráp & kiểm tra 100% - Bảo hành 36 tháng"
        linkText="XEM TẤT CẢ"
        linkUrl="/category/pc-build"
        products={mockPcBuildProducts}
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
