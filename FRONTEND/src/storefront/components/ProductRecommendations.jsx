import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { getRecommendedProducts, recommendationResultsUrl } from '../services/recommendationService';
import { createRecommendationScroll } from './recommendationScroll';
import './ProductRecommendations.css';

export function RecommendationRail({ title, products, moreUrl }) {
  const headingId = useId();
  const viewport = useRef(null);
  const wheelScroll = useRef(null);
  const items = products.slice(0, 15);
  const [edges, setEdges] = useState({ start: true, end: items.length <= 5 });

  const scrollCard = useCallback(direction => {
    wheelScroll.current?.stop();
    const element = viewport.current;
    const card = element.querySelector('.product-card');
    if (card) element.scrollBy({
      left: direction * (card.getBoundingClientRect().width + parseFloat(window.getComputedStyle(card.parentElement).columnGap)),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, []);

  useEffect(() => {
    const element = viewport.current;
    const list = element.parentElement;
    const scroll = createRecommendationScroll(element);
    wheelScroll.current = scroll;
    const onScroll = () => {
      const start = element.scrollLeft <= 1;
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
      setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end });
    };
    const resize = new ResizeObserver(onScroll);
    resize.observe(element);
    element.addEventListener('scroll', onScroll, { passive: true });
    list.addEventListener('wheel', scroll.onWheel, { passive: false });
    onScroll();
    return () => {
      resize.disconnect();
      scroll.stop();
      wheelScroll.current = null;
      element.removeEventListener('scroll', onScroll);
      list.removeEventListener('wheel', scroll.onWheel);
    };
  }, [products]);

  return (
    <section className="recommendation-rail" aria-labelledby={headingId}>
      <div className="recommendation-rail__header">
        <h2 id={headingId}>{title}</h2>
      </div>
      <div className="recommendation-rail__list">
        <div className="recommendation-rail__controls recommendation-rail__controls--previous">
          <button type="button" aria-label={`Sản phẩm trước: ${title}`} disabled={edges.start} onClick={() => scrollCard(-1)}><ChevronLeft size={20} /></button>
        </div>
        <div className="recommendation-rail__viewport" ref={viewport} tabIndex={0} aria-label={`Cuộn sản phẩm: ${title}`}>
          {items.length ? (
            <div className="recommendation-rail__products">
              {items.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : <p>Chưa có sản phẩm gợi ý.</p>}
        </div>
        <div className="recommendation-rail__controls recommendation-rail__controls--next">
          {!edges.end ? (
            <button type="button" aria-label={`Sản phẩm tiếp theo: ${title}`} onClick={() => scrollCard(1)}><ChevronRight size={20} /></button>
          ) : <Link className="recommendation-rail__more" to={moreUrl}>XEM THÊM</Link>}
        </div>
      </div>
    </section>
  );
}

export default function ProductRecommendations({ product }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getRecommendedProducts({ excludeId: product.id })
      .then(items => { if (active) setProducts(items); })
      .catch(reason => { if (active) setError(reason.response?.data?.message || reason.message || 'Không tải được sản phẩm gợi ý.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product.id]);

  const related = product.categoryId == null ? [] : products.filter(item => String(item.categoryId) === String(product.categoryId));

  return (
    <div className="product-recommendations">
      {loading ? <p role="status">Đang tải sản phẩm gợi ý...</p> : error ? <p role="alert">{error}</p> : <>
        <RecommendationRail title="Sản phẩm liên quan" products={related} moreUrl={recommendationResultsUrl(product, true)} />
        <RecommendationRail title="Có thể bạn sẽ thích" products={products} moreUrl={recommendationResultsUrl(product)} />
      </>}
    </div>
  );
}
