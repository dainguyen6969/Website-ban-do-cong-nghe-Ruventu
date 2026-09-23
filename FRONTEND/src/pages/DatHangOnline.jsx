import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import AddCustomerModal from '../components/AddCustomerModal';
import PriceInput from '../components/PriceInput';
import useCustomers from '../context/useCustomers';
import useOrders from '../context/useOrders';
import { formatMoney, formatOrderTimestamp } from '../data/mockOrders';
import { getMockProducts } from '../data/mockProducts';
import './KhachHang.css';
import './DatHangOnline.css';

const PROMOTIONS = [
  ['none', '— Không áp dụng —'],
  ['sale100', 'SALE100K — Giảm 100 nghìn cho đơn hàng'],
  ['ram50', 'GIAMRAM50K — Giảm 50 nghìn mỗi RAM'],
  ['ramGift', 'MUARAMTANGCHUOT — Mua RAM tặng chuột'],
];
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const isRam = (item) => normalize(`${item.name} ${item.category}`).includes('ram');
const validPhone = (value) => /^\d{9,11}$/.test(value.replace(/\D/g, ''));

function getProductOptions() {
  return getMockProducts().filter((product) => product.phanLoai !== 'Theo bộ (Combo)').flatMap((product) => (
    product.variants?.length ? product.variants : [{ name: 'Mặc định', sku: product.maSanPham, tonDauKy: product.tonKho, giaBanLe: product.giaBanLe }]
  ).map((variant, index) => ({
    id: `${product.id}::${variant.sku || index}`,
    name: product.tenSanPham,
    variant: variant.name || 'Mặc định',
    code: variant.sku || product.maSanPham,
    barcode: variant.barcode || variant.maVach || product.barcode || '',
    category: product.danhMuc || '',
    unitPrice: Number(variant.giaBanLe || product.giaBanLe || 0),
    stock: Math.max(0, Number(variant.tonDauKy ?? product.coTheBan ?? product.tonKho ?? 0)),
    image: product.hinhAnh || '',
  }))).filter((item) => item.stock > 0);
}

