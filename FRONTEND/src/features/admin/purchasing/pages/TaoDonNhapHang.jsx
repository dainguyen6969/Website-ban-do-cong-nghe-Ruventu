// Admin purchasing screen or helper: TaoDonNhapHang.
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import PriceInput from '../../../../shared/components/ui/PriceInput';
import { createPurchaseOrder, getPurchaseOrder, getSupplier, purchasableProducts, suppliers, totalGoods, totalOrder, updatePurchaseOrder, warehouses } from '../../../../data/purchaseOrders';
import { money, PageCrumb, PurchaseCard } from './PurchaseShared';
import './NhapHang.css';

export default function TaoDonNhapHang() {
  const navigate = useNavigate(); const location = useLocation();
  const editId = new URLSearchParams(location.search).get('edit');
  const editing = editId ? getPurchaseOrder(editId) : null;
  const [items, setItems] = useState(() => editing?.items || []);
  const [supplierId, setSupplierId] = useState(editing?.supplierId || '');
  const [warehouseId, setWarehouseId] = useState(editing?.warehouseId || 'KHO-HN');
  const [vat, setVat] = useState(editing?.vat ?? true);
  const [productQuery, setProductQuery] = useState(''); const [productOpen, setProductOpen] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState(''); const [supplierOpen, setSupplierOpen] = useState(false);
  const supplier = getSupplier(supplierId);
  const filteredProducts = useMemo(() => purchasableProducts.filter((product) => `${product.name} ${product.variant} ${product.sku}`.toLocaleLowerCase('vi').includes(productQuery.toLocaleLowerCase('vi'))), [productQuery]);
  const filteredSuppliers = suppliers.filter((item) => `${item.name} ${item.id}`.toLocaleLowerCase('vi').includes(supplierQuery.toLocaleLowerCase('vi')));
  const draft = { items, supplierId, warehouseId, vat };
  const valid = supplierId && items.length > 0 && items.every((row) => row.qty > 0 && row.unitPrice > 0);
  const addProduct = (product) => { setItems((prev) => prev.some((row) => row.id === product.id) ? prev.map((row) => row.id === product.id ? { ...row, qty: row.qty + 1 } : row) : [...prev, { ...product, qty: 1, unitPrice: 0, received: 0, returned: 0 }]); setProductOpen(false); setProductQuery(''); };
  const patchItem = (id, patch) => setItems((prev) => prev.map((row) => row.id === id ? { ...row, ...patch } : row));
  const submit = () => { if (!valid) return; const order = editing ? updatePurchaseOrder(editId, (old) => ({ ...old, ...draft })) : createPurchaseOrder(draft); navigate(`/kho-hang/nhap-hang/${order.id}`); };

  return <main className="purchase-page purchase-create-page">
    <div className="purchase-heading"><div><PageCrumb tail={editing ? 'CHỈNH SỬA' : 'TẠO MỚI'} /><h1>{editing ? `CHỈNH SỬA ${editing.id}` : 'TẠO ĐƠN NHẬP HÀNG'}</h1></div></div>
    <div className="purchase-create-grid"><div>
      <PurchaseCard title="SẢN PHẨM ĐẶT NHẬP"><div className="purchase-autocomplete"><label className="purchase-search bordered"><HiOutlineSearch /><input value={productQuery} onFocus={() => setProductOpen(true)} onChange={(event) => { setProductQuery(event.target.value); setProductOpen(true); }} placeholder="TÌM SẢN PHẨM / PHIÊN BẢN..." /></label>{productOpen && <div className="purchase-results">{filteredProducts.map((product) => { const added = items.some((row) => row.id === product.id); return <button key={product.id} onMouseDown={(event) => { event.preventDefault(); addProduct(product); }}><strong>{product.name}</strong><small>{product.variant} · {product.sku} {added && <em>ĐÃ THÊM – CLICK ĐỂ TĂNG SL</em>}</small></button>; })}</div>}</div>
        {!items.length ? <div className="purchase-empty-state">CHƯA CÓ SẢN PHẨM — TÌM VÀ CHỌN PHIÊN BẢN Ở TRÊN.</div> : <table className="purchase-form-table"><thead><tr><th>SẢN PHẨM / PHIÊN BẢN</th><th>SỐ LƯỢNG</th><th>ĐƠN GIÁ NHẬP</th><th>THÀNH TIỀN</th><th /></tr></thead><tbody>{items.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.variant} · {row.sku}</small></td><td><input type="number" min="1" value={row.qty} onChange={(event) => patchItem(row.id, { qty: Math.max(1, Number(event.target.value) || 1) })} /></td><td><div className="purchase-price-stepper"><button onClick={() => patchItem(row.id, { unitPrice: Math.max(0, row.unitPrice - 1000) })}>−</button><PriceInput value={String(row.unitPrice / 1000 || '')} onChange={(value) => patchItem(row.id, { unitPrice: Number(value) * 1000 })} /><button onClick={() => patchItem(row.id, { unitPrice: row.unitPrice + 1000 })}>+</button></div></td><td><strong>{row.unitPrice ? money(row.qty * row.unitPrice) : '—'}</strong></td><td><button className="remove-x" onClick={() => setItems((prev) => prev.filter((item) => item.id !== row.id))}>×</button></td></tr>)}</tbody></table>}
      </PurchaseCard></div>
      <aside className="purchase-create-side"><PurchaseCard title="NHÀ CUNG CẤP">{supplier ? <div className="supplier-card"><button onClick={() => setSupplierId('')}>ĐỔI</button><strong>{supplier.name}</strong><dl><dt>MÃ NCC</dt><dd>{supplier.id}</dd><dt>ĐT</dt><dd>{supplier.phone}</dd><dt>EMAIL</dt><dd>{supplier.email}</dd><dt>ĐỊA CHỈ</dt><dd>{supplier.address}</dd></dl></div> : <div className="purchase-autocomplete"><label className="purchase-search bordered"><HiOutlineSearch /><input value={supplierQuery} onFocus={() => setSupplierOpen(true)} onChange={(event) => { setSupplierQuery(event.target.value); setSupplierOpen(true); }} placeholder="TÌM NHÀ CUNG CẤP..." /></label>{supplierOpen && <div className="purchase-results supplier-results">{filteredSuppliers.map((item) => <button key={item.id} onMouseDown={(event) => { event.preventDefault(); setSupplierId(item.id); setSupplierOpen(false); }}><strong>{item.name}</strong><small>{item.id}</small></button>)}</div>}</div>}<p className="purchase-note">Chức năng “THÊM NHÀ CUNG CẤP” sẽ được bổ sung ở bước tiếp theo.</p></PurchaseCard>
      <PurchaseCard title="KHO NHẬP"><select className="purchase-wide-select" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>{warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name} ({warehouse.id})</option>)}</select></PurchaseCard>
      <PurchaseCard title="THUẾ VÀ TỔNG TIỀN"><label className="purchase-checkbox"><input type="checkbox" checked={vat} onChange={(event) => setVat(event.target.checked)} /> ÁP DỤNG THUẾ VAT (10%)</label><div className="purchase-summary"><span>TIỀN HÀNG</span><b>{money(totalGoods(draft))}</b><span>THUẾ VAT {vat ? '(10%)' : ''}</span><b>{money(vat ? totalGoods(draft) * .1 : 0)}</b><hr /><strong>TỔNG TIỀN PHẢI TRẢ NCC</strong><em>{money(totalOrder(draft))}</em></div></PurchaseCard></aside>
    </div>
    <footer className="purchase-fixed-footer"><button className="purchase-btn outline" onClick={() => navigate(editing ? `/kho-hang/nhap-hang/${editId}` : '/kho-hang/nhap-hang')}>‹ QUAY LẠI</button><button className="purchase-btn black" disabled={!valid} onClick={submit}>{editing ? 'LƯU THAY ĐỔI' : 'ĐẶT HÀNG'}</button></footer>
  </main>;
}
