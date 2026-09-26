import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import './ProductSection.css';

const ProductSection = ({ title, subtitle, linkText, linkUrl, products, darkTheme, categories }) => {
  const [activeTab, setActiveTab] = useState(categories ? categories[0] : null);

  const filteredProducts = activeTab
    ? products.filter(p => {
        const productCat = p.category.toLowerCase();
        const tabCat = activeTab.toLowerCase() === 'gpu' ? 'vga' : activeTab.toLowerCase();
        return productCat === tabCat;
      })
    : products;

  return (
    <section className={`product-section ${darkTheme ? 'dark-theme' : ''}`}>
      <div className="container">
        <div className="section-header">
          <div className="section-title-wrapper">
            <h2 className="section-title">{title}</h2>
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
          {linkText && (
            <Link to={linkUrl || '#'} className="section-link">
              {linkText} &rarr;
            </Link>
          )}
        </div>
        
        {categories && categories.length > 0 && (
          <div className="section-tabs-wrapper">
            <div className="section-tabs">
              {categories.map((cat, idx) => (
                <button 
                  key={idx} 
                  className={`section-tab-btn ${activeTab === cat ? 'active' : ''}`}
                  onClick={() => setActiveTab(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <ProductCard key={index} product={product} />
            ))
          ) : (
            <div className="empty-products" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#888' }}>
              Chưa có sản phẩm nào trong danh mục này.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
