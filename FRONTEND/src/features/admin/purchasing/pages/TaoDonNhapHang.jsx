import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import PriceInput from '../../../../shared/components/ui/PriceInput';
import { createPurchaseOrder, getPurchaseOptions, getPurchaseOrder, getSupplierDetail, getSupplierOptions, saveBody, updatePurchaseOrder } from '../api/purchaseOrderApi';
import { money, PageCrumb, PurchaseCard } from './PurchaseShared';
import './NhapHang.css';

const previewGoods = (items) => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

export default function TaoDonNhapHang() {
  const navigate = useNavigate(); const editId = new URLSearchParams(useLocation().search).get('edit');
  const [items, setItems] = useState([]); const [supplierId, setSupplierId] = useState(''); const [warehouseId, setWarehouseId] = useState(''); const [applyTax, setApplyTax] = useState(true);
  const [suppliers, setSuppliers] = useState([]); const [supplier, setSupplier] = useState(null); const [warehouses, setWarehouses] = useState([]); const [versions, setVersions] = useState([]);
  const [productQuery, setProductQuery] = useState(''); const [productOpen, setProductOpen] = useState(false); const [supplierQuery, setSupplierQuery] = useState(''); const [supplierOpen, setSupplierOpen] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    Promise.all([getSupplierOptions(controller.signal), getPurchaseOptions(controller.signal), editId ? getPurchaseOrder(editId, controller.signal) : null])
      .then(([supplierItems, options, order]) => {
        setSuppliers(supplierItems); setWarehouses(options.warehouses); setVersions(options.versions);
        if (order) {
          if (order.importStatus !== 'DAT_HANG') throw new Error('Chỉ được chỉnh sửa đơn ở trạng thái Đặt hàng.');
          setSupplierId(String(order.supplier.id)); setSupplier(order.supplier); setWarehouseId(String(order.warehouse.id)); setApplyTax(order.applyTax);
          setItems(order.items.map((item) => ({ ...item, sku: '', versionId: item.versionId })));
        } else setWarehouseId(String(options.warehouses[0]?.id || ''));
      }).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [editId]);
  const chooseSupplier = async (item) => { setSupplierId(String(item.id)); setSupplier(item); setSupplierOpen(false); setSupplierQuery(''); try { setSupplier(await getSupplierDetail(item.id)); } catch { /* list data remains usable */ } };
  const filteredProducts = useMemo(() => versions.filter((item) => `${item.name} ${item.sku}`.toLocaleLowerCase('vi').includes(productQuery.toLocaleLowerCase('vi'))), [versions, productQuery]);
  const filteredSuppliers = suppliers.filter((item) => `${item.name} ${item.code}`.toLocaleLowerCase('vi').includes(supplierQuery.toLocaleLowerCase('vi')));
  const addProduct = (product) => { setItems((old) => old.some((item) => item.versionId === product.id) ? old.map((item) => item.versionId === product.id ? { ...item, qty: item.qty + 1 } : item) : [...old, { versionId: product.id, name: product.name, sku: product.sku, qty: 1, unitPrice: 0 }]); setProductOpen(false); setProductQuery(''); };
  const patchItem = (id, patch) => setItems((old) => old.map((item) => item.versionId === id ? { ...item, ...patch } : item));
  const goods = previewGoods(items); const tax = applyTax ? goods * .1 : 0; const valid = supplierId && warehouseId && items.length && items.every((item) => item.qty > 0 && item.unitPrice > 0);
  const submit = async () => {
    if (!valid || saving) return; setSaving(true); setError('');
    try {
      const result = editId ? await updatePurchaseOrder(editId, saveBody({ supplierId, warehouseId, applyTax, items })) : await createPurchaseOrder(saveBody({ supplierId, warehouseId, applyTax, items }));
      navigate(`/kho-hang/nhap-hang/${result?.id || editId}`);
    } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  };

  return <main className="purchase-page purchase-create-page">
    <div className="purchase-heading"><div><PageCrumb tail={editId ? 'CHỈNH SỬA' : 'TẠO MỚI'} /><h1>{editId ? 'CHỈNH SỬA ĐƠN NHẬP HÀNG' : 'TẠO ĐƠN NHẬP HÀNG'}</h1></div></div>
    {error && <p className="purchase-message error">{error}</p>}{loading ? <p className="purchase-message">Đang tải dữ liệu...</p> : <div className="purchase-create-grid"><div>
      <PurchaseCard title="SẢN PHẨM ĐẶT NHẬP"><div className="purchase-autocomplete"><label className="purchase-search bordered"><HiOutlineSearch /><input value={productQuery} onFocus={() => setProductOpen(true)} onChange={(event) => { setProductQuery(event.target.value); setProductOpen(true); }} placeholder="TÌM SẢN PHẨM / PHIÊN BẢN..." /></label>{productOpen && <div className="purchase-results">{filteredProducts.map((product) => <button key={product.id} onMouseDown={(event) => { event.preventDefault(); addProduct(product); }}><strong>{product.name}</strong><small>{product.sku} {items.some((item) => item.versionId === product.id) && <em>ĐÃ THÊM – CLICK ĐỂ TĂNG SL</em>}</small></button>)}</div>}</div>
        {!items.length ? <div className="purchase-empty-state">CHƯA CÓ SẢN PHẨM — TÌM VÀ CHỌN PHIÊN BẢN Ở TRÊN.</div> : <table className="purchase-form-table"><thead><tr><th>SẢN PHẨM / PHIÊN BẢN</th><th>SỐ LƯỢNG</th><th>ĐƠN GIÁ NHẬP</th><th>THÀNH TIỀN</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.versionId}><td><strong>{item.name}</strong><small>{item.sku}</small></td><td><input type="number" min="1" value={item.qty} onChange={(event) => patchItem(item.versionId, { qty: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} /></td><td><div className="purchase-price-stepper"><button onClick={() => patchItem(item.versionId, { unitPrice: Math.max(0, item.unitPrice - 1000) })}>−</button><PriceInput value={String(item.unitPrice / 1000 || '')} onChange={(value) => patchItem(item.versionId, { unitPrice: Number(value) * 1000 })} /><button onClick={() => patchItem(item.versionId, { unitPrice: item.unitPrice + 1000 })}>+</button></div></td><td><strong>{item.unitPrice ? money(item.qty * item.unitPrice) : '—'}</strong></td><td><button className="remove-x" onClick={() => setItems((old) => old.filter((row) => row.versionId !== item.versionId))}>×</button></td></tr>)}</tbody></table>}
      </PurchaseCard></div><aside className="purchase-create-side"><PurchaseCard title="NHÀ CUNG CẤP">{supplierId ? <div className="supplier-card"><button onClick={() => { setSupplierId(''); setSupplier(null); }}>ĐỔI</button><strong>{supplier?.name}</strong><dl><dt>MÃ NCC</dt><dd>{supplier?.code || '—'}</dd><dt>ĐT</dt><dd>{supplier?.phone || '—'}</dd><dt>EMAIL</dt><dd>{supplier?.email || '—'}</dd><dt>ĐỊA CHỈ</dt><dd>{supplier?.address || '—'}</dd></dl></div> : <div className="purchase-autocomplete"><label className="purchase-search bordered"><HiOutlineSearch /><input value={supplierQuery} onFocus={() => setSupplierOpen(true)} onChange={(event) => { setSupplierQuery(event.target.value); setSupplierOpen(true); }} placeholder="TÌM NHÀ CUNG CẤP..." /></label>{supplierOpen && <div className="purchase-results supplier-results">{filteredSuppliers.map((item) => <button key={item.id} onMouseDown={(event) => { event.preventDefault(); chooseSupplier(item); }}><strong>{item.name}</strong><small>{item.code}</small></button>)}</div>}</div>}<p className="purchase-note">Chỉ hiển thị nhà cung cấp đang hoạt động từ hệ thống.</p></PurchaseCard>
      <PurchaseCard title="KHO NHẬP"><select className="purchase-wide-select" value={warehouseId} disabled>{warehouses.filter((item) => String(item.id) === warehouseId).map((item) => <option value={item.id} key={item.id}>{item.name} ({item.code})</option>)}</select></PurchaseCard>
      <PurchaseCard title="THUẾ VÀ TỔNG TIỀN"><label className="purchase-checkbox"><input type="checkbox" checked={applyTax} onChange={(event) => setApplyTax(event.target.checked)} /> ÁP DỤNG THUẾ VAT (10%)</label><div className="purchase-summary"><span>TIỀN HÀNG (TẠM TÍNH)</span><b>{money(goods)}</b><span>THUẾ VAT (TẠM TÍNH)</span><b>{money(tax)}</b><hr /><strong>TỔNG TẠM TÍNH</strong><em>{money(goods + tax)}</em></div></PurchaseCard></aside></div>}
    <footer className="purchase-fixed-footer"><button className="purchase-btn outline" onClick={() => navigate(editId ? `/kho-hang/nhap-hang/${editId}` : '/kho-hang/nhap-hang')}>‹ QUAY LẠI</button><button className="purchase-btn black" disabled={!valid || saving} onClick={submit}>{saving ? 'ĐANG LƯU...' : editId ? 'LƯU THAY ĐỔI' : 'ĐẶT HÀNG'}</button></footer>
  </main>;
}
