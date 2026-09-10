import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiCheck, HiOutlinePlus, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import FormCard from '../components/FormCard';
import PriceInput from '../components/PriceInput';
import { getMockProducts } from '../data/mockProducts';
import { addMockCombo } from '../data/mockCombos';
import fallbackImage from '../assets/hero.png';
import './ComboSanPham.css';

const categories = ['PC Build', 'VGA', 'CPU', 'RAM', 'SSD', 'Mainboard', 'Tản nhiệt', 'PSU', 'Case', 'Phụ kiện', 'NAS/Lưu trữ', 'Màn hình'];
const brands = ['Custom Build', 'ASUS', 'MSI', 'Gigabyte', 'AMD', 'Intel', 'Corsair', 'Samsung', 'Lian Li', 'EVGA', 'Logitech', 'Synology', 'Razer'];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const isSingle = (product) => !String(product.phanLoai || '').includes('Combo');
const isActive = (product) => !String(product.trangThaiBan || '').trim().startsWith('Ng');

function fieldClass(error, extra = '') { return `combo-form-input ${error ? 'has-error' : ''} ${extra}`.trim(); }

function ComboImageUploader({ images, onChange }) {
  const inputRef = useRef(null);
  const addFiles = (files) => {
    const added = Array.from(files).filter((file) => file.type.startsWith('image/')).map((file, index) => ({ id: `${Date.now()}-${index}`, url: URL.createObjectURL(file), file }));
    onChange([...images, ...added]);
  };
  const remove = (id) => onChange(images.filter((image) => image.id !== id));
  const makeMain = (id) => onChange([...images].sort((a, b) => a.id === id ? -1 : b.id === id ? 1 : 0));
  return <div className="combo-images">
    {images.map((image, index) => <div className={`combo-image-item ${index === 0 ? 'main' : ''}`} key={image.id}>
      <div className="combo-image-box">{index === 0 && <span className="main-badge">ẢNH CHÍNH</span>}<img src={image.url} alt={`Ảnh combo ${index + 1}`} /><button type="button" className="image-remove" onClick={() => remove(image.id)} aria-label="Xóa ảnh">×</button></div>
      {index > 0 && <button type="button" className="make-main" onClick={() => makeMain(image.id)}>Chính</button>}
    </div>)}
    <button type="button" className="combo-image-add" onClick={() => inputRef.current?.click()}><HiOutlinePlus /><span>Thêm ảnh</span></button>
    <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
  </div>;
}

