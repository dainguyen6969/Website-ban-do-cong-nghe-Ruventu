import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import TablePagination from '../../shared/components/ui/TablePagination';
import { productService } from '../../shared/services/productService';
import { catalogScopes, inCatalogScope } from './catalogModel';
import './CategoryPage.css';

export default function CategoryPage() {
  const { slug } = useParams();
  return <CategoryContent key={slug} slug={slug} />;
}

function CategoryContent({ slug }) {
  const scope = catalogScopes[slug];
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  useEffect(() => {
    let active = true;
    productService.getAllProducts({ sort: 'moi_nhat' }).then(items => {
      if (active) { setCatalog(items); setLoading(false); }
    }).catch(reason => { if (active) { setError(reason.response?.data?.message || reason.message); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const scoped = catalog.filter(product => inCatalogScope(product, slug));
  const products = scoped.filter(product => (!brands.length || brands.includes(product.brand)) && (!categories.length || categories.includes(product.category)) && (!minPrice || product.priceValue >= Number(minPrice)) && (!maxPrice || product.priceValue <= Number(maxPrice)));
  if (sort === 'price-asc') products.sort((a,b) => a.priceValue - b.priceValue);
  if (sort === 'price-desc') products.sort((a,b) => b.priceValue - a.priceValue);
  if (sort === 'name-asc') products.sort((a,b) => a.title.localeCompare(b.title,'vi'));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(products.length / 20)));
  const toggle = (set, selected, value) => { set(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]); setPage(1); };
  return <div className="storefront-category-page"><Header />
    <div className="breadcrumb-wrapper"><div className="container"><div className="breadcrumb"><Link to="/">Trang chủ</Link><span className="separator">/</span><span className="current">{scope?.title || 'Không tìm thấy danh mục'}</span></div></div></div>
    <div className="category-banner"><div className="container"><h1 className="category-title">{scope?.title || 'KHÔNG TÌM THẤY DANH MỤC'}</h1></div></div>
    <div className="category-main container"><aside className="category-sidebar"><div className="filter-block"><h3 className="filter-title">LỌC SẢN PHẨM</h3>
      {[[ 'Thương hiệu', 'brand', brands, setBrands ], [ 'Loại sản phẩm', 'category', categories, setCategories ]].map(([label, field, selected, set]) => <div className="filter-group" key={field}><h4 className="filter-group-title">{label}</h4><div className="filter-options">{[...new Set(scoped.map(product => product[field]).filter(Boolean))].sort((a,b) => a.localeCompare(b,'vi')).map(value => <label className="filter-label" key={value}><input type="checkbox" className="filter-checkbox" checked={selected.includes(value)} onChange={() => toggle(set, selected, value)} /><span className="filter-text">{value}</span></label>)}</div></div>)}
      <div className="filter-group"><h4 className="filter-group-title">Khoảng giá</h4><label>Giá tối thiểu<input type="number" min="0" value={minPrice} onChange={event => { setMinPrice(event.target.value); setPage(1); }} /></label><label>Giá tối đa<input type="number" min="0" value={maxPrice} onChange={event => { setMaxPrice(event.target.value); setPage(1); }} /></label></div>
      <button type="button" className="page-btn" onClick={() => { setBrands([]); setCategories([]); setMinPrice(''); setMaxPrice(''); setPage(1); }}>XÓA BỘ LỌC</button>
    </div></aside><div className="category-content"><div className="category-toolbar"><div className="toolbar-left">Hiển thị <strong>{products.length}</strong> sản phẩm</div><div className="toolbar-right"><label>Sắp xếp theo:<select className="sort-select" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="newest">Mới nhất</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option><option value="name-asc">Tên A-Z</option></select></label></div></div>
      {loading ? <p role="status">Đang tải sản phẩm...</p> : error ? <p role="alert">{error}</p> : !products.length ? <p role="status">Không tìm thấy sản phẩm phù hợp.</p> : <div className="category-product-grid">{products.slice((currentPage - 1) * 20, currentPage * 20).map(product => <ProductCard key={product.id} product={product} />)}</div>}
      <TablePagination totalItems={products.length} pageSize={20} currentPage={currentPage} onPageChange={setPage} idPrefix="store-category" />
    </div></div><Footer /></div>;
}
