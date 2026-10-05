// Reusable admin UI primitive: ProductSelector.
import { useEffect, useId, useRef, useState } from 'react';
import { HiOutlineChevronDown, HiOutlineX } from 'react-icons/hi';
import mockProducts from '../../../data/mockProducts';

export default function ProductSelector({ label, selected, setSelected }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const products = mockProducts.filter((product) => product.phanLoai === 'Sản phẩm đơn' &&
    `${product.tenSanPham} ${product.maSanPham}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const update = (product) => setSelected((current) => current.some((item) => item.id === product.id)
    ? current.filter((item) => item.id !== product.id) : [...current, product]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return <div className="promo-product-selector" ref={root} onKeyDown={(event) => {
    if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
  }}>
    <div className="promo-field promo-selector-field">
      <span id={`${id}-label`}>{label}<b> *</b></span>
      <button type="button" ref={trigger} className="promo-product-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}>
        <span id={`${id}-value`}>{selected.length ? `${selected.length} sản phẩm đã chọn` : 'Chọn sản phẩm...'}</span><HiOutlineChevronDown aria-hidden="true" />
      </button>
    </div>
    {open && <div id={`${id}-panel`} className="promo-product-panel" role="group" aria-labelledby={`${id}-label`}>
      <div className="promo-product-search"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nhanh..." aria-label={`Tìm nhanh: ${label}`} /></div>
      {products.map((product) => <label key={product.id}><input type="checkbox" checked={selected.some((item) => item.id === product.id)} onChange={() => update(product)} /><span><b>{product.tenSanPham}</b><small>{product.maSanPham}</small></span></label>)}
      {!products.length && <p className="promo-product-empty">Không tìm thấy sản phẩm.</p>}
    </div>}
    {selected.length > 0 && <div className="promo-selected-chips">{selected.map((product) => <button type="button" key={product.id} onClick={() => update(product)} aria-label={`Bỏ chọn ${product.tenSanPham}`}>{product.tenSanPham}<HiOutlineX aria-hidden="true" /></button>)}</div>}
  </div>;
}
