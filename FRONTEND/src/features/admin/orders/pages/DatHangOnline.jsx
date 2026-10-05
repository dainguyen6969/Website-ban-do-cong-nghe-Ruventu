// Admin order screen: DatHangOnline.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineSearch } from 'react-icons/hi';
import PriceInput from '../../../../shared/components/ui/PriceInput';
import {
  buildPreviewBody, createOnlineOrder, getSalesOptions, previewOnlineOrder, updateOnlineOrder,
  searchSalesCustomers, searchSalesProducts, createSalesCustomer,
} from '../api/onlineOrderApi';
import './DatHangOnline.css';
import { getOrder } from '../api/orderApi';
import OrderModal from '../components/OrderModal';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const formatMoney = (value) => money.format(Number(value || 0));
const validPhone = (value) => /^(?:\+84|0)\d{9,10}$/.test(value.replace(/[\s.-]/g, ''));
const labels = {
  TIEN_MAT: 'TIỀN MẶT', CHUYEN_KHOAN: 'CHUYỂN KHOẢN',
  CHUA_BAO_GOM: 'CHƯA BAO GỒM THUẾ', DA_BAO_GOM: 'ĐÃ BAO GỒM THUẾ',
  NHAN_TAI_CUA_HANG: 'NHẬN TẠI CỬA HÀNG', GIAO_HANG: 'GIAO HÀNG',
};

