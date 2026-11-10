import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import NavMenu from './NavMenu';
import useCatalogOptions from '../hooks/useCatalogOptions';
import { categoryTreeIds, componentCategoryIds } from '../pages/catalogModel';

function buildCategoryTree(items) {
  const ids = new Set(items.map(item => String(item.id)));
  const byParent = new Map();
  for (const item of items) {
    const parent = String(item.danhMucChaId);
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(item);
  }

  const visited = new Set();
  const branch = item => {
    const id = String(item.id);
    if (visited.has(id)) return null;
    visited.add(id);
    return { item, children: (byParent.get(id) || []).map(branch).filter(Boolean) };
  };
  const roots = items.filter(item => !ids.has(String(item.danhMucChaId)));
  return [...roots, ...items].map(branch).filter(Boolean);
}

function CategoryBranch({ node }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const { item, children } = node;
  const hasChildren = children.length > 0;

  return <li>
    <div className="catalog-category-row">
      <Link title={item.tenDanhMuc} to={`/category/${encodeURIComponent(item.duongDanUrl)}`}>{item.tenDanhMuc}</Link>
      {hasChildren && <button type="button" className="catalog-category-toggle"
        aria-label={`Danh mục con của ${item.tenDanhMuc}`} aria-expanded={expanded}
        aria-controls={panelId} onClick={() => setExpanded(current => !current)}>
        <ChevronDown size={14} aria-hidden="true" />
      </button>}
    </div>
    {hasChildren && <ul id={panelId} className="catalog-subcategories" hidden={!expanded}>
      {children.map(child => <CategoryBranch key={child.item.id} node={child} />)}
    </ul>}
  </li>;
}

export default function CatalogNavigation() {
  const { categories, brands, loading, error } = useCatalogOptions();
  const groups = [
    { slug: 'linh-kien', title: 'Linh Kiện PC' },
    { slug: 'phu-kien', title: 'Phụ Kiện' },
    { slug: 'man-hinh', title: 'Màn Hình' },
    { slug: 'laptop', title: 'Laptop' },
  ];
  const componentIds = componentCategoryIds(categories);
  return groups.map(group => {
    const root = categories.find(c => c.duongDanUrl === group.slug || (group.slug === 'phu-kien' && c.duongDanUrl === 'gaming-gear'));
    if (group.slug !== 'linh-kien' && !root) return null;
    const ids = root ? categoryTreeIds(categories, root.id) : null;
    const items = categories.filter(c => (ids || componentIds).has(Number(c.id)));
    const tree = buildCategoryTree(root && items.length > 1
      ? items.filter(c => Number(c.id) !== Number(root.id))
      : items);
    const groupUrl = `/category/${encodeURIComponent(root?.duongDanUrl || group.slug)}`;
    return <NavMenu key={group.slug} className="catalog-nav-item" label={root?.tenDanhMuc || group.title} to={groupUrl}>
      <div className="mega-menu-content">
        <div className="mega-col">
          <h4 className="mega-title">Danh mục</h4>
          {loading ? <p role="status">Đang tải danh mục...</p> : error ? <p role="alert">{error}</p> : (
            <ul className={tree.some(node => node.children.length) ? 'catalog-category-tree' : undefined}>
              {tree.map(node => <CategoryBranch key={node.item.id} node={node} />)}
            </ul>
          )}
        </div>
        <div className="mega-col catalog-brand-links">
          <h4 className="mega-title">Thương hiệu</h4>
          <ul>{brands.map(b => <li key={b.id}><Link title={b.tenThuongHieu} to={`${groupUrl}?thuong_hieu_id=${encodeURIComponent(b.id)}`}>{b.tenThuongHieu}</Link></li>)}</ul>
        </div>
      </div>
    </NavMenu>;
  });
}
