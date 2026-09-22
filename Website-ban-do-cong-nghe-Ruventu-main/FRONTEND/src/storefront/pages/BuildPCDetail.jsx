import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import InfoBar from '../components/InfoBar';
import CategoryBar from '../components/CategoryBar';
import Footer from '../components/Footer';
import PCComponentList from '../components/PCComponentList';
import ProductGallery from '../components/ProductGallery';
import ProductPurchaseSidebar from '../components/ProductPurchaseSidebar';
import ProductSpecsTabs from '../components/ProductSpecsTabs';
import './BuildPCDetail.css';

// Import newly generated images for gallery
import pcWarlordImg from '../assets/pc_warlord.png';
import vga4080Img from '../assets/vga_4080.png';
import pcTitanImg from '../assets/pc_titan.png';
import pcStrikerImg from '../assets/pc_striker.png';
import pcPhantomImg from '../assets/pc_phantom.png';

const BuildPCDetail = () => {
  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="build-pc-detail-page">
      <Header />
      <InfoBar />
      <CategoryBar />
      
      {/* Breadcrumbs */}
      <div className="breadcrumb-container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="separator">&gt;</span>
          <Link to="/build-pc">PC Build Sẵn</Link>
          <span className="separator">&gt;</span>
          <span className="current">REVENTU WARLORD PRO — High-End Gaming</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="product-main-container">
        {/* Left Sidebar - Components */}
        <div className="components-sidebar-column">
          <PCComponentList />
        </div>

        {/* Center - Gallery */}
        <div className="gallery-column">
          <ProductGallery images={[pcWarlordImg, vga4080Img, pcTitanImg, pcStrikerImg, pcPhantomImg]} />
        </div>

        {/* Right Sidebar - Purchase Info */}
        <div className="purchase-sidebar-column">
          <ProductPurchaseSidebar />
        </div>
      </div>

      {/* Bottom Tabs Area */}
      <div className="tabs-container">
        <ProductSpecsTabs />
      </div>

      <Footer />
    </div>
  );
};

export default BuildPCDetail;
