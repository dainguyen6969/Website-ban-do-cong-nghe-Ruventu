import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import './ProductGallery.css';
import productImg from '../assets/imgg.png'; // Mock image

const ProductGallery = ({ images = [], discountPercent, isFullBuild = false }) => {
  // If no images are provided, use an array of mock images
  const galleryImages = images.length > 0 ? images : Array(6).fill(productImg);
  const [currentIndex, setCurrentIndex] = useState(0);

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
        {isFullBuild && <div className="full-build-badge">FULL BUILD</div>}
      </div>

      {/* Main Image */}
      <div className="main-image-wrapper">
        <button className="nav-arrow left-arrow" onClick={prevImage}>
          <ChevronLeft size={24} />
        </button>
        
        <img 
          src={galleryImages[currentIndex]} 
          alt={`Product view ${currentIndex + 1}`} 
          className="main-gallery-image"
        />

        <button className="nav-arrow right-arrow" onClick={nextImage}>
          <ChevronRight size={24} />
        </button>

        <button className="zoom-btn">
          <ZoomIn size={18} /> PHÓNG TO
        </button>
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
