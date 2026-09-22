import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineX } from 'react-icons/hi';
import FilterDropdown from '../components/FilterDropdown';
import ImageUploader from '../components/ImageUploader';
import TablePagination from '../components/TablePagination';
import {
  createBrand,
  deactivateBrand,
  getAllBrands,
  getBrandDetail,
  reactivateBrand,
  updateBrand,
  uploadBrandLogo,
} from '../services/brandApi';
import './ThuongHieu.css';

const STATUS_OPTIONS = ['TẤT CẢ TRẠNG THÁI', 'HOẠT ĐỘNG', 'NGỪNG HOẠT ĐỘNG'];
const PAGE_SIZE = 8;
const messageOf = (error) => error?.message || 'Không thể kết nối tới backend. Vui lòng thử lại.';

function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'TH';
  return (words.length === 1 ? words[0].slice(0, 3) : words.map((word) => word[0]).join('').slice(0, 3)).toUpperCase();
}

function BrandLogo({ brand, large = false }) {
  const [broken, setBroken] = useState(false);
  return <div className={`brand-logo ${large ? 'brand-logo--large' : ''}`}>
    {brand.logo && !broken ? <img src={brand.logo} alt={`Logo ${brand.name}`} onError={() => setBroken(true)} /> : <span>{initials(brand.name)}</span>}
  </div>;
}

function StatusBadge({ status }) {
  return <span className={`brand-status brand-status--${status}`}>{status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</span>;
}

function NetworkState({ error, onRetry }) {
  if (error) return <div className="brand-network brand-network--error" role="alert"><strong>KHÔNG THỂ TẢI DỮ LIỆU</strong><span>{error}</span><button type="button" onClick={onRetry}>THỬ LẠI</button></div>;
  return <div className="brand-network" role="status"><span className="brand-spinner" />Đang tải dữ liệu thương hiệu...</div>;
}

function BrandFormModal({ brand, brands, saving, serverError, onClose, onSave }) {
  const [form, setForm] = useState(() => ({ name: brand?.name || '', logo: brand?.logo || '', status: brand?.status || 'active' }));
  const [mode, setMode] = useState('url');
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: '' })); };
  const submit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const next = {};
    if (!name) next.name = 'Vui lòng nhập tên thương hiệu.';
    else if (name.length < 2) next.name = 'Tên thương hiệu phải có ít nhất 2 ký tự.';
    else if (brands.some((item) => item.id !== brand?.id && item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) next.name = 'Tên thương hiệu đã tồn tại.';
    if (mode === 'url' && form.logo.trim()) {
      try {
        const parsed = new URL(form.logo.trim());
        if (!['http:', 'https:'].includes(parsed.protocol) || !/\.(jpe?g|png|webp)$/i.test(parsed.pathname)) throw new Error('invalid');
      } catch { next.logo = 'Logo phải là URL HTTP/HTTPS của ảnh JPG, PNG hoặc WEBP.'; }
    }
    if (mode === 'upload' && !images[0]?.file) next.logo = 'Vui lòng chọn một ảnh để tải lên.';
    if (Object.keys(next).length) { setErrors(next); return; }
    onSave({ name, logo: mode === 'url' ? form.logo.trim() : '', status: form.status, file: mode === 'upload' ? images[0].file : null });
  };
  return <div className="brand-modal-backdrop" onMouseDown={(event) => !saving && event.target === event.currentTarget && onClose()}>
    <section className="brand-modal" role="dialog" aria-modal="true" aria-labelledby="brand-form-title">
      <header className="brand-modal__header brand-modal__header--black"><h2 id="brand-form-title">{brand ? 'SỬA THƯƠNG HIỆU' : 'THÊM THƯƠNG HIỆU'}</h2><button type="button" onClick={onClose} disabled={saving} aria-label="Đóng"><HiOutlineX size={24} /></button></header>
      <form onSubmit={submit} noValidate>
        <div className="brand-modal__body">
          {serverError && <div className="brand-inline-error" role="alert">{serverError}</div>}
          <label className="brand-field"><span>TÊN THƯƠNG HIỆU <b>*</b></span><input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ví dụ: ASUS" />{errors.name && <small>{errors.name}</small>}</label>
          <fieldset className="brand-image-field"><legend>LOGO / ẢNH THƯƠNG HIỆU</legend><div className="brand-mode-tabs"><button type="button" className={mode === 'upload' ? 'is-active' : ''} onClick={() => { setMode('upload'); setErrors({}); }}>TẢI ẢNH LÊN</button><button type="button" className={mode === 'url' ? 'is-active' : ''} onClick={() => { setMode('url'); setErrors({}); }}>NHẬP URL</button></div>
            {mode === 'upload' ? <ImageUploader images={images} onImagesChange={(next) => setImages(next.slice(-1))} maxSizeMB={5} /> : <><input className="brand-url-input" value={form.logo} onChange={(event) => update('logo', event.target.value)} placeholder="URL logo (JPG, PNG, WEBP)..." />{form.logo && <div className="brand-logo-preview"><img src={form.logo} alt="Xem trước logo" /></div>}</>}
            {errors.logo && <small className="brand-field-error">{errors.logo}</small>}
          </fieldset>
          <fieldset className="brand-status-field"><legend>TRẠNG THÁI</legend><div><button type="button" className={form.status === 'active' ? 'is-active' : ''} onClick={() => update('status', 'active')}>HOẠT ĐỘNG</button><button type="button" className={form.status === 'inactive' ? 'is-active' : ''} onClick={() => update('status', 'inactive')}>NGỪNG HOẠT ĐỘNG</button></div></fieldset>
        </div>
        <footer className="brand-modal__footer"><button type="button" onClick={onClose} disabled={saving}>HỦY</button><button type="submit" disabled={saving}>{saving ? 'ĐANG LƯU...' : brand ? 'LƯU THAY ĐỔI' : 'THÊM THƯƠNG HIỆU'}</button></footer>
      </form>
    </section>
  </div>;
}

