import { useEffect, useRef, useState } from 'react';
import { Cpu, MemoryStick, HardDrive, Monitor, Zap, CircuitBoard, Settings2, ChevronRight, X } from 'lucide-react';
import './ProductHighlights.css';

function iconFor(label) {
  const text = label.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  return /cpu|nhan|luong|socket/.test(text) ? Cpu : /ram|vram|bo nho/.test(text) ? MemoryStick
    : /ssd|hdd|o cung|luu tru/.test(text) ? HardDrive : /man hinh|phan giai|tan so quet|tam nen|do hoa|gpu|vga/.test(text) ? Monitor
    : /cong suat|dien|nguon|psu/.test(text) ? Zap : /mainboard|chipset/.test(text) ? CircuitBoard : Settings2;
}
export default function ProductHighlights({product, selectedVariantId}) {
  const [open,setOpen] = useState(false);
  const rows = product.mainSpecs ?? product.specsSummary ?? [];
  const variant = product.variants?.find(item => item.id === selectedVariantId);
  const name = product.loaiSanPham === 'BO_PC' || product.variants?.length === 1 ? product.name : variant?.tenPhienBan || product.name;
  return <section className="product-highlights" aria-labelledby="product-highlights-title">
    <div className="product-highlights__header">
      <h2 id="product-highlights-title">Thông số nổi bật</h2>
      <button type="button" onClick={() => setOpen(true)}>Xem tất cả thông số <ChevronRight size={14} aria-hidden="true" /></button>
    </div>
    {rows.length ? <dl className="product-highlights__grid">{rows.slice(0,6).map((spec,index) => {
      const Icon = iconFor(spec.label);
      return <div className="product-highlights__item" key={`${spec.label}-${index}`}><Icon size={22} aria-hidden="true" /><div><dt>{spec.label}</dt><dd>{spec.value}</dd></div></div>;
    })}</dl> : <p className="product-content-empty">Chưa có thông số nổi bật.</p>}
    {open && <FullSpecifications product={product} name={name} onClose={() => setOpen(false)} />}
  </section>;
}
function FullSpecifications({product,name,onClose}) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current, previous = document.activeElement, overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  },[]);
  return <dialog ref={dialog} className="product-full-specs" aria-labelledby="product-full-specs-title"
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="product-full-specs__panel">
      <header><h2 id="product-full-specs-title">Thông số kỹ thuật</h2><button type="button" autoFocus onClick={onClose} aria-label="Đóng thông số kỹ thuật"><X size={20} /></button></header>
      <div className="product-full-specs__body">
        <div className="product-full-specs__product">{product.images?.[0] && <img src={product.images[0]} alt="" />}<h3>{name}</h3></div>
        {product.fullSpecs?.length ? <table><caption>Thông số kỹ thuật</caption><tbody>{product.fullSpecs.map((spec,index) => <tr key={`${spec.label}-${index}`}><th scope="row">{spec.label}</th><td>{spec.value}</td></tr>)}</tbody></table>
          : <p className="product-content-empty">Chưa có thông số kỹ thuật cho sản phẩm này.</p>}
      </div>
    </div>
  </dialog>;
}
