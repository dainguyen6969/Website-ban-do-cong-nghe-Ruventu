// Admin category list/detail/forms backed by the IntelliJ catalog API.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import DetailTablePagination from '../../../../../shared/components/ui/DetailTablePagination';
import FilterDropdown from '../../../../../shared/components/ui/FilterDropdown';
import ImageUploader from '../../../../../shared/components/ui/ImageUploader';
import useDetailTablePagination from '../../../../../hooks/useDetailTablePagination';
import {
  createCategory,
  deactivateCategory,
  getAllCategories,
  getCategoryDetail,
  reactivateCategory,
  updateCategory,
} from '../api/categoryApi';
import './DanhMucSanPham.css';

const ROOT_FILTER = 'root';
const DEFAULT_FORM = { name: '', parentId: '', image: '', status: 'active' };
const errorMessage = (error) => error?.message || 'Không thể kết nối tới backend. Vui lòng thử lại.';

function isDescendant(targetParentId, categoryId, categories) {
  if (!targetParentId || !categoryId) return false;
  let currentId = Number(targetParentId);
  const targetId = Number(categoryId);
  const visited = new Set();
  while (currentId != null) {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const parentCategory = categories.find((c) => c.id === currentId);
    currentId = parentCategory?.parentId != null ? Number(parentCategory.parentId) : null;
  }
  return false;
}

