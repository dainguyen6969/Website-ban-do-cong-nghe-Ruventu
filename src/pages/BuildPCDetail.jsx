import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
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
  const { id } = useParams();
  const [selectedComponent, setSelectedComponent] = useState(null);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const defaultImages = [pcWarlordImg, vga4080Img, pcTitanImg, pcStrikerImg, pcPhantomImg];
  const galleryImages = selectedComponent ? [selectedComponent.img] : defaultImages;

  return (
    <div className="build-pc-detail-page">
      <Header />
      
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
          <PCComponentList 
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
          />
        </div>

        {/* Center - Gallery */}
        <div className="gallery-column">
          <ProductGallery images={galleryImages} />
        </div>

        {/* Right Sidebar - Purchase Info */}
        <div className="purchase-sidebar-column">
          <ProductPurchaseSidebar 
            selectedComponent={selectedComponent}
            onClearSelection={() => setSelectedComponent(null)}
          />
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
