import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import InfoBar from '../components/InfoBar';
import CategoryBar from '../components/CategoryBar';
import Footer from '../components/Footer';
import ProductGallery from '../components/ProductGallery';
import ProductInfoSidebar from '../components/ProductInfoSidebar';
import ProductPurchaseRightSidebar from '../components/ProductPurchaseRightSidebar';
import ProductSpecsTabs from '../components/ProductSpecsTabs';
import { mockProducts } from '../data/mockProducts';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const product = mockProducts[id] || mockProducts["RVT-MB-X670E-MSI-TOM"];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!product) return <div>Loading...</div>;

  return (
    <div className="product-detail-page">
      <Header />
      <InfoBar />
      <CategoryBar />
      
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
          <ProductInfoSidebar product={product} />
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
          <ProductPurchaseRightSidebar product={product} />
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
