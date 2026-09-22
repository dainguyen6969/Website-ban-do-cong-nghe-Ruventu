import { useRef, useState } from 'react';
import { HiOutlineCheck, HiOutlinePlus, HiOutlineSearch, HiOutlineShoppingCart, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import { getSalesProducts, mockCustomers, mockEmployees, priceLists } from '../data/mockSales';
import { addProduct, closeOrderTab, createOrder, finalizeOrder, orderTotals, resetOrder, updateOrder } from './salesState';
import PaymentSuccessModal from '../components/PaymentSuccessModal';
import './BanHang.css';

const money = (value) => `${Number(value).toLocaleString('vi-VN')}đ`;
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

function Heading({ children }) { return <h2 className="pos-heading">{children}</h2>; }

export default function BanHang() {
  const [orders, setOrders] = useState(() => [createOrder(1)]);
  const [activeId, setActiveId] = useState(1);
  const sequence = useRef(1);
  const [products] = useState(getSalesProducts);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productFocused, setProductFocused] = useState(false);
  const [customerFocused, setCustomerFocused] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const order = orders.find((item) => item.id === activeId);
  const totals = orderTotals(order);
  const patch = (change) => setOrders((current) => current.map((item) => item.id === activeId ? updateOrder(item, typeof change === 'function' ? change(item) : change) : item));
  const clearSearch = () => { setProductSearch(''); setCustomerSearch(''); setProductFocused(false); setCustomerFocused(false); };
  const newOrder = () => {
    const next = createOrder(++sequence.current);
    setOrders((current) => [...current, next]); setActiveId(next.id); clearSearch();
  };
  const closeTab = (id) => {
    const next = closeOrderTab(orders, activeId, id, orders.length === 1 ? ++sequence.current : sequence.current);
    setOrders(next.orders); setActiveId(next.activeId);
    if (id === activeId) clearSearch();
  };
  const dismissPayment = (print = false) => {
    if (!receipt) return;
    if (print) console.log('printing invoice', receipt);
    setOrders((current) => current.map((item) => item.id === receipt.id ? resetOrder(item) : item));
    setReceipt(null); clearSearch();
  };
  const results = productSearch.trim() ? products.filter((product) => normalize(`${product.tenSanPham} ${product.maSanPham} ${product.danhMuc}`).includes(normalize(productSearch.trim()))) : [];
  const customers = customerSearch.trim() ? mockCustomers.filter((customer) => normalize(customer.name).includes(normalize(customerSearch.trim())) || customer.phone.replace(/\s/g, '').includes(customerSearch.replace(/\s/g, ''))) : [];
  const selectProduct = (product) => { patch((current) => ({ cart: addProduct(current.cart, product) })); setProductSearch(''); setProductFocused(false); };
  const selectCustomer = (customer) => { patch({ customer, priceList: customer.priceList }); setCustomerSearch(''); setCustomerFocused(false); };
  const changeQuantity = (id, delta) => patch((current) => ({ cart: current.cart.map((item) => item.product.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item) }));
  const checkout = () => {
    if (!order.cart.length) return;
    const finalized = finalizeOrder(order);
    console.log('ĐƠN HÀNG ĐÃ THANH TOÁN', finalized);
    setReceipt(finalized);
  };

  return <main className="pos-page">
    <div className="pos-toolbar"><button type="button" className="pos-red-button" onClick={newOrder}><HiOutlinePlus /> TẠO HOÁ ĐƠN</button></div>
    <div className="pos-tabs" aria-label="Đơn hàng">
      {orders.map((item) => <div key={item.id} className={`pos-order-tab ${item.id === activeId ? 'is-active' : ''}`}><button type="button" aria-pressed={item.id === activeId} onClick={() => { setActiveId(item.id); clearSearch(); }}>{item.code}</button><button type="button" className="pos-close-tab" aria-label={`Đóng đơn ${item.code}`} onClick={() => closeTab(item.id)}><HiOutlineX /></button></div>)}
      <button type="button" className="pos-new-tab" onClick={newOrder}><HiOutlinePlus /> ĐƠN MỚI</button>
    </div>
    <div className="pos-columns">
      <aside className="pos-left">
        <section className="pos-block pos-customer"><Heading>Khách hàng</Heading>
          {order.customer ? <div className="pos-customer-card"><strong>{order.customer.name}</strong><a href={`tel:${order.customer.phone.replace(/\s/g, '')}`}>{order.customer.phone}</a><span>{order.customer.type}</span><button type="button" aria-label="Bỏ chọn khách hàng" onClick={() => patch({ customer: null })}><HiOutlineX /></button></div> : <div onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCustomerFocused(false); }} onKeyDown={(event) => { if (event.key === 'Escape') setCustomerFocused(false); }}>
            <input aria-label="Tìm khách hàng" placeholder="Tên hoặc số điện thoại..." value={customerSearch} onFocus={() => setCustomerFocused(true)} onChange={(event) => { setCustomerSearch(event.target.value); setCustomerFocused(true); }} />
            {customerFocused && customerSearch.trim() && <div className="pos-customer-results">{customers.map((customer) => <button type="button" key={customer.id} onClick={() => selectCustomer(customer)}><strong>{customer.name}</strong><small>{customer.phone} · {customer.type}</small></button>)}{!customers.length && <p>Không tìm thấy khách hàng.</p>}</div>}
          </div>}
        </section>
        <section className="pos-block pos-tax"><span>Áp dụng thuế</span><button type="button" role="switch" aria-label="Áp dụng thuế" aria-checked={order.tax} className={`pos-switch ${order.tax ? 'is-on' : ''}`} onClick={() => patch({ tax: !order.tax })}><span /></button></section>
        <label className="pos-block pos-field"><span>Bảng giá</span><select value={order.priceList} onChange={(event) => patch({ priceList: event.target.value })}>{priceLists.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="pos-block pos-field"><span>Nhân viên thanh toán</span><select value={order.employee} onChange={(event) => patch({ employee: event.target.value })}><option value="">Chọn nhân viên</option>{mockEmployees.map((employee) => <option key={employee}>{employee}</option>)}</select></label>
      </aside>
      <section className="pos-middle" aria-label="Sản phẩm trong đơn">
        <div className="pos-search-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProductFocused(false); }} onKeyDown={(event) => { if (event.key === 'Escape') setProductFocused(false); }}>
          <div className={`pos-search ${productFocused && productSearch.trim() ? 'is-active' : ''}`}><HiOutlineSearch /><input aria-label="Tìm sản phẩm" placeholder="Tìm sản phẩm theo tên, SKU, danh mục..." value={productSearch} onFocus={() => setProductFocused(true)} onChange={(event) => { setProductSearch(event.target.value); setProductFocused(true); }} />{productSearch && <button type="button" aria-label="Xóa tìm kiếm sản phẩm" onClick={() => setProductSearch('')}><HiOutlineX /></button>}</div>
          {productFocused && productSearch.trim() && <div className="pos-product-results">{results.map((product) => <button type="button" key={product.id} onClick={() => selectProduct(product)}><span><strong>{product.tenSanPham}</strong><small>{product.maSanPham}{product.danhMuc && ` · ${product.danhMuc}`}</small></span><span className="pos-result-price"><strong>{money(product.prices[order.priceList])}</strong><small>{order.tax ? `+${product.vatRate}% VAT` : 'Miễn thuế'}</small></span></button>)}{!results.length && <p>Không tìm thấy sản phẩm.</p>}</div>}
        </div>
        <div className="pos-cart-scroll"><table className="pos-cart"><thead><tr><th>STT</th><th>Tên sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thuế</th><th>Thành tiền</th><th><span className="pos-sr-only">Xóa</span></th></tr></thead><tbody>
          {order.cart.map(({ product, quantity }, index) => {
            const price = product.prices[order.priceList];
            const subtotal = price * quantity;
            const lineTotal = subtotal + (order.tax ? Math.round(subtotal * product.vatRate / 100) : 0);
            return <tr key={product.id}><td>{index + 1}</td><td><strong>{product.tenSanPham}</strong><small>{product.maSanPham}</small></td><td><div className="pos-stepper"><button type="button" aria-label={`Giảm số lượng ${product.tenSanPham}`} disabled={quantity === 1} onClick={() => changeQuantity(product.id, -1)}>−</button><span>{quantity}</span><button type="button" aria-label={`Tăng số lượng ${product.tenSanPham}`} onClick={() => changeQuantity(product.id, 1)}>+</button></div></td><td className="pos-price">{money(price)}</td><td>{order.tax && <span className="pos-vat-badge">{product.vatRate}%</span>}</td><td className="pos-line-total">{money(lineTotal)}</td><td><button type="button" className="pos-remove" aria-label={`Xóa ${product.tenSanPham}`} onClick={() => patch((current) => ({ cart: current.cart.filter((item) => item.product.id !== product.id) }))}><HiOutlineTrash /></button></td></tr>;
          })}
        </tbody></table>
        {!order.cart.length && <div className="pos-empty"><HiOutlineShoppingCart /><strong>CHƯA CÓ SẢN PHẨM</strong><p>Tìm và thêm sản phẩm ở thanh tìm kiếm phía trên</p></div>}
        </div>
      </section>
      <aside className="pos-right">
        <section className="pos-block pos-summary"><Heading>Tổng đơn hàng</Heading><div><span>Tạm tính</span><strong>{money(totals.subtotal)}</strong></div><div><span>Thuế VAT</span><strong>{order.tax ? money(totals.vat) : 'Miễn thuế'}</strong></div><label className="pos-discount"><span>Chiết khấu (%)</span><span><input aria-label="Chiết khấu (%)" type="number" min="0" max="100" value={order.discount} onChange={(event) => patch({ discount: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} /><i>%</i></span></label>{order.discount > 0 && <div className="pos-discount-amount"><span>Giảm giá</span><strong>-{money(totals.discountAmount)}</strong></div>}<div className="pos-total"><strong>TỔNG TIỀN</strong><strong>{money(totals.total)}</strong></div></section>
        <section className="pos-block pos-field"><span>Phương thức thanh toán</span><div className="pos-payment-method">{[['cash', 'Tiền mặt'], ['transfer', 'Chuyển khoản']].map(([id, label]) => <button type="button" key={id} aria-pressed={order.paymentMethod === id} className={order.paymentMethod === id ? 'is-selected' : ''} onClick={() => patch({ paymentMethod: id })}>{label}</button>)}</div></section>
        <label className="pos-block pos-field"><span>Tiền khách trả</span><div className="pos-paid"><input aria-label="Tiền khách trả" inputMode="numeric" value={Number(order.paid).toLocaleString('vi-VN')} onChange={(event) => patch({ paid: Number(event.target.value.replace(/\D/g, '')) || 0 })} /><span>đ</span></div></label>
        <div className="pos-checkout"><button type="button" className="pos-red-button" disabled={!order.cart.length} onClick={checkout}><HiOutlineCheck /> THANH TOÁN</button><small>Đơn hoàn thành ngay sau khi thanh toán.</small></div>
      </aside>
    </div>
    {receipt && <PaymentSuccessModal receipt={receipt} onDismiss={dismissPayment} />}
  </main>;
}
