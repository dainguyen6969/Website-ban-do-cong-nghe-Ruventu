import React from 'react';
import { Link } from 'react-router-dom';
import './CategoryBar.css';

const CategoryBar = () => {
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

  return (
    <div className="category-bar">
      <div className="container brands-container">
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
  );
};

export default CategoryBar;
