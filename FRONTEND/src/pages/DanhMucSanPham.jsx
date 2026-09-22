import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import {
  createCategory,
  deactivateCategory,
  getAllCategories,
  getCategoryDetail,
  reactivateCategory,
  updateCategory,
} from '../services/categoryApi';
import './DanhMucSanPham.css';

const ROOT_FILTER = 'root';
const DEFAULT_FORM = { name: '', parentId: '', image: '', status: 'active' };
const errorMessage = (error) => error?.message || 'Không thể kết nối tới backend. Vui lòng thử lại.';

function StatusBadge({ status }) {
  return <span className={`category-status category-status--${status}`}>{status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</span>;
}

function StructureBadge({ isRoot }) {
  return <span className={`category-structure ${isRoot ? 'category-structure--root' : ''}`}>{isRoot ? 'GỐC' : 'CON'}</span>;
}

function CategoryImage({ category, large = false }) {
  return <div className={`category-image ${large ? 'category-image--large' : ''}`}>{category.image ? <img src={category.image} alt={`Ảnh đại diện ${category.name}`} /> : <span>DM</span>}</div>;
}

function SectionHeader({ children, meta }) {
  return <div className="category-section-header"><span>{children}</span>{meta && <span>{meta}</span>}</div>;
}

function LoadingState() {
  return <div className="category-network-state" role="status"><span className="category-spinner" />Đang tải dữ liệu danh mục...</div>;
}

function ErrorState({ message, onRetry }) {
  return <div className="category-network-state category-network-state--error" role="alert"><strong>Không thể tải dữ liệu</strong><span>{message}</span><button type="button" onClick={onRetry}>THỬ LẠI</button></div>;
}

function CategoryFormModal({ category, categories, productCount = 0, saving, serverError, onClose, onSave }) {
  const [form, setForm] = useState(() => category ? {
    name: category.name,
    parentId: category.parentId == null ? '' : String(category.parentId),
    image: category.image || '',
    status: category.status,
  } : DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) nextErrors.name = 'Vui lòng nhập tên danh mục.';
    else if (trimmedName.length < 2) nextErrors.name = 'Tên danh mục phải có ít nhất 2 ký tự.';
    else if (categories.some((item) => item.id !== category?.id && item.name.toLocaleLowerCase('vi') === trimmedName.toLocaleLowerCase('vi'))) nextErrors.name = 'Tên danh mục đã tồn tại.';
    const parent = form.parentId ? categories.find((item) => item.id === Number(form.parentId)) : null;
    if (parent?.parentId != null) nextErrors.parentId = 'Không thể tạo danh mục con của danh mục con.';
    if (category && parent?.id === category.id) nextErrors.parentId = 'Danh mục không thể là danh mục cha của chính nó.';
    if (category && parent && categories.some((item) => item.parentId === category.id)) nextErrors.parentId = 'Không thể chuyển danh mục đang có danh mục con thành danh mục con.';
    const hasChildren = category && categories.some((item) => item.parentId === category.id);
    if (category?.status === 'active' && form.status === 'inactive' && (hasChildren || productCount > 0)) nextErrors.status = 'Không thể ngừng hoạt động khi danh mục còn sản phẩm hoặc danh mục con trực thuộc.';
    if (form.image.trim()) {
      try {
        const parsed = new URL(form.image.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
      } catch { nextErrors.image = 'URL ảnh phải bắt đầu bằng http:// hoặc https://.'; }
    }
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    onSave({ name: trimmedName, parentId: parent?.id ?? null, image: form.image.trim(), status: form.status });
  };
  return <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => !saving && event.target === event.currentTarget && onClose()}>
    <section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
      <header className="category-modal__header"><h2 id="category-form-title">{category ? 'SỬA DANH MỤC' : 'THÊM DANH MỤC'}</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Đóng"><HiOutlineX size={24} /></button></header>
      <form onSubmit={submit} noValidate>
        <div className="category-modal__body">
          {serverError && <div className="category-inline-error" role="alert">{serverError}</div>}
          <label className="category-field"><span>TÊN DANH MỤC <b>*</b></span><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ví dụ: Laptop Gaming" autoFocus />{errors.name && <small>{errors.name}</small>}</label>
          <label className="category-field"><span>DANH MỤC CHA</span><select value={form.parentId} onChange={(event) => update('parentId', event.target.value)}><option value="">KHÔNG CÓ — DANH MỤC GỐC</option>{categories.filter((item) => item.id !== category?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.parentId && <small>{errors.parentId}</small>}</label>
          <fieldset className="category-image-field">
            <legend>ẢNH ĐẠI DIỆN</legend>
            <div className="category-mode-tabs"><button type="button" disabled title="Backend chưa có endpoint tải ảnh"><HiOutlineUpload /> TẢI ẢNH LÊN</button><button type="button" className="is-active">NHẬP URL</button></div>
            <small className="category-upload-note">Tải ảnh trực tiếp chưa được backend hỗ trợ</small>
            <input className="category-url-input" value={form.image} onChange={(event) => update('image', event.target.value)} placeholder="URL ảnh đại diện (tùy chọn)" />
            {errors.image && <small className="category-field-error">{errors.image}</small>}
          </fieldset>
          <fieldset className="category-status-field"><legend>TRẠNG THÁI</legend><div><button type="button" className={form.status === 'active' ? 'is-active' : ''} onClick={() => update('status', 'active')}>HOẠT ĐỘNG</button><button type="button" className={form.status === 'inactive' ? 'is-active' : ''} onClick={() => update('status', 'inactive')}>NGỪNG HOẠT ĐỘNG</button></div>{errors.status && <small className="category-field-error">{errors.status}</small>}</fieldset>
        </div>
        <footer className="category-modal__footer"><button type="button" disabled={saving} onClick={onClose}>HỦY</button><button type="submit" disabled={saving}>{saving ? 'ĐANG LƯU...' : category ? 'LƯU THAY ĐỔI' : 'THÊM DANH MỤC'}</button></footer>
      </form>
    </section>
  </div>;
}

function DeactivateModal({ category, categories, productCount, saving, serverError, onClose, onConfirm }) {
  const parent = categories.find((item) => item.id === category.parentId);
  const children = categories.filter((item) => item.parentId === category.id);
  const blocked = children.length > 0 || productCount > 0;
  return <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => !saving && event.target === event.currentTarget && onClose()}>
    <section className="category-modal category-modal--confirm" role="dialog" aria-modal="true" aria-labelledby="category-deactivate-title">
      <header className="category-modal__header"><h2 id="category-deactivate-title">NGỪNG HOẠT ĐỘNG DANH MỤC?</h2></header>
      <div className="category-modal__body">
        {serverError && <div className="category-inline-error" role="alert">{serverError}</div>}
        <dl className="category-confirm-info"><dt>TÊN DANH MỤC</dt><dd>{category.name}</dd><dt>DANH MỤC CHA</dt><dd>{parent?.name || 'DANH MỤC GỐC'}</dd><dt>SỐ SẢN PHẨM</dt><dd>{productCount} SP</dd><dt>TRẠNG THÁI HIỆN TẠI</dt><dd>HOẠT ĐỘNG</dd></dl>
        <div className="category-warning">Danh mục ngừng hoạt động sẽ không còn hiển thị trong điều hướng khách hàng.</div>
        {blocked && <div className="category-blocked" role="alert"><strong>KHÔNG THỂ NGỪNG HOẠT ĐỘNG DANH MỤC</strong><p>Backend không cho phép ngừng danh mục đang có sản phẩm hoặc bất kỳ danh mục con trực thuộc nào.</p><p>Vui lòng chuyển dữ liệu liên quan trước khi tiếp tục.</p></div>}
      </div>
      <footer className="category-modal__footer"><button type="button" disabled={saving} onClick={onClose}>HỦY</button><button type="button" className="category-danger-button" disabled={blocked || saving} onClick={onConfirm}>{saving ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN NGỪNG HOẠT ĐỘNG'}</button></footer>
    </section>
  </div>;
}

function useCategoryData() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setCategories(await getAllCategories()); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);
  // The effect starts the initial remote request; subsequent state updates occur after the request settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { reload(); }, [reload]);
  return { categories, loading, error, reload };
}