function DeactivateModal({ brand, saving, serverError, onClose, onConfirm }) {
  return <div className="brand-modal-backdrop" onMouseDown={(event) => !saving && event.target === event.currentTarget && onClose()}>
    <section className="brand-modal brand-modal--confirm" role="dialog" aria-modal="true" aria-labelledby="brand-deactivate-title">
      <header className="brand-modal__header"><h2 id="brand-deactivate-title">NGỪNG HOẠT ĐỘNG THƯƠNG HIỆU?</h2></header>
      <div className="brand-modal__body">
        <div className="brand-confirm-title"><BrandLogo brand={brand} /><strong>{brand.name}</strong></div>
        <dl className="brand-confirm-info"><dt>SỐ SẢN PHẨM</dt><dd>{brand.productCount} SP</dd><dt>TRẠNG THÁI</dt><dd>HOẠT ĐỘNG</dd></dl>
        <div className="brand-warning">Thương hiệu ngừng hoạt động sẽ không còn hiển thị trong bộ lọc thương hiệu ở giao diện khách hàng.</div>
        {serverError && <div className="brand-blocked" role="alert"><strong>KHÔNG THỂ XÓA THƯƠNG HIỆU</strong><p>Thương hiệu đang có sản phẩm liên kết.</p><p>Vui lòng chuyển thương hiệu sang ngừng hoạt động hoặc gỡ thương hiệu khỏi các sản phẩm liên quan.</p><small>{serverError}</small></div>}
      </div>
      <footer className="brand-modal__footer"><button type="button" onClick={onClose} disabled={saving}>HỦY</button><button type="button" className="brand-danger-button" onClick={onConfirm} disabled={saving}>{saving ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN NGỪNG HOẠT ĐỘNG'}</button></footer>
    </section>
  </div>;
}

function useBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setBrands(await getAllBrands()); }
    catch (requestError) { setError(messageOf(requestError)); }
    finally { setLoading(false); }
  }, []);
  // The effect starts the initial remote request; state changes happen when it settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { reload(); }, [reload]);
  return { brands, loading, error, reload };
}

