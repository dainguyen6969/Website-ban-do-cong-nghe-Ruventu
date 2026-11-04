import { Link } from 'react-router-dom';
import NavMenu from './NavMenu';
import useCatalogOptions from '../hooks/useCatalogOptions';
import { categoryTreeIds, componentCategoryIds } from '../pages/catalogModel';

export default function CatalogNavigation() {
  const { categories, brands, loading, error } = useCatalogOptions();
  const groups = [
    { slug: 'linh-kien', title: 'Linh Kiện PC' },
    { slug: 'phu-kien', title: 'Gaming Gear' },
    { slug: 'man-hinh', title: 'Màn Hình' },
    { slug: 'laptop', title: 'Laptop' },
  ];
  const componentIds = componentCategoryIds(categories);
  return groups.map(group => {
    const root = categories.find(c => c.duongDanUrl === group.slug || (group.slug === 'phu-kien' && c.duongDanUrl === 'gaming-gear'));
    if (group.slug !== 'linh-kien' && !root) return null;
    const ids = root ? categoryTreeIds(categories, root.id) : null;
    const items = categories.filter(c => (ids || componentIds).has(Number(c.id)));
    return <NavMenu key={group.slug} className="catalog-nav-item" label={root?.tenDanhMuc || group.title} to={`/category/${root?.duongDanUrl || group.slug}`}>
      <div className="mega-menu-content">
        <div className="mega-col">
          <h4 className="mega-title">Danh mục sản phẩm</h4>
          {loading ? <p role="status">Đang tải danh mục...</p> : error ? <p role="alert">{error}</p> : <ul>{items.map(c => <li key={c.id}><Link to={`/category/${encodeURIComponent(c.duongDanUrl)}`}>{c.tenDanhMuc}</Link></li>)}</ul>}
        </div>
        <div className="mega-col catalog-brand-links">
          <h4 className="mega-title">Thương hiệu</h4>
          <ul>{brands.map(b => <li key={b.id}><Link to={`/search?thuong_hieu_id=${b.id}`}>{b.tenThuongHieu}</Link></li>)}</ul>
        </div>
      </div>
    </NavMenu>;
  });
}