export default function DatHangOnline() {
  const navigate = useNavigate();
  const { orderId: editId } = useParams();
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState(null);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [recipient, setRecipient] = useState({ name: '', phone: '', address: '' });
  const [touched, setTouched] = useState({});
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [stockNote, setStockNote] = useState('');
  const [promotion, setPromotion] = useState('');
  const [payment, setPayment] = useState('');
  const [applyVat, setApplyVat] = useState(false);
  const [vatMode, setVatMode] = useState('CHUA_BAO_GOM');
  const [delivery, setDelivery] = useState('GIAO_HANG');
  const [shippingInput, setShippingInput] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewError, setPreviewError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const requestKey = useRef({ signature: '', key: '' });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getSalesOptions(controller.signal).then((data) => {
      setOptions(data);
      setPayment(data.phuong_thuc_online?.[0] || '');
      setVatMode(data.che_do_thue?.[0] || 'CHUA_BAO_GOM');
      setDelivery(data.hinh_thuc_nhan_hang?.includes('GIAO_HANG') ? 'GIAO_HANG' : data.hinh_thuc_nhan_hang?.[0] || '');
    }).catch((error) => { if (error.name !== 'AbortError') setOptionsError(error.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!editId || !options) return undefined;
    const controller = new AbortController();
    getOrder(editId, controller.signal).then((order) => {
      setCustomer(order.khach_hang_id ? { id: order.khach_hang_id, name: order.ten_khach_hang, phone: order.so_dien_thoai_khach_hang || '' } : null);
      setRecipient({ name: order.ten_nguoi_nhan || '', phone: order.sdt_nguoi_nhan || '', address: order.dia_chi_giao_hang || '' });
      setItems((order.san_pham || []).map((item) => ({ id: Number(item.phien_ban_id), name: item.ten_san_pham, variant: item.ten_phien_ban, code: item.ma_san_pham || '', unitPrice: Number(item.don_gia || 0), quantity: Number(item.so_luong) })));
      setPayment(order.phuong_thuc_thanh_toan); setApplyVat(Number(order.tong_tien_vat) > 0); setDelivery(order.hinh_thuc_nhan_hang); setShippingInput(String(Number(order.phi_giao_hang || 0) / 1000)); setNote(order.ghi_chu || '');
    }).catch((error) => { if (error.name !== 'AbortError') setOptionsError(error.message); });
    return () => controller.abort();
  }, [editId, options]);

  useEffect(() => {
    const query = customerQuery.trim();
    if (!query) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => { setCustomerLoading(true); searchSalesCustomers(query, controller.signal)
      .then(setCustomerResults)
      .catch((error) => { if (error.name !== 'AbortError') setOptionsError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCustomerLoading(false); }); }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [customerQuery]);

  useEffect(() => {
    const query = productQuery.trim();
    if (!query || !options) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => { setProductLoading(true); searchSalesProducts(query, options, controller.signal)
      .then(setProductResults)
      .catch((error) => { if (error.name !== 'AbortError') setOptionsError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setProductLoading(false); }); }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [productQuery, options]);

  const shippingFee = delivery === 'GIAO_HANG' ? Number(shippingInput || 0) * 1000 : 0;
  const form = useMemo(() => options ? ({
    options, customerId: customer?.id, applyVat, vatMode, promotion, shippingFee, items,
    recipient, payment, delivery, note,
  }) : null, [options, customer, applyVat, vatMode, promotion, shippingFee, items, recipient, payment, delivery, note]);
  const previewBody = useMemo(() => form && items.length ? buildPreviewBody(form) : null, [form, items.length]);
  const previewSignature = previewBody ? JSON.stringify(previewBody) : '';

  useEffect(() => {
    if (!previewSignature) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPreviewError(''); setPreviewLoading(true);
      previewOnlineOrder(JSON.parse(previewSignature), controller.signal)
      .then((data) => { setPreview({ data, signature: previewSignature }); setPromotions(data.khuyen_mai_kha_dung || []); })
      .catch((error) => { if (error.name !== 'AbortError') setPreviewError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [previewSignature, previewRevision]);

  const data = preview?.signature === previewSignature ? preview.data : null;
  const phoneError = recipient.phone && !validPhone(recipient.phone) ? 'Số điện thoại chưa đúng định dạng backend.' : '';
  const missing = [!customer && 'Chưa chọn khách hàng', !items.length && 'Chưa có sản phẩm', !recipient.name.trim() && 'Thiếu tên người nhận', !recipient.phone.trim() && 'Thiếu số điện thoại', delivery === 'GIAO_HANG' && !recipient.address.trim() && 'Thiếu địa chỉ giao hàng'].filter(Boolean);
  const canSubmit = !missing.length && !phoneError && Boolean(payment) && Boolean(data) && !previewError && !submitting;

  const chooseCustomer = (entry) => {
    setCustomer(entry); setCustomerQuery(''); setTouched({});
    setRecipient({ name: entry.name, phone: entry.phone, address: '' });
  };
  const clearCustomer = () => { setCustomer(null); setRecipient({ name: '', phone: '', address: '' }); };
  const updateRecipient = (key, value) => setRecipient((current) => ({ ...current, [key]: value }));
  const addProduct = (product) => {
    if (!product.stock) { setStockNote('Sản phẩm đã hết hàng.'); return; }
    setProductQuery(''); setStockNote('');
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (!existing) return [...current, { ...product, quantity: 1 }];
      if (existing.quantity >= existing.stock) { setStockNote(`Chỉ còn ${existing.stock} sản phẩm trong kho.`); return current; }
      return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
    });
  };
  const changeQuantity = (id, value) => {
    setStockNote('');
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const requested = Number.parseInt(value, 10) || 1;
      if (requested > item.stock) { setStockNote(`Chỉ còn ${item.stock} sản phẩm trong kho.`); return { ...item, quantity: item.stock }; }
      return { ...item, quantity: Math.max(1, requested) };
    }));
  };
  const submit = async () => {
    setSubmitted(true); setTouched({ name: true, phone: true, address: true });
    if (!canSubmit) return;
    setSubmitting(true); setSubmitError('');
    try {
      const signature = JSON.stringify({ form, total: data.tong_thanh_toan });
      if (requestKey.current.signature !== signature) requestKey.current = { signature, key: crypto.randomUUID() };
      const order = editId ? await updateOnlineOrder(editId, form, data.tong_thanh_toan) : await createOnlineOrder(form, data.tong_thanh_toan, requestKey.current.key);
      navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`);
    } catch (error) {
      setSubmitError(error.message);
      if (error.status === 409) { setPreview(null); setPreviewRevision((value) => value + 1); }
    } finally { setSubmitting(false); }
  };

  const saveCustomer = async () => {
    if (!newCustomer.name.trim() || !validPhone(newCustomer.phone)) return;
    setCustomerSaving(true); setCustomerError('');
    try { chooseCustomer(await createSalesCustomer({ ...newCustomer, phone: newCustomer.phone.replace(/[\s.-]/g, '') })); setNewCustomer(null); }
    catch (error) { setCustomerError(error.message); }
    finally { setCustomerSaving(false); }
  };

  return <div className="online-order-page">
    <div className="online-order-hero"><div><nav>ĐƠN HÀNG <span>/</span> ĐẶT HÀNG ONLINE</nav><h1>{editId ? 'CHỈNH SỬA ĐƠN HÀNG ONLINE' : 'TẠO ĐƠN HÀNG ONLINE'}</h1><p>LÊN ĐƠN THỦ CÔNG CHO KHÁCH HÀNG VÀ KIỂM TRA GIÁ / TỒN / KHUYẾN MẠI TRƯỚC KHI LƯU</p></div><button type="button" className="online-outline-btn" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}><HiOutlineArrowLeft /> DANH SÁCH ĐƠN HÀNG</button></div>
    {optionsError && <p className="online-banner online-banner--error">{optionsError}</p>}
    <div className="online-order-grid"><div className="online-order-form">
      <Section n="1" title="KHÁCH HÀNG">
        <button type="button" className="online-outline-btn" onClick={() => { setCustomerError(''); setNewCustomer({ name: '', phone: '' }); }}>+ THÊM KHÁCH HÀNG</button>
        {customer ? <div className="selected-customer"><div><strong>{customer.name}</strong><span>{customer.phone}</span><span>{customer.email || 'Không có email'}</span></div><button type="button" className="online-outline-btn" onClick={clearCustomer}>ĐỔI KHÁCH</button></div> : <Search value={customerQuery} onChange={setCustomerQuery} placeholder="Tìm tên / số điện thoại / email..." loading={customerLoading}>{customerResults.map((entry) => <button type="button" key={entry.id} className="customer-result" onClick={() => chooseCustomer(entry)}><strong>{entry.name}</strong><span>{entry.phone}{entry.email ? ` · ${entry.email}` : ''}</span></button>)}</Search>}
        {submitted && !customer && <Error>Vui lòng chọn khách hàng.</Error>}
      </Section>
      <Section n="2" title="THÔNG TIN NGƯỜI NHẬN"><div className="recipient-grid">
        <Field label="TÊN NGƯỜI NHẬN *" value={recipient.name} change={(value) => updateRecipient('name', value)} blur={() => setTouched((v) => ({ ...v, name: true }))} placeholder="Nhập họ tên" error={(touched.name || submitted) && !recipient.name.trim() ? 'Vui lòng nhập tên người nhận.' : ''} />
        <Field label="SỐ ĐIỆN THOẠI *" value={recipient.phone} change={(value) => updateRecipient('phone', value)} blur={() => setTouched((v) => ({ ...v, phone: true }))} placeholder="0901234567" error={(touched.phone || submitted) ? (!recipient.phone.trim() ? 'Vui lòng nhập số điện thoại.' : phoneError) : ''} />
        <Field wide label={`ĐỊA CHỈ GIAO HÀNG${delivery === 'GIAO_HANG' ? ' *' : ''}`} value={recipient.address} change={(value) => updateRecipient('address', value)} blur={() => setTouched((v) => ({ ...v, address: true }))} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..." error={(touched.address || submitted) && delivery === 'GIAO_HANG' && !recipient.address.trim() ? 'Vui lòng nhập địa chỉ giao hàng.' : ''} />
      </div></Section>
      <Section n="3" title="SẢN PHẨM">
        <Search value={productQuery} onChange={setProductQuery} placeholder="Tìm mã / tên / phiên bản / mã vạch..." loading={productLoading}>{productResults.map((product) => <button type="button" key={product.id} className="product-result" onClick={() => addProduct(product)}><span><strong>{product.name}</strong><small>{product.code} · {product.variant}{product.barcode ? ` · ${product.barcode}` : ''}</small></span><span><b>{formatMoney(product.unitPrice)}</b><small>{product.stock ? `Tồn: ${product.stock}` : 'HẾT HÀNG'}</small></span></button>)}</Search>
        {!items.length ? <p className="product-empty">CHƯA CÓ SẢN PHẨM — TÌM VÀ THÊM SẢN PHẨM VÀO ĐƠN</p> : <LineTable items={items} previewLines={data?.san_pham || []} change={changeQuantity} remove={(id) => setItems((current) => current.filter((item) => item.id !== id))} />}
        {stockNote && <p className="stock-note">{stockNote}</p>}{submitted && !items.length && <Error>Vui lòng thêm ít nhất một sản phẩm.</Error>}
      </Section>
      <Section n="4" title="KHUYẾN MẠI"><label className="online-field"><span>CHƯƠNG TRÌNH ÁP DỤNG</span><select disabled={Boolean(editId)} value={promotion} onChange={(event) => setPromotion(event.target.value)}><option value="">— Không áp dụng —</option>{promotions.map((item) => <option key={item.ma_chuong_trinh} value={item.ma_chuong_trinh}>{item.ma_chuong_trinh} — {item.ten_chuong_trinh}</option>)}</select></label>{editId && <p className="stock-note">API chỉnh sửa chưa hỗ trợ thay đổi khuyến mại.</p>}</Section>
      <Section n="5" title="THANH TOÁN"><p className="field-label">PHƯƠNG THỨC THANH TOÁN *</p><div className="toggle-row">{(options?.phuong_thuc_online || []).map((value) => <Toggle key={value} active={payment === value} click={() => setPayment(value)}>{labels[value] || value}</Toggle>)}</div><div className="form-divider" /><p className="field-label">THUẾ VAT</p><label className="check-row"><input type="checkbox" checked={applyVat} onChange={(event) => setApplyVat(event.target.checked)} /> Áp dụng VAT</label>{applyVat && <div className="toggle-row vat-toggles">{(options?.che_do_thue || []).map((value) => <Toggle key={value} active={vatMode === value} click={() => setVatMode(value)}>{labels[value] || value}</Toggle>)}</div>}</Section>
      <Section n="6" title="HÌNH THỨC NHẬN HÀNG"><div className="toggle-row">{(options?.hinh_thuc_nhan_hang || []).map((value) => <Toggle key={value} active={delivery === value} click={() => setDelivery(value)}>{labels[value] || value}</Toggle>)}</div>{delivery === 'GIAO_HANG' && <label className="online-field shipping-field"><span>PHÍ GIAO HÀNG (đ)</span><div className="money-input"><PriceInput value={shippingInput} onChange={setShippingInput} /><i>đ</i></div></label>}</Section>
      <Section n="7" title="GHI CHÚ"><textarea className="notes-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cho đơn hàng..." /></Section>
    </div><Summary data={data} loading={previewLoading} error={submitError || previewError} missing={missing} phoneError={phoneError && recipient.phone} canSubmit={canSubmit} submitting={submitting} submit={submit} edit={Boolean(editId)} /></div>
    {newCustomer && <OrderModal title="THÊM KHÁCH HÀNG" busy={customerSaving} close={() => setNewCustomer(null)} submit={saveCustomer} confirmLabel="LƯU KHÁCH HÀNG" error={customerError} disabled={!newCustomer.name.trim() || !validPhone(newCustomer.phone)}><label className="order-operation-field"><span>HỌ TÊN *</span><input required maxLength={100} value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} /></label><label className="order-operation-field"><span>SỐ ĐIỆN THOẠI *</span><input required type="tel" value={newCustomer.phone} onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))} /></label></OrderModal>}
  </div>;
}

function Section({ n, title, children }) { return <section className="online-section"><header><h2>{n}. {title}</h2></header><div className="online-section__body">{children}</div></section>; }
function Search({ value, onChange, placeholder, loading, children }) { return <div className="search-combobox"><label><HiOutlineSearch /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>{value && <div className="search-results">{loading ? <p>Đang tải dữ liệu...</p> : children?.length ? children : <p>Không tìm thấy kết quả phù hợp.</p>}</div>}</div>; }
function Field({ label, value, change, blur, placeholder, error, wide }) { return <label className={`online-field ${wide ? 'online-field--wide' : ''} ${error ? 'online-field--error' : ''}`}><span>{label}</span><input value={value} onChange={(event) => change(event.target.value)} onBlur={blur} placeholder={placeholder} />{error && <small>{error}</small>}</label>; }
function Toggle({ active, click, children }) { return <button type="button" className={`online-toggle ${active ? 'is-active' : ''}`} onClick={click}>{children}</button>; }
function Error({ children }) { return <p className="inline-error">{children}</p>; }
function LineTable({ items, previewLines, change, remove }) { const byId = new Map(previewLines.map((line) => [Number(line.phien_ban_id), line])); return <div className="line-table-wrap"><table className="line-table"><thead><tr><th>SẢN PHẨM</th><th>ĐƠN GIÁ</th><th>SỐ LƯỢNG</th><th>THÀNH TIỀN</th><th /></tr></thead><tbody>{items.map((item) => { const line = byId.get(item.id); return <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code} · {item.variant}</small></td><td>{line ? formatMoney(line.don_gia) : 'Đang tính...'}</td><td><div className="quantity-control"><button type="button" onClick={() => change(item.id, item.quantity - 1)}>−</button><input aria-label={`Số lượng ${item.name}`} type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => change(item.id, event.target.value)} /><button type="button" onClick={() => change(item.id, item.quantity + 1)}>+</button></div></td><td className="line-total">{line ? formatMoney(line.thanh_tien) : '—'}</td><td><button type="button" className="remove-line" onClick={() => remove(item.id)}>XÓA</button></td></tr>; })}{previewLines.filter((line) => line.la_qua_tang).map((line) => <tr key={line.ma_dong} className="gift-row"><td><strong>Quà tặng khuyến mại</strong><small>{line.ma_dong}</small></td><td>{formatMoney(line.don_gia)}</td><td>{line.so_luong}</td><td className="line-total">{formatMoney(line.thanh_tien)}</td><td><span>QUÀ TẶNG</span></td></tr>)}</tbody></table></div>; }
function Summary({ data, loading, error, missing, phoneError, canSubmit, submitting, submit, edit }) { return <aside className="order-summary"><h2>TỔNG KẾT ĐƠN HÀNG</h2><div className="summary-body"><SummaryLine label="Tiền hàng" value={data ? formatMoney(data.tong_tien_hang) : '—'} /><SummaryLine label="Chiết khấu" value={data?.tien_chiet_khau ? `−${formatMoney(data.tien_chiet_khau)}` : '—'} red={Number(data?.tien_chiet_khau) > 0} /><SummaryLine label="VAT" value={data ? formatMoney(data.tong_tien_vat) : '—'} /><SummaryLine label="Phí giao hàng" value={data?.phi_giao_hang ? formatMoney(data.phi_giao_hang) : '—'} /><div className="summary-total"><strong>KHÁCH PHẢI TRẢ</strong><b>{data ? formatMoney(data.tong_thanh_toan) : '—'}</b></div>{loading && <p className="summary-note">Đang tính lại từ backend...</p>}{error && <p className="summary-error">- {error}</p>}{missing.length > 0 && <ul className="missing-list">{missing.map((item) => <li key={item}>- {item}</li>)}</ul>}{phoneError && <p className="summary-error">- Số điện thoại chưa hợp lệ</p>}<button type="button" className="submit-order" disabled={!canSubmit} onClick={submit}>{submitting ? 'ĐANG LƯU...' : edit ? 'LƯU THAY ĐỔI' : 'ĐẶT HÀNG'}</button></div></aside>; }
function SummaryLine({ label, value, red }) { return <div className="summary-line"><span>{label}</span><strong className={red ? 'is-red' : ''}>{value}</strong></div>; }
