import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import './ProductGallery.css';

const ProductGallery = ({ images = [], discountPercent, isFullBuild = false }) => {
  const galleryImages = images;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex === galleryImages.length - 1 ? 0 : prevIndex + 1));
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? galleryImages.length - 1 : prevIndex - 1));
  };

  return (
    <div className="product-gallery-container">
      {/* Top badges */}
      <div className="gallery-badges">
        {discountPercent > 0 && <div className="discount-badge">-{discountPercent}%</div>}
      </div>

      {/* Main Image */}
      <div className="main-image-wrapper">
        {galleryImages.length > 1 && <button className="nav-arrow left-arrow" onClick={prevImage}>
          <ChevronLeft size={24} />
        </button>}
        
        {galleryImages.length > 0 ? <img
          src={galleryImages[currentIndex]} 
          alt={`Product view ${currentIndex + 1}`} 
          className="main-gallery-image"
        /> : <p className="gallery-empty">Chưa có ảnh sản phẩm</p>}

        {galleryImages.length > 1 && <button className="nav-arrow right-arrow" onClick={nextImage}>
          <ChevronRight size={24} />
        </button>}

        {galleryImages.length > 0 && <button className="zoom-btn">
          <ZoomIn size={18} /> PHÓNG TO
        </button>}
      </div>

      {/* Thumbnails */}
      <div className="thumbnail-strip">
        {galleryImages.map((img, index) => (
          <div 
            key={index} 
            className={`thumbnail-item ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          >
            <img src={img} alt={`Thumbnail ${index + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGallery;
