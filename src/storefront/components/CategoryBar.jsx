import React from 'react';
import './CategoryBar.css';

const CategoryBar = () => {
  return (
    <div className="category-bar">
      <div className="container category-container">
        <div className="category-tabs">
          <div className="tab active">DANH MỤC</div>
          <div className="tab">PC BUILD</div>
          <div className="tab">LINH KIỆN</div>
          <div className="tab">PHỤ KIỆN</div>
          <div className="tab">MÀN HÌNH</div>
          <div className="tab">LAPTOP</div>
          <div className="tab">TẢN NHIỆT</div>
        </div>
      </div>
      <div className="brands-bar">
        <div className="container brands-container">
          <div className="brand-label">THƯƠNG HIỆU</div>
          <div className="brands-list">
            <span className="brand-item">NVIDIA</span>
            <span className="brand-item">AMD</span>
            <span className="brand-item">ASUS ROG</span>
            <span className="brand-item">MSI</span>
            <span className="brand-item">CORSAIR</span>
            <span className="brand-item">INTEL</span>
            <span className="brand-item">GIGABYTE</span>
            <span className="brand-item">SAMSUNG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