function CategoryModals({ modal, setModal, categories, reload }) {
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  if (!modal) return null;
  const runMutation = async (mutation) => {
    setSaving(true); setServerError('');
    try { await mutation(); await reload(); setModal(null); }
    catch (error) { setServerError(errorMessage(error)); }
    finally { setSaving(false); }
  };
  if (modal.type === 'form') {
    const editing = categories.find((item) => item.id === modal.id);
    return <CategoryFormModal category={editing} categories={categories} productCount={editing?.productCount || 0} saving={saving} serverError={serverError} onClose={() => setModal(null)} onSave={(payload) => runMutation(() => editing ? updateCategory(editing.id, payload) : createCategory(payload))} />;
  }
  const category = categories.find((item) => item.id === modal.id);
  if (!category) return null;
  return <DeactivateModal category={category} categories={categories} productCount={category.productCount || 0} saving={saving} serverError={serverError} onClose={() => setModal(null)} onConfirm={() => runMutation(() => deactivateCategory(category.id))} />;
}

export default function DanhMucSanPham() {
  const navigate = useNavigate();
  const { categories, loading, error, reload } = useCategoryData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [restoringId, setRestoringId] = useState(null);
  const roots = useMemo(() => categories.filter((item) => item.parentId == null), [categories]);
  const clearVisible = Boolean(search.trim()) || statusFilter !== 'all' || parentFilter !== 'all';
  const visibleExpanded = useMemo(() => expanded || new Set(roots.map((item) => item.id)), [expanded, roots]);
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    const matchesBase = (item) => statusFilter === 'all' || item.status === statusFilter
      ? !query || item.name.toLocaleLowerCase('vi').includes(query) || `/${item.slug}`.includes(query)
      : false;
    if (parentFilter !== 'all') return parentFilter === ROOT_FILTER ? roots.filter(matchesBase) : categories.filter((item) => item.parentId === Number(parentFilter) && matchesBase(item));
    const result = [];
    roots.forEach((root) => {
      const matchedChildren = categories.filter((item) => item.parentId === root.id).filter(matchesBase);
      const rootMatches = matchesBase(root);
      if (!rootMatches && !matchedChildren.length) return;
      if (rootMatches) result.push(root);
      if ((visibleExpanded.has(root.id) || !rootMatches) && matchedChildren.length) result.push(...matchedChildren);
    });
    return result;
  }, [categories, parentFilter, roots, search, statusFilter, visibleExpanded]);
  const stats = { total: categories.length, roots: roots.length, children: categories.length - roots.length, inactive: categories.filter((item) => item.status === 'inactive').length };
  const restore = async (category) => {
    setRestoringId(category.id); setActionError('');
    try { await reactivateCategory(category); await reload(); }
    catch (requestError) { setActionError(errorMessage(requestError)); }
    finally { setRestoringId(null); }
  };
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setParentFilter('all'); };
  return <main className="category-page">
    <div className="category-heading"><div><h1>DANH MỤC SẢN PHẨM</h1><p>Quản lý cấu trúc phân cấp danh mục và sản phẩm thuộc danh mục</p></div><button type="button" className="category-primary-button" disabled={loading || Boolean(error)} onClick={() => setModal({ type: 'form' })}>+ THÊM DANH MỤC</button></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={reload} /> : <>
      {actionError && <div className="category-inline-error category-page-error" role="alert">{actionError}<button type="button" onClick={() => setActionError('')}>×</button></div>}
      <section className="category-stats" aria-label="Thống kê danh mục"><div><strong>{stats.total}</strong><span>TỔNG DANH MỤC</span></div><div><strong>{stats.roots}</strong><span>DANH MỤC GỐC</span></div><div><strong>{stats.children}</strong><span>DANH MỤC CON</span></div><div><strong className="is-red">{stats.inactive}</strong><span>NGỪNG HOẠT ĐỘNG</span></div></section>
      <div className="category-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên danh mục / đường dẫn..." aria-label="Tìm danh mục" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái"><option value="all">TẤT CẢ TRẠNG THÁI</option><option value="active">HOẠT ĐỘNG</option><option value="inactive">NGỪNG HOẠT ĐỘNG</option></select>
        <select value={parentFilter} onChange={(event) => setParentFilter(event.target.value)} aria-label="Lọc danh mục cha"><option value="all">TẤT CẢ DANH MỤC CHA</option><option value={ROOT_FILTER}>DANH MỤC GỐC</option>{roots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {clearVisible && <button type="button" className="category-clear-button" onClick={clearFilters}>XÓA BỘ LỌC</button>}
      </div>
      <div className="category-table-wrap"><table className="category-table"><thead><tr><th>MÃ</th><th>DANH MỤC</th><th>CẤU TRÚC</th><th>SẢN PHẨM</th><th>ĐƯỜNG DẪN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
        {rows.map((item) => {
          const isRoot = item.parentId == null;
          const parent = categories.find((candidate) => candidate.id === item.parentId);
          return <tr key={item.id} className={isRoot ? 'category-root-row' : ''} onClick={(event) => {
            if (!isRoot || event.target.closest?.('.category-actions')) return;
            setExpanded((current) => { const next = new Set(current || visibleExpanded); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
          }}>
            <td>#{item.id}</td><td><button type="button" className={`category-name-cell ${isRoot ? '' : 'category-name-cell--child'}`}><CategoryImage category={item} /><span className="category-name-copy"><strong>{isRoot && (visibleExpanded.has(item.id) ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />)}{item.name}</strong>{!isRoot && <small>↳ {parent?.name || item.parentName}</small>}</span></button></td><td><StructureBadge isRoot={isRoot} /></td><td><strong>{item.productCount}</strong><small>sản phẩm</small></td><td><code>/{item.slug}</code></td><td><StatusBadge status={item.status} /></td>
            <td><div className="category-actions"><button type="button" onClick={() => navigate(`/admin/danh-muc/danh-muc-san-pham/${item.id}`)}>CHI TIẾT</button><button type="button" onClick={() => setModal({ type: 'form', id: item.id })}>SỬA</button>{item.status === 'active' ? <button type="button" className="is-danger" onClick={() => setModal({ type: 'deactivate', id: item.id })}>NGỪNG</button> : <button type="button" className="is-success" disabled={restoringId === item.id} onClick={() => restore(item)}>{restoringId === item.id ? 'ĐANG KHÔI PHỤC...' : 'KHÔI PHỤC'}</button>}</div></td>
          </tr>;
        })}
        {!rows.length && <tr><td colSpan="7" className="category-empty">{categories.length ? 'Không tìm thấy danh mục phù hợp.' : 'Chưa có danh mục nào.'}</td></tr>}
      </tbody></table></div>
      <CategoryModals key={`${modal?.type || 'none'}-${modal?.id || 'new'}`} modal={modal} setModal={setModal} categories={categories} reload={reload} />
    </>}
  </main>;
}

export function ChiTietDanhMuc() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { categories, loading: listLoading, error: listError, reload } = useCategoryData();
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState('');
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const loadDetail = useCallback(async () => {
    setDetailLoading(true); setDetailError('');
    try { setDetail(await getCategoryDetail(categoryId)); }
    catch (error) { setDetailError(errorMessage(error)); }
    finally { setDetailLoading(false); }
  }, [categoryId]);
  // The effect starts the route-specific remote request when the category id changes.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { loadDetail(); }, [loadDetail]);
  const retry = () => { reload(); loadDetail(); };
  if (listLoading || detailLoading) return <main className="category-page"><LoadingState /></main>;
  if (listError || detailError) return <main className="category-page"><ErrorState message={listError || detailError} onRetry={retry} /></main>;
  const listCategory = categories.find((item) => item.id === Number(categoryId));
  if (!detail || !listCategory) return <main className="category-page"><div className="category-not-found"><h1>KHÔNG TÌM THẤY DANH MỤC</h1><button onClick={() => navigate('/admin/danh-muc/danh-muc-san-pham')}>QUAY LẠI DANH SÁCH</button></div></main>;
  const category = { ...listCategory, ...detail, productCount: detail.products.length };
  const parent = categories.find((item) => item.id === category.parentId);
  const children = categories.filter((item) => item.parentId === category.id);
  const products = detail.products;
  const restore = async () => {
    setRestoring(true); setActionError('');
    try { await reactivateCategory(category); await Promise.all([reload(), loadDetail()]); }
    catch (error) { setActionError(errorMessage(error)); }
    finally { setRestoring(false); }
  };
  const reloadAll = async () => { await Promise.all([reload(), loadDetail()]); };
  return <main className="category-page category-detail-page">
    <button type="button" className="category-back" onClick={() => navigate('/admin/danh-muc/danh-muc-san-pham')}>← QUAY LẠI DANH SÁCH</button>
    {actionError && <div className="category-inline-error category-page-error" role="alert">{actionError}<button type="button" onClick={() => setActionError('')}>×</button></div>}
    <section className="category-detail-hero"><div className="category-detail-identity"><CategoryImage category={category} large /><div><h1>{category.name}</h1><p><StructureBadge isRoot={category.parentId == null} /> <code>/{category.slug}</code></p></div></div><div className="category-detail-actions"><StatusBadge status={category.status} /><div><button onClick={() => setModal({ type: 'form', id: category.id })}>CHỈNH SỬA</button>{category.status === 'active' ? <button className="is-danger" onClick={() => setModal({ type: 'deactivate', id: category.id })}>NGỪNG HOẠT ĐỘNG</button> : <button className="is-success" disabled={restoring} onClick={restore}>{restoring ? 'ĐANG KHÔI PHỤC...' : 'KHÔI PHỤC'}</button>}</div></div></section>
    <section className="category-detail-stats"><div><strong>#{category.id}</strong><span>MÃ DANH MỤC</span></div><div><strong>{parent?.name || 'GỐC'}</strong><span>DANH MỤC CHA</span></div><div><strong>{products.length}</strong><span>SỐ SẢN PHẨM</span></div><div><strong>{category.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</strong><span>TRẠNG THÁI</span></div></section>
    <section className="category-detail-card"><SectionHeader>THÔNG TIN DANH MỤC</SectionHeader><div className="category-information"><dl><dt>TÊN DANH MỤC</dt><dd>{category.name}</dd><dt>DANH MỤC CHA</dt><dd>{parent?.name || 'DANH MỤC GỐC'}</dd><dt>ĐƯỜNG DẪN</dt><dd>/{category.slug}</dd><dt>TRẠNG THÁI</dt><dd>{category.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</dd></dl><div className="category-information-image"><span>ẢNH ĐẠI DIỆN</span><CategoryImage category={category} large /></div></div></section>
    {category.parentId == null && children.length > 0 && <section className="category-detail-card"><SectionHeader meta={`${children.length} MỤC`}>DANH MỤC CON</SectionHeader><div className="category-detail-table-wrap"><table><thead><tr><th>MÃ</th><th>DANH MỤC</th><th>SỐ SP</th><th>TRẠNG THÁI</th></tr></thead><tbody>{children.map((child) => <tr key={child.id}><td>#{child.id}</td><td><button onClick={() => navigate(`/admin/danh-muc/danh-muc-san-pham/${child.id}`)}>{child.name}</button></td><td>{child.productCount}</td><td><StatusBadge status={child.status} /></td></tr>)}</tbody></table></div></section>}
    <section className="category-detail-card"><SectionHeader meta={`${products.length} SẢN PHẨM`}>SẢN PHẨM THUỘC DANH MỤC</SectionHeader>{products.length ? <div className="category-detail-table-wrap"><table><thead><tr><th>MÃ SẢN PHẨM</th><th>TÊN SẢN PHẨM</th><th>THƯƠNG HIỆU</th><th>TRẠNG THÁI</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.maSanPham}</td><td>{product.tenSanPham}</td><td>—</td><td><StatusBadge status={product.trangThai} /></td></tr>)}</tbody></table></div> : <div className="category-products-empty"><strong>Chưa có sản phẩm thuộc danh mục này.</strong><span>Backend chưa trả về sản phẩm nào được gán trực tiếp cho danh mục.</span></div>}</section>
    <CategoryModals key={`${modal?.type || 'none'}-${modal?.id || 'new'}`} modal={modal} setModal={setModal} categories={categories} reload={reloadAll} />
  </main>;
}
