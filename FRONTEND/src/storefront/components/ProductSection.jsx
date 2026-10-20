import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import './ProductSection.css';

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img"></div>
    <div className="skeleton-line long"></div>
    <div className="skeleton-line short"></div>
    <div className="skeleton-line medium"></div>
  </div>
);

const ProductSection = ({
  title,
  subtitle,
  linkText,
  linkUrl,
  products,
  darkTheme,
  categories,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState(() =>
    categories && categories.length > 0 ? categories[0] : null
  );

  useEffect(() => {
    if (categories && categories.length > 0) {
      if (!activeTab || !categories.includes(activeTab)) {
        setActiveTab(categories[0]);
      }
    }
  }, [categories]);

  const isAllTab =
    !activeTab || activeTab.toLowerCase() === 'tất cả' || activeTab.toLowerCase() === 'all';

  const filteredProducts = isAllTab
    ? products
    : products.filter((p) => {
        const productCat = (p.category || '').toLowerCase();
        const parentCat = (p.parentCategory || '').toLowerCase();
        const tabCat = activeTab.toLowerCase();

        if (tabCat === 'gpu' || tabCat === 'vga') {
          return (
            productCat.includes('gpu') ||
            productCat.includes('vga') ||
            parentCat.includes('gpu') ||
            parentCat.includes('vga')
          );
        }
        if (tabCat === 'mainboard' || tabCat === 'bo mạch') {
          return (
            productCat.includes('mainboard') ||
            productCat.includes('bo mạch') ||
            productCat.includes('main')
          );
        }
        if (tabCat === 'psu' || tabCat === 'nguồn') {
          return productCat.includes('psu') || productCat.includes('nguồn');
        }
        if (tabCat === 'case' || tabCat === 'vỏ case') {
          return (
            productCat.includes('case') || productCat.includes('vỏ') || parentCat.includes('case')
          );
        }

        return productCat.includes(tabCat) || parentCat.includes(tabCat);
      });

  return (
    <section className={`product-section ${darkTheme ? 'dark-theme' : ''}`}>
      <div className="container">
        <div className="section-header">
          <div className="section-title-wrapper">
            <h2 className="product-section-title">{title}</h2>
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
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => <ProductCard key={index} product={product} />)
          ) : (
            <div
              className="empty-products"
              style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#888' }}
            >
              Chưa có sản phẩm nào trong danh mục này.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
