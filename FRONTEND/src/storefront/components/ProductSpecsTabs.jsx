import { useMemo } from 'react';
import { sanitizeDescription } from '../pages/productDetailContent';
import './ProductSpecsTabs.css';

export default function ProductSpecsTabs({product}) {
  const title = product?.descriptionTitle || product?.name || 'Sản phẩm';
  const description = useMemo(() => sanitizeDescription(product?.description || '',title),[product?.description,title]);
  return <section className="product-description" aria-labelledby="product-description-title">
    <div className="product-description__bar"><h2 id="product-description-title">Mô tả sản phẩm</h2></div>
    <div className="product-description__body"><div className="product-description__article">
      <header className="product-description__heading"><h3>{title}</h3></header>
      {description.trim() ? <div className="product-description__html" dangerouslySetInnerHTML={{__html:description}} />
        : <p className="product-description__empty">Chưa có mô tả sản phẩm.</p>}
    </div></div>
  </section>;
}