function BrandModals({ modal, setModal, brands, reload, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  if (!modal) return null;
  const close = () => setModal(null);
  if (modal.type === 'form') {
    const editing = brands.find((item) => item.id === modal.id);
    const save = async (payload) => {
      setSaving(true); setServerError('');
      try {
        const logo = payload.file ? await uploadBrandLogo(payload.file) : payload.logo;
        if (editing) await updateBrand(editing.id, { ...payload, logo });
        else await createBrand({ ...payload, logo });
        await reload(); await onChanged?.(); close();
      } catch (error) { setServerError(messageOf(error)); }
      finally { setSaving(false); }
    };
    return <BrandFormModal brand={editing} brands={brands} saving={saving} serverError={serverError} onClose={close} onSave={save} />;
  }
  const brand = brands.find((item) => item.id === modal.id) || modal.brand;
  if (!brand) return null;
  const confirm = async () => {
    setSaving(true); setServerError('');
    try { await deactivateBrand(brand.id); await reload(); await onChanged?.(); close(); }
    catch (error) { setServerError(messageOf(error)); }
    finally { setSaving(false); }
  };
  return <DeactivateModal brand={brand} saving={saving} serverError={serverError} onClose={close} onConfirm={confirm} />;
}

export default function ThuongHieu() {
  const navigate = useNavigate();
  const { brands, loading, error, reload } = useBrands();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [restoringId, setRestoringId] = useState(null);
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return brands.filter((brand) => (!query || brand.name.toLocaleLowerCase('vi').includes(query) || `/${brand.slug}`.includes(query))
      && (status === STATUS_OPTIONS[0] || (status === STATUS_OPTIONS[1] ? brand.status === 'active' : brand.status === 'inactive')));
  }, [brands, search, status]);
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const stats = { total: brands.length, active: brands.filter((item) => item.status === 'active').length, inactive: brands.filter((item) => item.status === 'inactive').length, products: brands.reduce((sum, item) => sum + item.productCount, 0) };
  const restore = async (brand) => {
    setRestoringId(brand.id); setActionError('');
    try { await reactivateBrand(brand); await reload(); }
    catch (requestError) { setActionError(messageOf(requestError)); }
    finally { setRestoringId(null); }
  };
  return <main className="brand-page">
    <div className="brand-heading"><div><h1>THƯƠNG HIỆU</h1><p>Quản lý nhãn hàng và hãng sản xuất của sản phẩm</p></div><button type="button" className="brand-primary-button" disabled={loading || Boolean(error)} onClick={() => setModal({ type: 'form' })}>+ THÊM THƯƠNG HIỆU</button></div>
    {loading || error ? <NetworkState error={error} onRetry={reload} /> : <>
      {actionError && <div className="brand-inline-error brand-page-error" role="alert">{actionError}<button type="button" onClick={() => setActionError('')}>×</button></div>}
      <section className="brand-stats"><div><strong>{stats.total}</strong><span>TỔNG THƯƠNG HIỆU</span></div><div><strong>{stats.active}</strong><span>HOẠT ĐỘNG</span></div><div><strong className="is-red">{stats.inactive}</strong><span>NGỪNG HOẠT ĐỘNG</span></div><div><strong>{stats.products}</strong><span>TỔNG SẢN PHẨM</span></div></section>
      <div className="brand-toolbar"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm tên thương hiệu / đường dẫn..." aria-label="Tìm thương hiệu" /><FilterDropdown options={STATUS_OPTIONS} defaultValue={STATUS_OPTIONS[0]} value={status} onSelect={(value) => { setStatus(value); setPage(1); }} id="brand-status-filter" />{(search.trim() || status !== STATUS_OPTIONS[0]) && <button type="button" className="brand-clear-button" onClick={() => { setSearch(''); setStatus(STATUS_OPTIONS[0]); setPage(1); }}>XÓA BỘ LỌC</button>}</div>
      <div className="brand-table-wrap"><table className="brand-table"><thead><tr><th>THƯƠNG HIỆU</th><th>MÃ</th><th>SỐ SẢN PHẨM</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{visibleRows.map((brand) => <tr key={brand.id}><td><div className="brand-name-cell"><BrandLogo brand={brand} /><span><strong>{brand.name}</strong><small>/{brand.slug}</small></span></div></td><td>#{brand.id}</td><td><strong>{brand.productCount}</strong><small>SẢN PHẨM</small></td><td><StatusBadge status={brand.status} /></td><td><div className="brand-actions"><button type="button" onClick={() => navigate(`/admin/danh-muc/thuong-hieu/${brand.id}`)}>CHI TIẾT</button><button type="button" onClick={() => setModal({ type: 'form', id: brand.id })}>SỬA</button>{brand.status === 'active' ? <button type="button" className="is-danger" onClick={() => setModal({ type: 'deactivate', id: brand.id })}>NGỪNG</button> : <button type="button" className="is-success" disabled={restoringId === brand.id} onClick={() => restore(brand)}>{restoringId === brand.id ? 'ĐANG KHÔI PHỤC...' : 'KHÔI PHỤC'}</button>}</div></td></tr>)}{!rows.length && <tr><td colSpan="5" className="brand-empty">{brands.length ? 'Không tìm thấy thương hiệu phù hợp.' : 'Chưa có thương hiệu nào.'}</td></tr>}</tbody></table></div>
      <TablePagination totalItems={rows.length} pageSize={PAGE_SIZE} currentPage={page} onPageChange={setPage} idPrefix="brand" />
      <BrandModals key={`${modal?.type || 'none'}-${modal?.id || 'new'}`} modal={modal} setModal={setModal} brands={brands} reload={reload} />
    </>}
  </main>;
}

export function ChiTietThuongHieu() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { brands, loading: listLoading, error: listError, reload } = useBrands();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const loadDetail = useCallback(async () => { setLoading(true); setError(''); try { setDetail(await getBrandDetail(brandId)); } catch (requestError) { setError(messageOf(requestError)); } finally { setLoading(false); } }, [brandId]);
  // The effect loads the route-specific backend record when the id changes.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { loadDetail(); }, [loadDetail]);
  const restore = async () => { setRestoring(true); setActionError(''); try { await reactivateBrand(detail); await reload(); await loadDetail(); } catch (requestError) { setActionError(messageOf(requestError)); } finally { setRestoring(false); } };
  if (loading || listLoading) return <main className="brand-page"><NetworkState /></main>;
  if (error || listError || !detail) return <main className="brand-page"><NetworkState error={error || listError || 'Không tìm thấy thương hiệu.'} onRetry={() => { reload(); loadDetail(); }} /></main>;
  const current = brands.find((item) => item.id === detail.id) || { ...detail, productCount: detail.products.length };
  const price = (value) => value == null ? '—' : `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
  return <main className="brand-page brand-detail-page">
    <button type="button" className="brand-back" onClick={() => navigate('/admin/danh-muc/thuong-hieu')}>← QUAY LẠI DANH SÁCH</button>
    {actionError && <div className="brand-inline-error brand-page-error">{actionError}</div>}
    <section className="brand-detail-hero"><BrandLogo brand={detail} large /><div className="brand-detail-title"><h1>{detail.name}</h1><code>/{detail.slug}</code><small>MÃ #{detail.id}</small></div><div className="brand-detail-actions"><StatusBadge status={detail.status} /><div><button type="button" onClick={() => setModal({ type: 'form', id: detail.id })}>CHỈNH SỬA</button>{detail.status === 'active' ? <button type="button" className="is-danger" onClick={() => setModal({ type: 'deactivate', id: detail.id, brand: current })}>NGỪNG HOẠT ĐỘNG</button> : <button type="button" className="is-success" disabled={restoring} onClick={restore}>{restoring ? 'ĐANG KHÔI PHỤC...' : 'KHÔI PHỤC'}</button>}</div></div></section>
    <section className="brand-detail-stats"><div><strong>#{detail.id}</strong><span>MÃ THƯƠNG HIỆU</span></div><div><strong>{detail.products.length}</strong><span>SỐ SẢN PHẨM</span></div><div><strong>{detail.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</strong><span>TRẠNG THÁI</span></div><div><strong>/{detail.slug}</strong><span>ĐƯỜNG DẪN</span></div></section>
    <section className="brand-section"><header>THÔNG TIN THƯƠNG HIỆU</header><div className="brand-info-grid"><dl><dt>TÊN THƯƠNG HIỆU</dt><dd>{detail.name}</dd><dt>ĐƯỜNG DẪN</dt><dd>/{detail.slug}</dd><dt>TRẠNG THÁI</dt><dd>{detail.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</dd></dl><div><span>LOGO THƯƠNG HIỆU</span><BrandLogo brand={detail} large /></div></div></section>
    <section className="brand-section brand-products"><header><span>SẢN PHẨM THUỘC THƯƠNG HIỆU</span><span>{detail.products.length} SẢN PHẨM</span></header><div className="brand-table-wrap"><table className="brand-table"><thead><tr><th>MÃ SP</th><th>SẢN PHẨM</th><th>DANH MỤC</th><th>GIÁ BÁN</th><th>TỒN KHO</th><th>TRẠNG THÁI</th></tr></thead><tbody>{detail.products.map((product) => <tr key={product.id}><td>{product.code}</td><td><strong>{product.name}</strong></td><td>{product.category}</td><td><strong>{price(product.price)}</strong></td><td>{product.stock}</td><td><StatusBadge status={product.status} /></td></tr>)}{!detail.products.length && <tr><td colSpan="6" className="brand-empty">Thương hiệu chưa có sản phẩm liên kết.</td></tr>}</tbody></table></div></section>
    <BrandModals key={`${modal?.type || 'none'}-${modal?.id || 'new'}`} modal={modal} setModal={setModal} brands={brands} reload={reload} onChanged={loadDetail} />
  </main>;
}