export default function DatHangOnline() {
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const { orders, addOrder } = useOrders();
  const products = useMemo(() => getProductOptions(), []);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [recipient, setRecipient] = useState({ name: '', phone: '', address: '' });
  const [touched, setTouched] = useState({});
  const [productQuery, setProductQuery] = useState('');
  const [items, setItems] = useState([]);
  const [stockNote, setStockNote] = useState('');
  const [promotion, setPromotion] = useState('none');
  const [payment, setPayment] = useState('Tiền mặt');
  const [applyVat, setApplyVat] = useState(false);
  const [vatMode, setVatMode] = useState('exclusive');
  const [delivery, setDelivery] = useState('Giao hàng');
  const [shippingInput, setShippingInput] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const customerResults = useMemo(() => {
    const query = normalize(customerQuery.trim());
    return query ? customers.filter((entry) => [entry.name, entry.phone, entry.email].some((value) => normalize(value || '').includes(query))).slice(0, 8) : [];
  }, [customerQuery, customers]);
  const productResults = useMemo(() => {
    const query = normalize(productQuery.trim());
    return query ? products.filter((item) => normalize(`${item.name} ${item.code} ${item.variant} ${item.barcode}`).includes(query)).slice(0, 8) : [];
  }, [productQuery, products]);

  const merchandise = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = promotion === 'sale100' ? Math.min(100000, merchandise) : promotion === 'ram50' ? items.filter(isRam).length * 50000 : 0;
  const gift = promotion === 'ramGift' && items.some(isRam);
  const vat = applyVat && vatMode === 'exclusive' ? Math.round(Math.max(0, merchandise - discount) * .1) : 0;
  const shipping = delivery === 'Giao hàng' ? Number(shippingInput || 0) * 1000 : 0;
  const total = Math.max(0, merchandise - discount + vat + shipping);
  const phoneError = recipient.phone && !validPhone(recipient.phone) ? 'Số điện thoại phải có từ 9 đến 11 chữ số.' : '';
  const missing = [!customer && 'Chưa chọn khách hàng', !items.length && 'Chưa có sản phẩm', !recipient.name.trim() && 'Thiếu tên người nhận', !recipient.phone.trim() && 'Thiếu số điện thoại', !recipient.address.trim() && 'Thiếu địa chỉ giao hàng'].filter(Boolean);
  const canSubmit = !missing.length && !phoneError && Boolean(payment);

  const chooseCustomer = (entry) => {
    setCustomer(entry); setCustomerQuery(''); setTouched({});
    setRecipient({ name: entry.address?.recipient || entry.name, phone: entry.address?.phone || entry.phone, address: entry.address?.lines?.join(', ') || '' });
  };
  const clearCustomer = () => { setCustomer(null); setRecipient({ name: '', phone: '', address: '' }); };
  const updateRecipient = (key, value) => setRecipient((current) => ({ ...current, [key]: value }));
  const addProduct = (product) => {
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
  const nextOrderId = () => {
    const largest = orders.reduce((max, order) => Math.max(max, Number(order.id?.match(/^ORD-\d{4}-(\d+)$/)?.[1] || 0)), 0);
    return `ORD-${new Date().getFullYear()}-${String(largest + 1).padStart(3, '0')}`;
  };
  const submit = () => {
    setSubmitted(true); setTouched({ name: true, phone: true, address: true });
    if (!canSubmit) return;
    const now = new Date();
    const id = nextOrderId();
    const orderProducts = items.map((item) => ({ image: item.image, name: item.name, variant: item.variant, barcode: item.barcode || item.code, unitPrice: item.unitPrice, quantity: item.quantity, subtotal: item.unitPrice * item.quantity }));
    if (gift) orderProducts.push({ image: '', name: 'Chuột tặng kèm', variant: 'Quà tặng khuyến mại', barcode: 'GIFT-MOUSE', unitPrice: 0, quantity: 1, subtotal: 0 });
    addOrder({
      id, image: items[0]?.image || '', type: 'Online', createdDate: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now), createdIso: now.toISOString().slice(0, 10), createdTime: new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
      customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, status: 'Chờ duyệt', payment: 'Chưa thanh toán', paymentMethod: payment, transactionCode: '', packing: 'Chưa đóng gói', warehouse: 'Chưa xuất kho', delivery: delivery === 'Giao hàng' ? 'Chưa giao' : 'Nhận tại cửa hàng', shippingPartnerId: null, shippingProvider: '—', trackingCode: '', shippingFee: shipping, discount, vat, total, recipient, note: note.trim() || '—', products: orderProducts, promotion: PROMOTIONS.find(([key]) => key === promotion)?.[1],
      history: [{ timestamp: formatOrderTimestamp(now), title: 'TẠO ĐƠN HÀNG', description: 'Đơn hàng được tạo tại trang quản trị', tone: 'red' }],
    });
    navigate(`/admin/don-hang/danh-sach-don-hang/${id}`);
  };

  return <div className="online-order-page">
    <div className="online-order-hero"><div><nav>ĐƠN HÀNG <span>/</span> ĐẶT HÀNG ONLINE</nav><h1>TẠO ĐƠN HÀNG ONLINE</h1><p>LÊN ĐƠN THỦ CÔNG CHO KHÁCH HÀNG VÀ KIỂM TRA GIÁ / TỒN / KHUYẾN MẠI TRƯỚC KHI LƯU</p></div><button type="button" className="online-outline-btn" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}><HiOutlineArrowLeft /> DANH SÁCH ĐƠN HÀNG</button></div>
    <div className="online-order-grid"><div className="online-order-form">
      <Section n="1" title="KHÁCH HÀNG" action={<button type="button" className="online-dark-btn" onClick={() => setCustomerModal(true)}><HiOutlinePlus /> THÊM KHÁCH HÀNG</button>}>
        {customer ? <div className="selected-customer"><div><strong>{customer.name}</strong><span>{customer.phone}</span><span>{customer.email || 'Không có email'}</span></div><button type="button" className="online-outline-btn" onClick={clearCustomer}>ĐỔI KHÁCH</button></div> : <Search value={customerQuery} onChange={setCustomerQuery} placeholder="Tìm tên / số điện thoại / email...">{customerResults.map((entry) => <button type="button" key={entry.id} className="customer-result" onClick={() => chooseCustomer(entry)}><strong>{entry.name}</strong><span>{entry.phone}{entry.email ? ` · ${entry.email}` : ''}</span></button>)}</Search>}
        {submitted && !customer && <Error>Vui lòng chọn khách hàng.</Error>}
      </Section>
      <Section n="2" title="THÔNG TIN NGƯỜI NHẬN"><div className="recipient-grid">
        <Field label="TÊN NGƯỜI NHẬN *" value={recipient.name} change={(value) => updateRecipient('name', value)} blur={() => setTouched((v) => ({ ...v, name: true }))} placeholder="Nhập họ tên" error={(touched.name || submitted) && !recipient.name.trim() ? 'Vui lòng nhập tên người nhận.' : ''} />
        <Field label="SỐ ĐIỆN THOẠI *" value={recipient.phone} change={(value) => updateRecipient('phone', value)} blur={() => setTouched((v) => ({ ...v, phone: true }))} placeholder="0901 234 567" error={(touched.phone || submitted) ? (!recipient.phone.trim() ? 'Vui lòng nhập số điện thoại.' : phoneError) : ''} />
        <Field wide label="ĐỊA CHỈ GIAO HÀNG *" value={recipient.address} change={(value) => updateRecipient('address', value)} blur={() => setTouched((v) => ({ ...v, address: true }))} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..." error={(touched.address || submitted) && !recipient.address.trim() ? 'Vui lòng nhập địa chỉ giao hàng.' : ''} />
      </div></Section>
      <Section n="3" title="SẢN PHẨM">
        <Search value={productQuery} onChange={setProductQuery} placeholder="Tìm mã / tên / phiên bản / mã vạch...">{productResults.map((product) => <button type="button" key={product.id} className="product-result" onClick={() => addProduct(product)}><span><strong>{product.name}</strong><small>{product.code} · {product.variant}{product.barcode ? ` · ${product.barcode}` : ''}</small></span><span><b>{formatMoney(product.unitPrice)}</b><small>Tồn: {product.stock}</small></span></button>)}</Search>
        {!items.length ? <p className="product-empty">CHƯA CÓ SẢN PHẨM — TÌM VÀ THÊM SẢN PHẨM VÀO ĐƠN</p> : <LineTable items={items} gift={gift} change={changeQuantity} remove={(id) => setItems((current) => current.filter((item) => item.id !== id))} />}
        {stockNote && <p className="stock-note">{stockNote}</p>}{submitted && !items.length && <Error>Vui lòng thêm ít nhất một sản phẩm.</Error>}
      </Section>
      <Section n="4" title="KHUYẾN MẠI"><label className="online-field"><span>CHƯƠNG TRÌNH ÁP DỤNG</span><select value={promotion} onChange={(event) => setPromotion(event.target.value)}>{PROMOTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></Section>
      <Section n="5" title="THANH TOÁN"><p className="field-label">PHƯƠNG THỨC THANH TOÁN *</p><div className="toggle-row"><Toggle active={payment === 'Tiền mặt'} click={() => setPayment('Tiền mặt')}>TIỀN MẶT</Toggle><Toggle active={payment !== 'Tiền mặt'} click={() => setPayment('Chuyển khoản ngân hàng')}>CHUYỂN KHOẢN</Toggle></div><div className="form-divider" /><p className="field-label">THUẾ VAT</p><label className="check-row"><input type="checkbox" checked={applyVat} onChange={(event) => setApplyVat(event.target.checked)} /> Áp dụng VAT</label>{applyVat && <div className="toggle-row vat-toggles"><Toggle active={vatMode === 'exclusive'} click={() => setVatMode('exclusive')}>CHƯA BAO GỒM THUẾ</Toggle><Toggle active={vatMode === 'inclusive'} click={() => setVatMode('inclusive')}>ĐÃ BAO GỒM THUẾ</Toggle></div>}</Section>
      <Section n="6" title="HÌNH THỨC NHẬN HÀNG"><div className="toggle-row"><Toggle active={delivery === 'Nhận tại cửa hàng'} click={() => setDelivery('Nhận tại cửa hàng')}>NHẬN TẠI CỬA HÀNG</Toggle><Toggle active={delivery === 'Giao hàng'} click={() => setDelivery('Giao hàng')}>GIAO HÀNG</Toggle></div>{delivery === 'Giao hàng' && <label className="online-field shipping-field"><span>PHÍ GIAO HÀNG (đ)</span><div className="money-input"><PriceInput value={shippingInput} onChange={setShippingInput} /><i>đ</i></div></label>}</Section>
      <Section n="7" title="GHI CHÚ"><textarea className="notes-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cho đơn hàng..." /></Section>
    </div><Summary merchandise={merchandise} discount={discount} showVat={applyVat && vatMode === 'exclusive'} vat={vat} shipping={shipping} total={total} missing={missing} phoneError={phoneError && recipient.phone} canSubmit={canSubmit} submit={submit} /></div>
    <AddCustomerModal open={customerModal} onClose={() => setCustomerModal(false)} onCreated={chooseCustomer} />
  </div>;
}