function StatusBadge({ status }) {
  return <span className={`category-status category-status--${status}`}>{status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</span>;
}

function StructureBadge({ isRoot, depth = 0 }) {
  let label = 'GỐC';
  if (!isRoot) {
    label = depth > 1 ? `CON CẤP ${depth}` : 'CON';
  }
  return <span className={`category-structure ${isRoot ? 'category-structure--root' : ''}`}>{label}</span>;
}

function CategoryImage({ category, large = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = category?.image || category?.anhDaiDien || category?.anh_dai_dien || '';

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  return (
    <div className={`category-image ${large ? 'category-image--large' : ''}`}>
      {src && !imgFailed ? (
        <img
          src={src}
          alt={`Ảnh đại diện ${category?.name || ''}`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span>DM</span>
      )}
    </div>
  );
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
  const [imageMode, setImageMode] = useState('upload');
  const [images, setImages] = useState(() => (category?.image ? [{ id: 'current', url: category.image }] : []));
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleImagesChange = (nextOrUpdater) => {
    setImages((prev) => {
      const currentList = Array.isArray(prev) ? prev : [];
      const resolved = typeof nextOrUpdater === 'function' ? nextOrUpdater(currentList) : nextOrUpdater;
      const list = Array.isArray(resolved) ? resolved : [];
      const active = list[list.length - 1];
      if (active?.url && !active.uploading && !active.error) {
        setForm((curr) => ({ ...curr, image: active.url }));
        setErrors((curr) => ({ ...curr, image: '' }));
      } else if (!active) {
        setForm((curr) => ({ ...curr, image: '' }));
      }
      return active ? [active] : [];
    });
  };

  const selectableParents = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      const pId = cat.parentId;
      if (pId != null) {
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId).push(cat);
      }
    });
    const rootNodes = categories.filter((c) => c.parentId == null);

    const buildOptions = (nodes, depth = 0) => {
      const options = [];
      nodes.forEach((node) => {
        // Exclude self and descendants of self if editing
        if (category && (node.id === category.id || isDescendant(node.id, category.id, categories))) {
          return;
        }
        const indent = depth > 0 ? `${'— '.repeat(depth)}` : '';
        options.push({
          id: node.id,
          name: `${indent}${node.name}`,
          depth,
        });
        const children = map.get(node.id) || [];
        if (children.length > 0) {
          options.push(...buildOptions(children, depth + 1));
        }
      });
      return options;
    };
    return buildOptions(rootNodes, 0);
  }, [category, categories]);

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) nextErrors.name = 'Vui lòng nhập tên danh mục.';
    else if (trimmedName.length < 2) nextErrors.name = 'Tên danh mục phải có ít nhất 2 ký tự.';
    else if (categories.some((item) => item.id !== category?.id && item.name.toLocaleLowerCase('vi') === trimmedName.toLocaleLowerCase('vi'))) nextErrors.name = 'Tên danh mục đã tồn tại.';

    const parent = form.parentId ? categories.find((item) => item.id === Number(form.parentId)) : null;

    if (category && parent) {
      if (parent.id === category.id) {
        nextErrors.parentId = 'Danh mục không thể là danh mục cha của chính nó.';
      } else if (isDescendant(parent.id, category.id, categories)) {
        nextErrors.parentId = 'Không thể chọn danh mục con của chính nó làm danh mục cha (tránh vòng lặp).';
      }
    }

    const hasChildren = category && categories.some((item) => item.parentId === category.id);
    if (category?.status === 'active' && form.status === 'inactive' && (hasChildren || productCount > 0)) {
      nextErrors.status = 'Không thể ngừng hoạt động khi danh mục còn sản phẩm hoặc danh mục con trực thuộc.';
    }

    const trimmedImage = form.image.trim();
    if (imageMode === 'upload' && images[0]?.uploading) {
      nextErrors.image = 'Ảnh đang được tải lên. Vui lòng chờ hoàn tất.';
    } else if (imageMode === 'upload' && images[0]?.error) {
      nextErrors.image = images[0].error;
    } else if (trimmedImage) {
      try {
        const parsed = new URL(trimmedImage);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
      } catch {
        nextErrors.image = 'URL ảnh phải bắt đầu bằng http:// hoặc https://.';
      }
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave({
      name: trimmedName,
      parentId: parent?.id ?? null,
      image: trimmedImage,
      status: form.status,
    });
  };

  return <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => !saving && event.target === event.currentTarget && onClose()}>
    <section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
      <header className="category-modal__header"><h2 id="category-form-title">{category ? 'SỬA DANH MỤC' : 'THÊM DANH MỤC'}</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Đóng"><HiOutlineX size={24} /></button></header>
      <form onSubmit={submit} noValidate>
        <div className="category-modal__body">
          {serverError && <div className="category-inline-error" role="alert">{serverError}</div>}
          <label className="category-field"><span>TÊN DANH MỤC <b>*</b></span><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ví dụ: Laptop Gaming" autoFocus />{errors.name && <small>{errors.name}</small>}</label>
          <label className="category-field">
            <span>DANH MỤC CHA</span>
            <FilterDropdown value={form.parentId} onChange={(event) => update('parentId', event.target.value)} selectedDark>
              <option value="">KHÔNG CÓ — DANH MỤC GỐC</option>
              {selectableParents.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </FilterDropdown>
            {errors.parentId && <small>{errors.parentId}</small>}
          </label>
          <fieldset className="category-image-field">
            <legend>ẢNH ĐẠI DIỆN</legend>
            <div className="category-mode-tabs">
              <button
                type="button"
                className={imageMode === 'upload' ? 'is-active' : ''}
                onClick={() => {
                  setImageMode('upload');
                  setErrors({});
                  if (form.image.trim() && (!images.length || images[0]?.url !== form.image.trim())) {
                    setImages([{ id: 'current', url: form.image.trim() }]);
                  }
                }}
              >
                <HiOutlineUpload /> TẢI ẢNH LÊN
              </button>
              <button
                type="button"
                className={imageMode === 'url' ? 'is-active' : ''}
                onClick={() => {
                  setImageMode('url');
                  setErrors({});
                }}
              >
                NHẬP URL
              </button>
            </div>
            {imageMode === 'upload' ? (
              <ImageUploader
                images={images}
                onImagesChange={handleImagesChange}
                maxSizeMB={5}
                folder="categories"
              />
            ) : (
              <>
                <input
                  className="category-url-input"
                  value={form.image}
                  onChange={(event) => update('image', event.target.value)}
                  placeholder="URL ảnh đại diện (tùy chọn)"
                />
                {form.image && (
                  <div className="category-image-preview">
                    <img
                      src={form.image}
                      alt="Xem trước ảnh"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </>
            )}
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

  const childrenMap = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      const pId = cat.parentId;
      if (pId != null) {
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId).push(cat);
      }
    });
    return map;
  }, [categories]);

  const roots = useMemo(() => {
    const allIds = new Set(categories.map((c) => c.id));
    return categories.filter((item) => item.parentId == null || !allIds.has(item.parentId));
  }, [categories]);

  const parentFilterOptions = useMemo(() => {
    const buildOptions = (nodes, depth = 0) => {
      const options = [];
      nodes.forEach((node) => {
        const indent = depth > 0 ? `${'— '.repeat(depth)}` : '';
        options.push({
          id: node.id,
          name: `${indent}${node.name}`,
        });
        const children = childrenMap.get(node.id) || [];
        if (children.length > 0) {
          options.push(...buildOptions(children, depth + 1));
        }
      });
      return options;
    };
    return buildOptions(roots, 0);
  }, [childrenMap, roots]);

  const defaultExpanded = useMemo(() => {
    return new Set(categories.filter((c) => (childrenMap.get(c.id)?.length || 0) > 0).map((c) => c.id));
  }, [categories, childrenMap]);

  const visibleExpanded = useMemo(() => expanded || defaultExpanded, [expanded, defaultExpanded]);

  const clearVisible = Boolean(search.trim()) || statusFilter !== 'all' || parentFilter !== 'all';

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    const isSearching = Boolean(query);

    const matchesBase = (item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!query) return true;
      return (
        item.name.toLocaleLowerCase('vi').includes(query) ||
        `/${item.slug || ''}`.includes(query) ||
        String(item.id).includes(query)
      );
    };

    if (parentFilter !== 'all') {
      return parentFilter === ROOT_FILTER
        ? roots
            .filter(matchesBase)
            .map((r) => ({ ...r, depth: 0, hasChildren: (childrenMap.get(r.id)?.length || 0) > 0 }))
        : categories
            .filter((item) => item.parentId === Number(parentFilter) && matchesBase(item))
            .map((c) => ({ ...c, depth: 1, hasChildren: (childrenMap.get(c.id)?.length || 0) > 0 }));
    }

    const hasMatchingDescendant = (nodeId) => {
      const children = childrenMap.get(nodeId) || [];
      for (const child of children) {
        if (matchesBase(child) || hasMatchingDescendant(child.id)) {
          return true;
        }
      }
      return false;
    };

    const result = [];
    const traverse = (nodes, depth = 0) => {
      nodes.forEach((node) => {
        const nodeMatches = matchesBase(node);
        const matchBelow = isSearching ? hasMatchingDescendant(node.id) : false;

        if (isSearching && !nodeMatches && !matchBelow) {
          return;
        }

        const children = childrenMap.get(node.id) || [];
        const hasChildren = children.length > 0;
        result.push({
          ...node,
          depth,
          hasChildren,
        });

        if (hasChildren && (visibleExpanded.has(node.id) || (isSearching && matchBelow))) {
          traverse(children, depth + 1);
        }
      });
    };

    traverse(roots, 0);
    return result;
  }, [categories, childrenMap, parentFilter, roots, search, statusFilter, visibleExpanded]);

  const stats = {
    total: categories.length,
    roots: roots.length,
    children: categories.length - roots.length,
    inactive: categories.filter((item) => item.status === 'inactive').length,
  };

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
        <FilterDropdown value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái" selectedDark><option value="all">TẤT CẢ TRẠNG THÁI</option><option value="active">HOẠT ĐỘNG</option><option value="inactive">NGỪNG HOẠT ĐỘNG</option></FilterDropdown>
        <FilterDropdown value={parentFilter} onChange={(event) => setParentFilter(event.target.value)} aria-label="Lọc danh mục cha" selectedDark><option value="all">TẤT CẢ DANH MỤC CHA</option><option value={ROOT_FILTER}>DANH MỤC GỐC</option>{parentFilterOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</FilterDropdown>
        {clearVisible && <button type="button" className="category-clear-button" onClick={clearFilters}>XÓA BỘ LỌC</button>}
      </div>
      <div className="category-table-wrap"><table className="category-table"><thead><tr><th>MÃ</th><th>DANH MỤC</th><th>CẤU TRÚC</th><th>SẢN PHẨM</th><th>ĐƯỜNG DẪN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
        {rows.map((item) => {
          const isRoot = item.depth === 0;
          const parent = categories.find((candidate) => candidate.id === item.parentId);
          const isExpanded = visibleExpanded.has(item.id);
          return <tr
            key={item.id}
            className={`${isRoot ? 'category-root-row' : ''} ${item.hasChildren ? 'category-has-children' : ''}`}
            onClick={(event) => {
              if (!item.hasChildren || event.target.closest?.('.category-actions')) return;
              setExpanded((current) => {
                const next = new Set(current || visibleExpanded);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              });
            }}
          >
            <td>#{item.id}</td>
            <td>
              <div
                className={`category-name-cell ${isRoot ? '' : 'category-name-cell--child'}`}
                style={{ paddingLeft: `${item.depth * 24}px` }}
              >
                <span className="category-name-cell__indent-wrapper">
                  {item.hasChildren ? (
                    <button
                      type="button"
                      className="category-toggle-expand"
                      aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded((current) => {
                          const next = new Set(current || visibleExpanded);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                    >
                      {isExpanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
                    </button>
                  ) : (
                    item.depth > 0 && <span className="category-tree-indent">↳</span>
                  )}
                </span>
                <CategoryImage category={item} />
                <span className="category-name-copy">
                  <strong>{item.name}</strong>
                  {!isRoot && <small>Trực thuộc: {parent?.name || item.parentName || 'GỐC'}</small>}
                </span>
              </div>
            </td>
            <td><StructureBadge isRoot={isRoot} depth={item.depth} /></td>
            <td><strong>{item.productCount}</strong><small>sản phẩm</small></td>
            <td><code>/{item.slug}</code></td>
            <td><StatusBadge status={item.status} /></td>
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
  const childCategories = categories.filter((item) => item.parentId === Number(categoryId));
  const childPagination = useDetailTablePagination(childCategories);
  const productPagination = useDetailTablePagination(detail?.products);
  if (listLoading || detailLoading) return <main className="category-page"><LoadingState /></main>;
  if (listError || detailError) return <main className="category-page"><ErrorState message={listError || detailError} onRetry={retry} /></main>;
  const listCategory = categories.find((item) => item.id === Number(categoryId));
  if (!detail || !listCategory) return <main className="category-page"><div className="category-not-found"><h1>KHÔNG TÌM THẤY DANH MỤC</h1><button onClick={() => navigate('/admin/danh-muc/danh-muc-san-pham')}>QUAY LẠI DANH SÁCH</button></div></main>;
  const category = { ...listCategory, ...detail, productCount: detail.products.length };
  const parent = categories.find((item) => item.id === category.parentId);
  const children = childCategories;
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
    {children.length > 0 && <section className="category-detail-card"><SectionHeader meta={`${children.length} MỤC`}>DANH MỤC CON</SectionHeader><div className="category-detail-table-wrap"><table><thead><tr><th>MÃ</th><th>DANH MỤC</th><th>SỐ SP</th><th>TRẠNG THÁI</th></tr></thead><tbody>{childPagination.visibleItems.map((child) => <tr key={child.id}><td>#{child.id}</td><td><button onClick={() => navigate(`/admin/danh-muc/danh-muc-san-pham/${child.id}`)}>{child.name}</button></td><td>{child.productCount}</td><td><StatusBadge status={child.status} /></td></tr>)}</tbody></table></div><DetailTablePagination totalItems={children.length} currentPage={childPagination.currentPage} onPageChange={childPagination.onPageChange} idPrefix="category-children" /></section>}
    <section className="category-detail-card"><SectionHeader meta={`${products.length} SẢN PHẨM`}>SẢN PHẨM THUỘC DANH MỤC</SectionHeader>{products.length ? <><div className="category-detail-table-wrap"><table><thead><tr><th>MÃ SẢN PHẨM</th><th>TÊN SẢN PHẨM</th><th>THƯƠNG HIỆU</th><th>TRẠNG THÁI</th></tr></thead><tbody>{productPagination.visibleItems.map((product) => <tr key={product.id}><td>{product.maSanPham}</td><td>{product.tenSanPham}</td><td>—</td><td><StatusBadge status={product.trangThai} /></td></tr>)}</tbody></table></div><DetailTablePagination totalItems={products.length} currentPage={productPagination.currentPage} onPageChange={productPagination.onPageChange} idPrefix="category-products" /></> : <div className="category-products-empty"><strong>Chưa có sản phẩm thuộc danh mục này.</strong><span>Backend chưa trả về sản phẩm nào được gán trực tiếp cho danh mục.</span></div>}</section>
    <CategoryModals key={`${modal?.type || 'none'}-${modal?.id || 'new'}`} modal={modal} setModal={setModal} categories={categories} reload={reloadAll} />
  </main>;
}
