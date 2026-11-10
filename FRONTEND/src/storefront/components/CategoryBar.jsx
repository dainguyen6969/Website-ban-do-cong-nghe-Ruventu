import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useCatalogOptions from '../hooks/useCatalogOptions';
import { brandLogoUrl } from './brandLogo';
import { createRecommendationScroll } from './recommendationScroll';
import './CategoryBar.css';

export default function CategoryBar() {
  const { brands, loading, error } = useCatalogOptions();
  const viewport = useRef(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const scroll = createRecommendationScroll(element);
    element.addEventListener('wheel', scroll.onWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', scroll.onWheel);
      scroll.stop();
    };
  }, [brands, loading, error]);
  return <div className="category-bar"><div className="container brands-container">
    {loading ? <p role="status">Đang tải thương hiệu...</p> : error ? <p role="alert">{error}</p> : <div ref={viewport} className="brands-list" role="region" aria-label="Thương hiệu — dùng con lăn chuột hoặc vuốt để cuộn ngang" tabIndex={0}>
      {brands.map(brand => <Link key={brand.id} to={`/search?thuong_hieu_id=${brand.id}`} className="brand-item" aria-label={brand.tenThuongHieu}>
        {brand.logo && <img src={brandLogoUrl(brand.logo)} alt="" className="brand-logo" loading="lazy" decoding="async" onError={event => {
          const image = event.currentTarget;
          if (image.dataset.original) image.hidden = true;
          else { image.dataset.original = 'true'; image.src = brand.logo; }
        }} />}
        <span className="brand-name">{brand.tenThuongHieu}</span>
      </Link>)}
    </div>}
  </div></div>;
}