function Section({ n, title, action, children }) { return <section className="online-section"><header><h2>{n}. {title}</h2>{action}</header><div className="online-section__body">{children}</div></section>; }
function Search({ value, onChange, placeholder, children }) { return <div className="search-combobox"><label><HiOutlineSearch /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>{value && <div className="search-results">{children?.length ? children : <p>Không tìm thấy kết quả phù hợp.</p>}</div>}</div>; }
function Field({ label, value, change, blur, placeholder, error, wide }) { return <label className={`online-field ${wide ? 'online-field--wide' : ''} ${error ? 'online-field--error' : ''}`}><span>{label}</span><input value={value} onChange={(event) => change(event.target.value)} onBlur={blur} placeholder={placeholder} />{error && <small>{error}</small>}</label>; }
function Toggle({ active, click, children }) { return <button type="button" className={`online-toggle ${active ? 'is-active' : ''}`} onClick={click}>{children}</button>; }
function Error({ children }) { return <p className="inline-error">{children}</p>; }
function LineTable({ items, gift, change, remove }) { return <div className="line-table-wrap"><table className="line-table"><thead><tr><th>SẢN PHẨM</th><th>ĐƠN GIÁ</th><th>SỐ LƯỢNG</th><th>THÀNH TIỀN</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code} · {item.variant}</small></td><td>{formatMoney(item.unitPrice)}</td><td><div className="quantity-control"><button type="button" onClick={() => change(item.id, item.quantity - 1)}>−</button><input aria-label={`Số lượng ${item.name}`} type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => change(item.id, event.target.value)} /><button type="button" onClick={() => change(item.id, item.quantity + 1)}>+</button></div></td><td className="line-total">{formatMoney(item.unitPrice * item.quantity)}</td><td><button type="button" className="remove-line" onClick={() => remove(item.id)}>XÓA</button></td></tr>)}{gift && <tr className="gift-row"><td><strong>Chuột tặng kèm</strong><small>Quà tặng khuyến mại</small></td><td>0đ</td><td>1</td><td className="line-total">0đ</td><td><span>QUÀ TẶNG</span></td></tr>}</tbody></table></div>; }
function Summary({ merchandise, discount, showVat, vat, shipping, total, missing, phoneError, canSubmit, submit }) { return <aside className="order-summary"><h2>TỔNG KẾT ĐƠN HÀNG</h2><div className="summary-body"><SummaryLine label="Tiền hàng" value={formatMoney(merchandise)} /><SummaryLine label="Chiết khấu" value={discount ? `−${formatMoney(discount)}` : '—'} red={discount > 0} />{showVat && <SummaryLine label="VAT" value={formatMoney(vat)} />}<SummaryLine label="Phí giao hàng" value={shipping ? formatMoney(shipping) : '—'} /><div className="summary-total"><strong>KHÁCH PHẢI TRẢ</strong><b>{formatMoney(total)}</b></div>{missing.length > 0 && <ul className="missing-list">{missing.map((item) => <li key={item}>- {item}</li>)}</ul>}{phoneError && <p className="summary-error">- Số điện thoại chưa hợp lệ</p>}<button type="button" className="submit-order" disabled={!canSubmit} onClick={submit}>ĐẶT HÀNG</button></div></aside>; }
function SummaryLine({ label, value, red }) { return <div className="summary-line"><span>{label}</span><strong className={red ? 'is-red' : ''}>{value}</strong></div>; }
