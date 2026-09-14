import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './CategoryBar.css';

const CategoryBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const brands = [
    { name: 'NVIDIA', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/NVIDIA_logo.svg' },
    { name: 'AMD', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg' },
    { name: 'ASUS', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg' },
    { name: 'MSI', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Micro-Star_International_logo.svg' },
    { name: 'CORSAIR', logo: 'https://placehold.co/120x30/f9f9f9/000000?text=CORSAIR&font=Montserrat' },
    { name: 'INTEL', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Intel_logo_%282006-2020%29.svg' },
    { name: 'GIGABYTE', logo: 'https://placehold.co/120x30/f9f9f9/000000?text=GIGABYTE&font=Montserrat' },
    { name: 'SAMSUNG', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Samsung_old_logo_before_year_2015.svg' }
  ];

  const categories = [
    { name: 'PC BUILD', path: '/category/pc-build' },
    { name: 'LINH KIỆN', path: '/category/linh-kien' },
    { name: 'PHỤ KIỆN', path: '/category/gaming-gear' },
    { name: 'MÀN HÌNH', path: '/category/man-hinh' },
    { name: 'LAPTOP', path: '/category/laptop' },
    { name: 'TẢN NHIỆT', path: '/category/tan-nhiet' }
  ];

  return (
    <div className="category-bar">
      <div className="container category-container">
        <div className="category-tabs">
          <div className="tab active">DANH MỤC</div>
          {categories.map((cat, index) => (
            <Link 
              key={index} 
              to={cat.path} 
              className={`tab ${currentPath === cat.path ? 'highlight' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="brands-bar">
        <div className="container brands-container">
          <div className="brand-label">THƯƠNG HIỆU</div>
          <div className="brands-list">
            {brands.map((brand, index) => (
              <Link 
                key={index} 
                to={`/search?q=${brand.name}`} 
                className="brand-item"
              >
                <img src={brand.logo} alt={brand.name} className="brand-logo" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
