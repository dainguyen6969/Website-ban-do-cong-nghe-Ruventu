import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineGift, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import mockProducts from '../data/mockProducts';
import './TaoKhuyenMai.css';

const conditions = [
  ['order', 'Chiết khấu theo tổng giá trị đơn hàng'],
  ['product', 'Chiết khấu theo sản phẩm cụ thể'],
  ['category', 'Chiết khấu theo loại sản phẩm (danh mục)'],
  ['brand', 'Chiết khấu theo nhãn hiệu'],
];

function toggle(values, value) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function formatMoney(value) { return Number(String(value).replace(/\D/g, '') || 0).toLocaleString('vi-VN'); }

export default function TaoKhuyenMai() {
  const navigate = useNavigate();
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [status, setStatus] = useState('Đang hoạt động');
  const [unlimited, setUnlimited] = useState(false); const [limit, setLimit] = useState(''); const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState(''); const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('order'); const [discountType, setDiscountType] = useState('percent'); const [discount, setDiscount] = useState(''); const [minimum, setMinimum] = useState(''); const [maximum, setMaximum] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false); const [productSearch, setProductSearch] = useState(''); const [selectedProducts, setSelectedProducts] = useState([]); const [selectedFilters, setSelectedFilters] = useState([]);
  const singleProducts = useMemo(() => mockProducts.filter((product) => product.phanLoai === 'Sản phẩm đơn'), []);
  const categories = useMemo(() => [...new Set(mockProducts.map((product) => product.danhMuc).filter(Boolean))], []);
  const brands = useMemo(() => [...new Set(mockProducts.map((product) => product.thuongHieu).filter(Boolean))], []);
  const visibleProducts = singleProducts.filter((product) => `${product.tenSanPham} ${product.maSanPham}`.toLowerCase().includes(productSearch.toLowerCase()));
  const filterOptions = condition === 'category' ? categories : brands;
  const discountLabel = discountType === 'percent' ? `Giảm ${discount || 0}%` : `Giảm ${formatMoney(discount)}đ`;
  const isExceptional = Boolean(discount);

  const save = () => console.log('LƯU KHUYẾN MẠI', { name, code, status, unlimited, limit, fromDate, toDate, description, condition, discountType, discount, minimum, maximum, selectedProducts, selectedFilters });
  const autoCode = () => setCode(`RV${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  const selectCondition = (next) => { setCondition(next); setSelectedFilters([]); setSelectorOpen(false); };

  return <main className="promotion-page">
    <div className="promotion-topbar"><div className="promotion-topbar__left"><button className="promo-back" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}><HiOutlineArrowLeft /> QUAY LẠI</button><h1>TẠO CHƯƠNG TRÌNH KHUYẾN MẠI</h1></div><div className="promotion-topbar__right"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Đang hoạt động</option><option>Tạm dừng</option><option>Lên lịch</option></select><button className="promo-save" onClick={save}><SaveIcon /> LƯU KHUYẾN MẠI</button></div></div>
    <div className="promotion-layout">
      <section className="promotion-info"><PromoHeading>Thông tin chương trình</PromoHeading>
        <Field label="Tên chương trình" required><input value={name} onChange={(event) => setName(event.target.value)} placeholder="VD: Tặng quà dịp Tết 2025" /></Field>
        <Field label="Mã chương trình" required><div className="promo-inline"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="VD: RUVENTU10" /><button className="promo-secondary" onClick={autoCode}>TỰ SINH</button></div><small>Chỉ chứa chữ in hoa và số. Khách dùng mã này khi thanh toán.</small></Field>
        <Field label="Số lượng áp dụng" required><div className="promo-inline"><input disabled={unlimited} value={limit} onChange={(event) => setLimit(event.target.value.replace(/\D/g, ''))} placeholder="VD: 500" /><label className="promo-checkbox-label"><input type="checkbox" checked={unlimited} onChange={(event) => { setUnlimited(event.target.checked); if (event.target.checked) setLimit(''); }} />Không giới hạn</label></div></Field>
        <Field label="Thời gian áp dụng" required><div className="promo-date-row"><label>Từ ngày<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><span>→</span><label>Đến ngày<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></div></Field>
        <Field label="Mô tả"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả ngắn về chương trình khuyến mại, điều kiện áp dụng..." /></Field>
      </section>
      <section className="promotion-main"><PromoHeading>Hình thức khuyến mại</PromoHeading><div className="promo-segment promo-segment--type"><button className="is-selected">$ &nbsp; CHIẾT KHẤU</button><button disabled><HiOutlineGift /> TẶNG SẢN PHẨM</button></div>
        <PromoHeading className="promo-section-heading">Điều kiện áp dụng chiết khấu</PromoHeading><Field label="Áp dụng chiết khấu theo" required><div className="promo-condition-grid">{conditions.map(([id, label]) => <button key={id} className={`promo-condition ${condition === id ? 'is-selected' : ''}`} onClick={() => selectCondition(id)}><i />{label}</button>)}</div></Field>
        {condition === 'product' && <ProductSelector open={selectorOpen} setOpen={setSelectorOpen} search={productSearch} setSearch={setProductSearch} products={visibleProducts} selected={selectedProducts} setSelected={setSelectedProducts} />}
        {(condition === 'category' || condition === 'brand') && <Field label={condition === 'category' ? 'Danh mục áp dụng' : 'Nhãn hiệu áp dụng'} required><div className="promo-filter-pills">{filterOptions.map((option) => <button className={selectedFilters.includes(option) ? 'is-selected' : ''} onClick={() => setSelectedFilters((current) => toggle(current, option))} key={option}>{option}</button>)}</div></Field>}
        <div className="promo-main-divider" />
        <PromoHeading>Giá trị chiết khấu</PromoHeading><div className="promo-value-grid"><Field label="Loại chiết khấu" required><div className="promo-segment"><button className={discountType === 'percent' ? 'is-selected' : ''} onClick={() => setDiscountType('percent')}>Phần trăm (%)</button><button className={discountType === 'fixed' ? 'is-selected' : ''} onClick={() => setDiscountType('fixed')}>Số tiền cố định</button></div></Field><Field label={discountType === 'percent' ? 'Mức chiết khấu (%)' : 'Số tiền giảm (Đ)'} required><UnitInput value={discount} setValue={setDiscount} unit={discountType === 'percent' ? '%' : 'đ'} exceptional={isExceptional} /></Field><Field label="Giá trị đơn hàng tối thiểu" className={discountType === 'fixed' ? 'promo-field--wide' : ''}><UnitInput value={minimum} setValue={setMinimum} unit="đ" placeholder="0" /></Field>{discountType === 'percent' && <Field label="Giảm tối đa (Đ)"><UnitInput value={maximum} setValue={setMaximum} unit="đ" placeholder="Không giới hạn" /></Field>}</div>
        {discount && <div className="promo-preview"><div>$</div><p><strong>{name || 'Tên chương trình'} <em>— {discountLabel}</em></strong><small>Mã: {code || '—'}</small></p></div>}
      </section>
    </div>
  </main>;
}
function PromoHeading({ children, className = '' }) { return <h2 className={`promo-heading ${className}`}>{children}</h2>; }
function Field({ label, required, children, className = '' }) { return <label className={`promo-field ${className}`}><span>{label}{required && <b> *</b>}</span>{children}</label>; }
function UnitInput({ value, setValue, unit, placeholder = '', exceptional = false }) { return <div className={`promo-unit-input ${exceptional ? 'is-exceptional' : ''}`}><input type="number" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} /><i>{unit}</i></div>; }
function SaveIcon() { return <svg className="promo-save__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l3 3v15H5V3Zm3 0v6h7V3M8 21v-7h8v7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" /><path d="M16 3v5h3" fill="none" stroke="currentColor" strokeWidth="2" /></svg>; }
function ProductSelector({ open, setOpen, search, setSearch, products, selected, setSelected }) { const update = (product) => setSelected((current) => current.some((item) => item.id === product.id) ? current.filter((item) => item.id !== product.id) : [...current, product]); return <div className="promo-product-selector"><Field label="Sản phẩm áp dụng" required><button className="promo-product-trigger" onClick={() => setOpen(!open)}>{selected.length ? `${selected.length} sản phẩm đã chọn` : 'Chọn sản phẩm...'}</button></Field>{selected.length > 0 && <div className="promo-selected-chips">{selected.map((product) => <button key={product.id}>{product.tenSanPham}<HiOutlineX onClick={() => update(product)} /></button>)}</div>}{open && <div className="promo-product-panel"><div className="promo-product-search"><HiOutlineSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nhanh..." /></div>{products.map((product) => <label key={product.id}><input type="checkbox" checked={selected.some((item) => item.id === product.id)} onChange={() => update(product)} /><span><b>{product.tenSanPham}</b><small>{product.maSanPham}</small></span></label>)}</div>}</div>; }