export default function ThemComboSanPham() {
  const navigate = useNavigate();
  const products = useMemo(() => getMockProducts().filter(isSingle), []);
  const [form, setForm] = useState({ name: '', code: '', description: '', category: '', brand: '', variantName: 'Mặc định', sku: '', retail: '', cost: '', weight: '', variantActive: true, active: true, vat: false, vatRate: '10' });
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [specDraft, setSpecDraft] = useState({ name: '', value: '' });
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [components, setComponents] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [tagError, setTagError] = useState('');
  const [success, setSuccess] = useState(false);
  const update = (key, value) => { setForm((prev) => ({ ...prev, [key]: value })); setErrors((prev) => ({ ...prev, [key]: '' })); };

  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return products.filter((product) => !components.some((item) => item.id === product.id) && (!query || [product.tenSanPham, product.maSanPham, product.variants?.[0]?.sku].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query)))).slice(0, 7);
  }, [products, search, components]);

  const addComponent = (product) => {
    if (!isActive(product) || Number(product.coTheBan ?? product.tonKho ?? 0) <= 0) return;
    const variant = product.variants?.[0] || {};
    setComponents((prev) => [...prev, { id: product.id, image: product.hinhAnh || fallbackImage, name: product.tenSanPham, variant: variant.name || 'Mặc định', productCode: product.maSanPham, sku: variant.sku || product.maSanPham, price: Number(variant.giaBanLe || product.giaBanLe || 0), stock: Number(product.coTheBan ?? product.tonKho ?? 0), qty: 1 }]);
    setSearch(''); setSearchOpen(false); setErrors((prev) => ({ ...prev, components: '' }));
  };
  const updateQty = (id, value) => setComponents((prev) => prev.map((item) => item.id === id ? { ...item, qty: Math.max(1, Number(value) || 1) } : item));
  const capacities = components.map((item) => Math.floor(item.stock / item.qty));
  const bottleneck = capacities.length ? Math.min(...capacities) : 0;

  const addSpec = () => {
    if (!specDraft.name.trim() || !specDraft.value.trim()) return;
    setSpecs((prev) => [...prev, { id: Date.now(), name: specDraft.name.trim(), value: specDraft.value.trim() }]); setSpecDraft({ name: '', value: '' });
  };
  const addTag = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault(); const next = tagInput.trim().replace(/^#/, ''); if (!next) return;
    if (tags.some((tag) => tag.toLocaleLowerCase('vi') === next.toLocaleLowerCase('vi'))) { setTagError('Tag này đã tồn tại.'); return; }
    setTags((prev) => [...prev, next]); setTagInput(''); setTagError('');
  };

  const submit = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập tên combo.';
    if (!form.code.trim()) next.code = 'Vui lòng nhập mã combo.';
    if (!form.category) next.category = 'Vui lòng chọn danh mục.';
    if (!components.length) next.components = 'Vui lòng chọn ít nhất một thành phần.';
    if (!form.variantName.trim()) next.variantName = 'Vui lòng nhập tên phiên bản.';
    if (!form.retail || Number(form.retail) <= 0) next.retail = 'Giá bán lẻ phải lớn hơn 0.';
    if (!form.cost || Number(form.cost) <= 0) next.cost = 'Giá nhập phải lớn hơn 0.';
    if (!form.weight || Number(form.weight) <= 0) next.weight = 'Khối lượng phải lớn hơn 0.';
    if (form.vat && (Number(form.vatRate) < 0 || Number(form.vatRate) > 100)) next.vatRate = 'Thuế VAT phải từ 0 đến 100.';
    const duplicate = tags.some((tag, index) => tags.findIndex((item) => item.toLocaleLowerCase('vi') === tag.toLocaleLowerCase('vi')) !== index);
    if (duplicate) next.tags = 'Danh sách có tag trùng lặp.';
    if (components.some((item) => item.qty > item.stock)) next.components = 'Số lượng/combo không được vượt tồn có thể bán.';
    setErrors(next);
    if (Object.keys(next).length) { document.querySelector('.has-error, .component-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    addMockCombo({ id: `combo-${Date.now()}`, code: form.code.trim(), name: form.name.trim(), image: images[0]?.url || fallbackImage, images: images.map((item) => item.url), sellable: bottleneck, stock: bottleneck, price: Number(form.retail) * 1000, status: form.active ? 'Đang kinh doanh' : 'Ngưng kinh doanh', category: form.category, brand: form.brand, tags, vat: form.vat ? Number(form.vatRate) : 0, description: form.description, specs, variant: { name: form.variantName, sku: form.sku, retail: Number(form.retail) * 1000, cost: Number(form.cost) * 1000, weight: Number(form.weight), active: form.variantActive }, components: components.map((item) => ({ ...item })) });
    setSuccess(true); window.setTimeout(() => navigate('/kho-hang/combo-san-pham'), 1400);
  };

  return <main className="combo-create-page">
    <div className="combo-page-heading"><div><div className="combo-secondary-breadcrumb"><span>Sản phẩm</span><b>›</b><span>Quản lý kho</span><b>›</b><span>Combo sản phẩm</span><b>›</b><strong>Thêm mới</strong></div><h1>THÊM COMBO SẢN PHẨM</h1></div><div className="heading-actions"><button className="combo-outline-btn" onClick={() => navigate('/kho-hang/combo-san-pham')}>HỦY</button><button className="combo-primary-btn" onClick={submit}>LƯU COMBO</button></div></div>
    <div className="combo-create-grid"><div className="combo-create-main">
      <FormCard title="Thông tin chung"><div className="combo-field"><label>TÊN COMBO <i>*</i></label><input id="combo-name" className={fieldClass(errors.name)} value={form.name} onChange={(e) => update('name', e.target.value)} />{errors.name && <small>{errors.name}</small>}</div><div className="combo-two-cols"><div className="combo-field"><label>MÃ COMBO (SKU) <i>*</i></label><input id="combo-code" className={fieldClass(errors.code)} value={form.code} placeholder="VD: PC-001" onChange={(e) => update('code', e.target.value)} />{errors.code && <small>{errors.code}</small>}</div><div className="combo-field"><label>LOẠI SẢN PHẨM</label><input className="combo-form-input readonly" readOnly tabIndex="-1" value="Bộ PC / Combo" /></div></div></FormCard>
      <FormCard title="Ảnh combo sản phẩm"><p className="combo-help">Tải lên nhiều hình ảnh. Ảnh đầu tiên tự động là ảnh chính.</p><ComboImageUploader images={images} onChange={setImages} /></FormCard>
      <FormCard title="Chi tiết sản phẩm"><div className="combo-field"><label>MÔ TẢ SẢN PHẨM</label><textarea value={form.description} onChange={(e) => update('description', e.target.value)} /></div><div className="combo-field"><label>THÔNG SỐ KỸ THUẬT</label>{specs.length > 0 && <table className="combo-spec-table"><thead><tr><th>TÊN THÔNG SỐ</th><th>GIÁ TRỊ</th><th /></tr></thead><tbody>{specs.map((spec) => <tr key={spec.id}><td>{spec.name}</td><td>{spec.value}</td><td><button onClick={() => setSpecs((prev) => prev.filter((item) => item.id !== spec.id))}><HiOutlineX /></button></td></tr>)}</tbody></table>}<div className="combo-spec-add"><input className="combo-form-input" placeholder="Tên thông số" value={specDraft.name} onChange={(e) => setSpecDraft((prev) => ({ ...prev, name: e.target.value }))} /><input className="combo-form-input" placeholder="Giá trị" value={specDraft.value} onChange={(e) => setSpecDraft((prev) => ({ ...prev, value: e.target.value }))} /><button type="button" onClick={addSpec}>THÊM</button></div></div></FormCard>
      <FormCard title="Thành phần combo"><p className="combo-help">Chọn các phiên bản sản phẩm được sử dụng để cấu thành Combo.</p><div className="component-search"><HiOutlineSearch /><input value={search} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Tìm sản phẩm / SKU / phiên bản..." />{searchOpen && <div className="component-results">{searchResults.map((product) => { const available = isActive(product) && Number(product.coTheBan ?? product.tonKho ?? 0) > 0; const variant = product.variants?.[0] || {}; return <div className={`component-result ${available ? '' : 'disabled'}`} key={product.id}><img src={product.hinhAnh || fallbackImage} alt="" /><div className="result-info"><div><b>{product.tenSanPham}</b>{!isActive(product) && <span className="stopped-badge">NGỪNG KD</span>}</div><small>{variant.name || 'Mặc định'} · Mã SP: {product.maSanPham} · SKU: {variant.sku || product.maSanPham}</small></div><div className="result-stock"><b>{money(variant.giaBanLe || product.giaBanLe)}</b><span className={available ? '' : 'out'}>Còn {product.coTheBan ?? product.tonKho ?? 0}</span></div><button type="button" disabled={!available} onMouseDown={(e) => { e.preventDefault(); addComponent(product); }}>CHỌN</button></div>; })}{searchResults.length === 0 && <div className="no-results">Không tìm thấy sản phẩm.</div>}</div>}</div>
        {errors.components && <small className="component-error">{errors.components}</small>}
        {!components.length ? <div className="component-empty">Chưa có thành phần nào được chọn.</div> : <div className="selected-components"><table><thead><tr><th>ẢNH</th><th>SẢN PHẨM</th><th>PHIÊN BẢN</th><th>MÃ SẢN PHẨM</th><th>SKU/MÃ VẠCH</th><th>GIÁ BÁN</th><th>TỒN CÓ THỂ BÁN</th><th>SỐ LƯỢNG/COMBO</th><th>SỐ COMBO CÓ THỂ TẠO</th><th /></tr></thead><tbody>{components.map((item) => { const capacity = Math.floor(item.stock / item.qty); return <tr key={item.id}><td><img src={item.image} alt="" /></td><td><b>{item.name}</b></td><td>{item.variant}</td><td><code>{item.productCode}</code></td><td><code>{item.sku}</code></td><td><b>{money(item.price)}</b></td><td className="stock-green">{item.stock}</td><td><div className={`qty-stepper ${item.qty > item.stock ? 'invalid' : ''}`}><button onClick={() => updateQty(item.id, item.qty - 1)}>−</button><input value={item.qty} onChange={(e) => updateQty(item.id, e.target.value.replace(/\D/g, ''))} /><button onClick={() => updateQty(item.id, item.qty + 1)}>+</button></div></td><td className={capacity === bottleneck ? 'capacity-bottleneck' : 'capacity'}>{capacity}{capacity === bottleneck && <small>BOTTLENECK</small>}</td><td><button className="remove-component" onClick={() => setComponents((prev) => prev.filter((component) => component.id !== item.id))}>XÓA</button></td></tr>; })}</tbody></table></div>}
      </FormCard>
      <FormCard title="Phiên bản combo - Giá & khối lượng"><div className="variant-tab"><b>PHIÊN BẢN</b><span>Mặc định</span><small>Tương ứng với PHIEN_BAN_SAN_PHAM của Combo</small></div><div className="variant-fields"><div className="combo-field"><label>TÊN PHIÊN BẢN <i>*</i></label><input className={fieldClass(errors.variantName)} value={form.variantName} onChange={(e) => update('variantName', e.target.value)} />{errors.variantName && <small>{errors.variantName}</small>}</div><div className="combo-field"><label>MÃ VẠCH/SKU</label><input className="combo-form-input" value={form.sku} onChange={(e) => update('sku', e.target.value)} /></div><div className="combo-field"><label>GIÁ BÁN LẺ <i>*</i></label><div className="unit-input"><PriceInput className={fieldClass(errors.retail)} value={form.retail} onChange={(value) => update('retail', value)} /><span>đ</span></div>{errors.retail && <small>{errors.retail}</small>}</div><div className="combo-field"><label>GIÁ NHẬP <i>*</i></label><div className="unit-input"><PriceInput className={fieldClass(errors.cost)} value={form.cost} onChange={(value) => update('cost', value)} /><span>đ</span></div>{errors.cost && <small>{errors.cost}</small>}</div><div className="combo-field"><label>KHỐI LƯỢNG <i>*</i></label><div className="unit-input"><input className={fieldClass(errors.weight)} value={form.weight} onChange={(e) => update('weight', e.target.value.replace(/[^0-9.]/g, ''))} /><span>kg</span></div>{errors.weight && <small>{errors.weight}</small>}</div><label className="combo-check variant-check"><input type="checkbox" checked={form.variantActive} onChange={(e) => update('variantActive', e.target.checked)} /> Đang kinh doanh</label></div></FormCard>
    </div><aside className="combo-create-side"><FormCard title="Phân loại & cấu hình"><div className="combo-field"><label>DANH MỤC <i>*</i></label><select className={fieldClass(errors.category)} value={form.category} onChange={(e) => update('category', e.target.value)}><option value="">— Chọn —</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>{errors.category && <small>{errors.category}</small>}</div><div className="combo-field"><label>THƯƠNG HIỆU</label><select className="combo-form-input" value={form.brand} onChange={(e) => update('brand', e.target.value)}><option value="">— Chọn —</option>{brands.map((item) => <option key={item}>{item}</option>)}</select></div><div className="combo-field"><label>LOẠI SẢN PHẨM</label><input className="combo-form-input readonly" readOnly tabIndex="-1" value="Bộ PC / Combo" /></div><div className="combo-field"><label>TAGS</label><input className={fieldClass(tagError || errors.tags)} value={tagInput} placeholder="Nhập tag + Enter" onChange={(e) => { setTagInput(e.target.value); setTagError(''); }} onKeyDown={addTag} />{(tagError || errors.tags) && <small>{tagError || errors.tags}</small>}<div className="tag-list">{tags.map((tag) => <span key={tag}>#{tag} <button onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}>×</button></span>)}</div></div><hr /><label className="combo-check"><input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} /> ĐANG KINH DOANH</label><label className="combo-check"><input type="checkbox" checked={form.vat} onChange={(e) => update('vat', e.target.checked)} /> ÁP DỤNG THUẾ VAT</label>{form.vat && <div className="combo-field vat-field"><label>THUẾ VAT (%)</label><input type="number" min="0" max="100" className={fieldClass(errors.vatRate)} value={form.vatRate} onChange={(e) => update('vatRate', e.target.value)} />{errors.vatRate && <small>{errors.vatRate}</small>}</div>}</FormCard></aside></div>
    {success && <div className="combo-success-overlay"><section role="dialog" aria-modal="true"><header><HiCheck /><h2>THÊM COMBO THÀNH CÔNG</h2></header><div><b>{form.name}</b><p>Mã combo {form.code} đã được thêm vào danh sách.</p></div><button onClick={() => navigate('/kho-hang/combo-san-pham')}>VỀ DANH SÁCH</button></section></div>}
  </main>;
}
