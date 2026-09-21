import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlinePhotograph,
  HiOutlineUpload,
  HiOutlineX,
} from 'react-icons/hi';
import { getMockProducts } from '../data/mockProducts';
import {
  CATEGORY_SYNC_SLICE,
  createUniqueSlug,
  getCategoryProductMap,
  nextCategoryId,
  readProductCategories,
  saveProductCategories,
} from '../data/productCategories';
import { readSharedState, subscribeToAdminSlice } from '../sync/adminSync';
import './DanhMucSanPham.css';

const ROOT_FILTER = 'root';
const DEFAULT_FORM = {
  name: '', parentId: '', imageMode: 'upload', image: '', url: '', status: 'active',
};

function StatusBadge({ status }) {
  return <span className={`category-status category-status--${status}`}>{status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</span>;
}

function StructureBadge({ isRoot }) {
  return <span className={`category-structure ${isRoot ? 'category-structure--root' : ''}`}>{isRoot ? 'GỐC' : 'CON'}</span>;
}

function CategoryImage({ category, large = false }) {
  return (
    <div className={`category-image ${large ? 'category-image--large' : ''}`}>
      {category.image ? <img src={category.image} alt={`Ảnh đại diện ${category.name}`} /> : <span>DM</span>}
    </div>
  );
}

function SectionHeader({ children, meta }) {
  return <div className="category-section-header"><span>{children}</span>{meta && <span>{meta}</span>}</div>;
}

function CategoryFormModal({ category, categories, productCount = 0, onClose, onSave }) {
  const [form, setForm] = useState(() => category ? {
    name: category.name,
    parentId: category.parentId == null ? '' : String(category.parentId),
    imageMode: category.imageMode || (category.image?.startsWith('data:') ? 'upload' : 'url'),
    image: category.image || '',
    url: category.imageMode === 'url' ? category.image || '' : '',
    status: category.status,
  } : DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((current) => ({ ...current, image: 'Vui lòng chọn một tệp hình ảnh hợp lệ.' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((current) => ({ ...current, image: 'Ảnh tải lên không được vượt quá 2 MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('image', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) nextErrors.name = 'Vui lòng nhập tên danh mục.';
    else if (trimmedName.length < 2) nextErrors.name = 'Tên danh mục phải có ít nhất 2 ký tự.';
    else if (categories.some((item) => item.id !== category?.id && item.name.toLocaleLowerCase('vi') === trimmedName.toLocaleLowerCase('vi'))) {
      nextErrors.name = 'Tên danh mục đã tồn tại.';
    }

    const parent = form.parentId ? categories.find((item) => item.id === Number(form.parentId)) : null;
    if (parent?.parentId != null) nextErrors.parentId = 'Không thể tạo danh mục con của danh mục con.';
    if (category && parent?.id === category.id) nextErrors.parentId = 'Danh mục không thể là danh mục cha của chính nó.';
    if (category && parent && categories.some((item) => item.parentId === category.id)) {
      nextErrors.parentId = 'Không thể chuyển danh mục đang có danh mục con thành danh mục con.';
    }
    const hasActiveChildren = category && categories.some((item) => item.parentId === category.id && item.status === 'active');
    if (category?.status === 'active' && form.status === 'inactive' && (hasActiveChildren || productCount > 0)) {
      nextErrors.status = 'Không thể ngừng hoạt động khi danh mục còn sản phẩm hoặc danh mục con đang hoạt động.';
    }
    if (form.imageMode === 'url' && form.url.trim()) {
      try {
        const parsed = new URL(form.url.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
      } catch {
        nextErrors.url = 'URL ảnh phải bắt đầu bằng http:// hoặc https://.';
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave({
      name: trimmedName,
      parentId: parent?.id ?? null,
      imageMode: form.imageMode,
      image: form.imageMode === 'upload' ? form.image : form.url.trim(),
      status: form.status,
    });
  };

  return (
    <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
        <header className="category-modal__header">
          <h2 id="category-form-title">{category ? 'SỬA DANH MỤC' : 'THÊM DANH MỤC'}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng"><HiOutlineX size={24} /></button>
        </header>
        <form onSubmit={submit} noValidate>
          <div className="category-modal__body">
            <label className="category-field">
              <span>TÊN DANH MỤC <b>*</b></span>
              <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ví dụ: Laptop Gaming" autoFocus />
              {errors.name && <small>{errors.name}</small>}
            </label>
            <label className="category-field">
              <span>DANH MỤC CHA</span>
              <select value={form.parentId} onChange={(event) => update('parentId', event.target.value)}>
                <option value="">KHÔNG CÓ — DANH MỤC GỐC</option>
                {categories.filter((item) => item.id !== category?.id).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {errors.parentId && <small>{errors.parentId}</small>}
            </label>
            <fieldset className="category-image-field">
              <legend>ẢNH ĐẠI DIỆN</legend>
              <div className="category-mode-tabs">
                <button type="button" className={form.imageMode === 'upload' ? 'is-active' : ''} onClick={() => update('imageMode', 'upload')}><HiOutlineUpload /> TẢI ẢNH LÊN</button>
                <button type="button" className={form.imageMode === 'url' ? 'is-active' : ''} onClick={() => update('imageMode', 'url')}>NHẬP URL</button>
              </div>
              {form.imageMode === 'upload' ? (
                <div className="category-upload-row">
                  <button type="button" className="category-upload" onClick={() => fileInputRef.current?.click()}>
                    {form.image ? <img src={form.image} alt="Xem trước ảnh tải lên" /> : <><HiOutlinePhotograph size={24} /><span>CHỌN ẢNH</span><small>PNG, JPG, WEBP — tối đa 2 MB</small></>}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
                  {form.image && <button type="button" className="category-remove-image" onClick={() => update('image', '')}>XÓA ẢNH</button>}
                </div>
              ) : (
                <input className="category-url-input" value={form.url} onChange={(event) => update('url', event.target.value)} placeholder="URL ảnh đại diện (tùy chọn)" />
              )}
              {(errors.image || errors.url) && <small className="category-field-error">{errors.image || errors.url}</small>}
            </fieldset>
            <fieldset className="category-status-field">
              <legend>TRẠNG THÁI</legend>
              <div>
                <button type="button" className={form.status === 'active' ? 'is-active' : ''} onClick={() => update('status', 'active')}>HOẠT ĐỘNG</button>
                <button type="button" className={form.status === 'inactive' ? 'is-active' : ''} onClick={() => update('status', 'inactive')}>NGỪNG HOẠT ĐỘNG</button>
              </div>
              {errors.status && <small className="category-field-error">{errors.status}</small>}
            </fieldset>
          </div>
          <footer className="category-modal__footer">
            <button type="button" onClick={onClose}>HỦY</button>
            <button type="submit">{category ? 'LƯU THAY ĐỔI' : 'THÊM DANH MỤC'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function DeactivateModal({ category, categories, productCount, onClose, onConfirm }) {
  const parent = categories.find((item) => item.id === category.parentId);
  const activeChildren = categories.filter((item) => item.parentId === category.id && item.status === 'active');
  const blocked = activeChildren.length > 0 || productCount > 0;
  return (
    <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="category-modal category-modal--confirm" role="dialog" aria-modal="true" aria-labelledby="category-deactivate-title">
        <header className="category-modal__header"><h2 id="category-deactivate-title">NGỪNG HOẠT ĐỘNG DANH MỤC?</h2></header>
        <div className="category-modal__body">
          <dl className="category-confirm-info">
            <dt>TÊN DANH MỤC</dt><dd>{category.name}</dd>
            <dt>DANH MỤC CHA</dt><dd>{parent?.name || 'DANH MỤC GỐC'}</dd>
            <dt>SỐ SẢN PHẨM</dt><dd>{productCount} SP</dd>
            <dt>TRẠNG THÁI HIỆN TẠI</dt><dd>HOẠT ĐỘNG</dd>
          </dl>
          <div className="category-warning">Danh mục ngừng hoạt động sẽ không còn hiển thị trong điều hướng khách hàng.</div>
          {blocked && (
            <div className="category-blocked" role="alert">
              <strong>KHÔNG THỂ NGỪNG HOẠT ĐỘNG DANH MỤC</strong>
              <p>Danh mục đang có sản phẩm hoặc danh mục con trực thuộc.</p>
              <p>Vui lòng chuyển dữ liệu liên quan hoặc chuyển danh mục con sang ngừng hoạt động.</p>
            </div>
          )}
        </div>
        <footer className="category-modal__footer">
          <button type="button" onClick={onClose}>HỦY</button>
          <button type="button" className="category-danger-button" disabled={blocked} onClick={onConfirm}>XÁC NHẬN NGỪNG HOẠT ĐỘNG</button>
        </footer>
      </section>
    </div>
  );
}

function useCategoryData() {
  const [categories, setCategories] = useState(readProductCategories);
  const [products, setProducts] = useState(getMockProducts);
  useEffect(() => subscribeToAdminSlice(CATEGORY_SYNC_SLICE, () => setCategories(readProductCategories())), []);
  useEffect(() => subscribeToAdminSlice('products', () => setProducts(readSharedState('ruventu_products_v1', getMockProducts()))), []);
  const productMap = useMemo(() => getCategoryProductMap(categories, products), [categories, products]);
  const commit = (next, action, entityId) => {
    setCategories(next);
    saveProductCategories(next, action, entityId);
  };
  return { categories, products, productMap, commit };
}

function CategoryModals({ modal, setModal, categories, productMap, commit }) {
  if (!modal) return null;
  if (modal.type === 'form') {
    const editing = categories.find((item) => item.id === modal.id);
    return <CategoryFormModal category={editing} categories={categories} productCount={editing ? productMap.counts[editing.id] || 0 : 0} onClose={() => setModal(null)} onSave={(payload) => {
      if (editing) {
        commit(categories.map((item) => item.id === editing.id ? { ...item, ...payload } : item), 'updated', editing.id);
      } else {
        const id = nextCategoryId(categories);
        commit([...categories, { id, ...payload, slug: createUniqueSlug(payload.name, categories) }], 'created', id);
      }
      setModal(null);
    }} />;
  }
  const category = categories.find((item) => item.id === modal.id);
  if (!category) return null;
  return <DeactivateModal category={category} categories={categories} productCount={productMap.counts[category.id] || 0} onClose={() => setModal(null)} onConfirm={() => {
    commit(categories.map((item) => item.id === category.id ? { ...item, status: 'inactive' } : item), 'deactivated', category.id);
    setModal(null);
  }} />;
}

export default function DanhMucSanPham() {
  const navigate = useNavigate();
  const { categories, productMap, commit } = useCategoryData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');
  const [expanded, setExpanded] = useState(() => new Set(readProductCategories().filter((item) => item.parentId == null).map((item) => item.id)));
  const [modal, setModal] = useState(null);
  const roots = useMemo(() => categories.filter((item) => item.parentId == null), [categories]);
  const clearVisible = Boolean(search.trim()) || statusFilter !== 'all' || parentFilter !== 'all';

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    const matchesBase = (item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (query && !item.name.toLocaleLowerCase('vi').includes(query) && !`/${item.slug}`.includes(query)) return false;
      return true;
    };
    if (parentFilter !== 'all') {
      if (parentFilter === ROOT_FILTER) return roots.filter(matchesBase);
      return categories.filter((item) => item.parentId === Number(parentFilter) && matchesBase(item));
    }
    const result = [];
    roots.forEach((root) => {
      const children = categories.filter((item) => item.parentId === root.id);
      const matchedChildren = children.filter(matchesBase);
      const rootMatches = matchesBase(root);
      if (!rootMatches && matchedChildren.length === 0) return;
      if (rootMatches) result.push(root);
      if ((expanded.has(root.id) || !rootMatches) && matchedChildren.length) result.push(...matchedChildren);
    });
    return result;
  }, [categories, expanded, parentFilter, roots, search, statusFilter]);

  const stats = {
    total: categories.length,
    roots: roots.length,
    children: categories.length - roots.length,
    inactive: categories.filter((item) => item.status === 'inactive').length,
  };

  const restore = (id) => commit(categories.map((item) => item.id === id ? { ...item, status: 'active' } : item), 'restored', id);
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setParentFilter('all'); };

  return (
    <main className="category-page">
      <div className="category-heading">
        <div><h1>DANH MỤC SẢN PHẨM</h1><p>Quản lý cấu trúc phân cấp danh mục và sản phẩm thuộc danh mục</p></div>
        <button type="button" className="category-primary-button" onClick={() => setModal({ type: 'form' })}>+ THÊM DANH MỤC</button>
      </div>
      <section className="category-stats" aria-label="Thống kê danh mục">
        <div><strong>{stats.total}</strong><span>TỔNG DANH MỤC</span></div>
        <div><strong>{stats.roots}</strong><span>DANH MỤC GỐC</span></div>
        <div><strong>{stats.children}</strong><span>DANH MỤC CON</span></div>
        <div><strong className="is-red">{stats.inactive}</strong><span>NGỪNG HOẠT ĐỘNG</span></div>
      </section>
      <div className="category-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên danh mục / đường dẫn..." aria-label="Tìm danh mục" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái">
          <option value="all">TẤT CẢ TRẠNG THÁI</option><option value="active">HOẠT ĐỘNG</option><option value="inactive">NGỪNG HOẠT ĐỘNG</option>
        </select>
        <select value={parentFilter} onChange={(event) => setParentFilter(event.target.value)} aria-label="Lọc danh mục cha">
          <option value="all">TẤT CẢ DANH MỤC CHA</option><option value={ROOT_FILTER}>DANH MỤC GỐC</option>
          {roots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {clearVisible && <button type="button" className="category-clear-button" onClick={clearFilters}>XÓA BỘ LỌC</button>}
      </div>
      <div className="category-table-wrap">
        <table className="category-table">
          <thead><tr><th>MÃ</th><th>DANH MỤC</th><th>CẤU TRÚC</th><th>SẢN PHẨM</th><th>ĐƯỜNG DẪN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const isRoot = item.parentId == null;
              const parent = categories.find((candidate) => candidate.id === item.parentId);
              const count = productMap.counts[item.id] || 0;
              return (
                <tr key={item.id} className={isRoot ? 'category-root-row' : ''} onClick={(event) => {
                  if (!isRoot || event.target.closest?.('.category-actions')) return;
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
                }}>
                  <td>#{item.id}</td>
                  <td>
                    <button type="button" className={`category-name-cell ${isRoot ? '' : 'category-name-cell--child'}`}>
                      <CategoryImage category={item} />
                      <span className="category-name-copy">
                        <strong>{isRoot && (expanded.has(item.id) ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />)}{item.name}</strong>
                        {!isRoot && <small>↳ {parent?.name}</small>}
                      </span>
                    </button>
                  </td>
                  <td><StructureBadge isRoot={isRoot} /></td>
                  <td><strong>{count}</strong><small>sản phẩm</small></td>
                  <td><code>/{item.slug}</code></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td><div className="category-actions">
                    <button type="button" onClick={() => navigate(`/admin/danh-muc/danh-muc-san-pham/${item.id}`)}>CHI TIẾT</button>
                    <button type="button" onClick={() => setModal({ type: 'form', id: item.id })}>SỬA</button>
                    {item.status === 'active' ? <button type="button" className="is-danger" onClick={() => setModal({ type: 'deactivate', id: item.id })}>NGỪNG</button> : <button type="button" className="is-success" onClick={() => restore(item.id)}>KHÔI PHỤC</button>}
                  </div></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan="7" className="category-empty">Không tìm thấy danh mục phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
      <CategoryModals modal={modal} setModal={setModal} categories={categories} productMap={productMap} commit={commit} />
    </main>
  );
}

export function ChiTietDanhMuc() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { categories, productMap, commit } = useCategoryData();
  const [modal, setModal] = useState(null);
  const category = categories.find((item) => item.id === Number(categoryId));
  if (!category) return <main className="category-page"><div className="category-not-found"><h1>KHÔNG TÌM THẤY DANH MỤC</h1><button onClick={() => navigate('/admin/danh-muc/danh-muc-san-pham')}>QUAY LẠI DANH SÁCH</button></div></main>;
  const parent = categories.find((item) => item.id === category.parentId);
  const children = categories.filter((item) => item.parentId === category.id);
  const products = productMap.productsByCategory[category.id] || [];
  const restore = () => commit(categories.map((item) => item.id === category.id ? { ...item, status: 'active' } : item), 'restored', category.id);
  return (
    <main className="category-page category-detail-page">
      <button type="button" className="category-back" onClick={() => navigate('/admin/danh-muc/danh-muc-san-pham')}>← QUAY LẠI DANH SÁCH</button>
      <section className="category-detail-hero">
        <div className="category-detail-identity"><CategoryImage category={category} large /><div><h1>{category.name}</h1><p><StructureBadge isRoot={category.parentId == null} /> <code>/{category.slug}</code></p></div></div>
        <div className="category-detail-actions"><StatusBadge status={category.status} /><div><button onClick={() => setModal({ type: 'form', id: category.id })}>CHỈNH SỬA</button>{category.status === 'active' ? <button className="is-danger" onClick={() => setModal({ type: 'deactivate', id: category.id })}>NGỪNG HOẠT ĐỘNG</button> : <button className="is-success" onClick={restore}>KHÔI PHỤC</button>}</div></div>
      </section>
      <section className="category-detail-stats">
        <div><strong>#{category.id}</strong><span>MÃ DANH MỤC</span></div><div><strong>{parent?.name || 'GỐC'}</strong><span>DANH MỤC CHA</span></div><div><strong>{products.length}</strong><span>SỐ SẢN PHẨM</span></div><div><strong>{category.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</strong><span>TRẠNG THÁI</span></div>
      </section>
      <section className="category-detail-card"><SectionHeader>THÔNG TIN DANH MỤC</SectionHeader><div className="category-information"><dl><dt>TÊN DANH MỤC</dt><dd>{category.name}</dd><dt>DANH MỤC CHA</dt><dd>{parent?.name || 'DANH MỤC GỐC'}</dd><dt>ĐƯỜNG DẪN</dt><dd>/{category.slug}</dd><dt>TRẠNG THÁI</dt><dd>{category.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</dd></dl><div className="category-information-image"><span>ẢNH ĐẠI DIỆN</span><CategoryImage category={category} large /></div></div></section>
      {category.parentId == null && children.length > 0 && <section className="category-detail-card"><SectionHeader meta={`${children.length} MỤC`}>DANH MỤC CON</SectionHeader><div className="category-detail-table-wrap"><table><thead><tr><th>MÃ</th><th>DANH MỤC</th><th>SỐ SP</th><th>TRẠNG THÁI</th></tr></thead><tbody>{children.map((child) => <tr key={child.id}><td>#{child.id}</td><td><button onClick={() => navigate(`/admin/danh-muc/danh-muc-san-pham/${child.id}`)}>{child.name}</button></td><td>{productMap.counts[child.id] || 0}</td><td><StatusBadge status={child.status} /></td></tr>)}</tbody></table></div></section>}
      <section className="category-detail-card"><SectionHeader meta={`${products.length} SẢN PHẨM`}>SẢN PHẨM THUỘC DANH MỤC</SectionHeader>{products.length ? <div className="category-detail-table-wrap"><table><thead><tr><th>MÃ SẢN PHẨM</th><th>TÊN SẢN PHẨM</th><th>THƯƠNG HIỆU</th><th>TRẠNG THÁI</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.maSanPham}</td><td>{product.tenSanPham}</td><td>{product.thuongHieu || '—'}</td><td>{product.trangThaiBan}</td></tr>)}</tbody></table></div> : <div className="category-products-empty"><strong>Chưa có sản phẩm thuộc danh mục này.</strong><span>Sản phẩm sẽ xuất hiện tại đây khi danh mục được chọn trong thông tin sản phẩm.</span></div>}</section>
      <CategoryModals modal={modal} setModal={setModal} categories={categories} productMap={productMap} commit={commit} />
    </main>
  );
}
