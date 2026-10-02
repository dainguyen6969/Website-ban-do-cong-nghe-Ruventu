// Admin point-of-sale screen.
import { useEffect, useRef, useState } from 'react';
import { HiOutlineCheck, HiOutlinePlus, HiOutlineSearch, HiOutlineShoppingCart, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import { getSerialPage } from '../../inventory/api/serialApi';
import { createSalesCustomer, getSalesOptions, previewPosOrder, searchSalesCustomers, searchSalesProducts } from '../../orders/api/onlineOrderApi';
import { addProduct, closeOrderTab, createOrder, finalizeOrder, findIncompleteSerialLine, findStockIssue, orderTotals, resetOrder, setProductQuantity, updateOrder } from '../state/salesState';
import PaymentSuccessModal from '../components/PaymentSuccessModal';
import './BanHang.css';

const money = (value) => `${Number(value).toLocaleString('vi-VN')}đ`;
const productName = (product) => product.name || product.tenSanPham;
const productCode = (product) => [product.code || product.maSanPham, product.variant].filter(Boolean).join(' · ');
const productPrice = (product, priceList) => Number(product.unitPrice ?? product.prices?.[priceList] ?? 0);

function Heading({ children }) { return <h2 className="pos-heading">{children}</h2>; }

function PosDialog({ children, className, labelledBy, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className={className} aria-labelledby={labelledBy} onCancel={(event) => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}

export default function BanHang() {
  const [orders, setOrders] = useState(() => [createOrder(1)]);
  const [activeId, setActiveId] = useState(1);
  const sequence = useRef(1);
  const serialRequest = useRef(0);
  const [salesOptions, setSalesOptions] = useState(null);
  const [optionsError, setOptionsError] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productStatus, setProductStatus] = useState('idle');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerStatus, setCustomerStatus] = useState('idle');
  const [productFocused, setProductFocused] = useState(false);
  const [customerFocused, setCustomerFocused] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);
  const [customerCreateError, setCustomerCreateError] = useState('');
  const [serialModal, setSerialModal] = useState(null);
  const [serialSearch, setSerialSearch] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const order = orders.find((item) => item.id === activeId);
  const totals = orderTotals(order);
  useEffect(() => {
    const controller = new AbortController();
    getSalesOptions(controller.signal).then((data) => {
      setSalesOptions(data);
      setOrders((current) => current.map((item) => item.employee ? item : { ...item, employee: data.nhan_vien_mac_dinh }));
    }).catch((error) => { if (error.name !== 'AbortError') setOptionsError(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const keyword = customerSearch.trim();
    if (!keyword) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try { setCustomerResults(await searchSalesCustomers(keyword, controller.signal)); setCustomerStatus('done'); }
      catch (error) { if (error.name !== 'AbortError') { setCustomerResults([]); setCustomerStatus('error'); } }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [customerSearch]);
  useEffect(() => {
    const keyword = productSearch.trim();
    if (!keyword || !salesOptions) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try { const results = await searchSalesProducts(keyword, salesOptions, controller.signal); setProductResults(results); setOrders((current) => current.map((entry) => ({ ...entry, cart: entry.cart.map((line) => ({ ...line, product: results.find((product) => product.id === line.product.id) || line.product })) }))); setProductStatus('done'); }
      catch (error) { if (error.name !== 'AbortError') { setProductResults([]); setProductStatus('error'); } }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [productSearch, salesOptions]);
  const patch = (change) => setOrders((current) => current.map((item) => item.id === activeId ? updateOrder(item, typeof change === 'function' ? change(item) : change) : item));
  const clearSearch = () => { setProductSearch(''); setCustomerSearch(''); setProductFocused(false); setCustomerFocused(false); };
  const newOrder = () => {
    const next = createOrder(++sequence.current, salesOptions?.nhan_vien_mac_dinh || order.employee);
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
  const selectProduct = (product) => { patch((current) => ({ cart: addProduct(current.cart, product) })); setProductSearch(''); setProductFocused(false); };
  const selectCustomer = (customer) => { patch({ customer }); setCustomerSearch(''); setCustomerFocused(false); };
  const openCustomerModal = () => {
    const value = customerSearch.trim();
    const phone = /^[\d\s.+-]+$/.test(value) ? value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '') : '';
    setCustomerModal({ name: phone ? '' : value, phone }); setCustomerCreateError(''); setCustomerFocused(false);
  };
  const submitCustomer = async (event) => {
    event.preventDefault();
    setCustomerCreateError(''); setCustomerModal((current) => ({ ...current, saving: true }));
    try {
      const customer = await createSalesCustomer(customerModal);
      selectCustomer(customer); setCustomerModal(null);
    } catch (error) {
      setCustomerCreateError(error.message || 'Không thể tạo khách hàng.');
      setCustomerModal((current) => current && ({ ...current, saving: false }));
    }
  };
  const changeQuantity = (id, quantity) => patch((current) => ({ cart: setProductQuantity(current.cart, id, quantity) }));
  const openSerialModal = async (line) => {
    const request = ++serialRequest.current;
    setSerialSearch(''); setSerialModal({ productId: line.product.id, loading: true, candidates: [], total: 0, error: '' });
    try {
      const first = await getSerialPage({ page: 1, limit: 100, status: 'TRONG_KHO', versionId: line.product.id });
      const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => getSerialPage({ page: index + 2, limit: 100, status: 'TRONG_KHO', versionId: line.product.id })));
      const data = { ...first, items: [first, ...rest].flatMap((page) => page.items) };
      if (request !== serialRequest.current) return;
      setSerialModal({ productId: line.product.id, loading: false, candidates: data.items, total: data.totalItems, error: '' });
      patch((current) => ({ cart: current.cart.map((item) => item.product.id === line.product.id ? { ...item, serialAvailable: data.totalItems } : item) }));
    } catch { if (request === serialRequest.current) setSerialModal({ productId: line.product.id, loading: false, candidates: [], total: 0, error: 'Không thể tải serial khả dụng.' }); }
  };
  const closeSerialModal = () => { serialRequest.current += 1; setSerialModal(null); };
  const serialIssue = findIncompleteSerialLine(order.cart);
  const stockIssue = findStockIssue(order.cart);
  const transactionMissing = order.paymentMethod !== 'cash' && !(order.transactionCode || '').trim();
  const serialLine = serialModal && order.cart.find((item) => item.product.id === serialModal.productId);
  const shownSerials = serialModal?.candidates.filter((item) => item.serial.toLowerCase().includes(serialSearch.trim().toLowerCase())) || [];
  const toggleSerial = (candidate) => patch((current) => ({ cart: current.cart.map((item) => {
    if (item.product.id !== serialModal.productId) return item;
    const selected = item.serials || [];
    if (selected.some((serial) => serial.id === candidate.id)) return { ...item, serials: selected.filter((serial) => serial.id !== candidate.id) };
    return selected.length < item.quantity ? { ...item, serials: [...selected, candidate] } : item;
  }) }));
  const checkout = async () => {
    if (!order.cart.length || serialIssue || stockIssue || transactionMissing || !salesOptions) return;
    setCheckoutError('');
    try {
      await previewPosOrder(order, salesOptions);
      const finalized = finalizeOrder(order);
      console.log('ĐƠN HÀNG ĐÃ THANH TOÁN', finalized);
      setReceipt(finalized);
    } catch (error) { setCheckoutError(error.message); }
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
          {order.customer ? <div className="pos-customer-card"><strong>{order.customer.name}</strong>{order.customer.phone && <a href={`tel:${order.customer.phone.replace(/\s/g, '')}`}>{order.customer.phone}</a>}{order.customer.email && <span>{order.customer.email}</span>}<button type="button" aria-label="Chọn Khách lẻ" onClick={() => patch({ customer: null })}><HiOutlineX /></button></div> : <div onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCustomerFocused(false); }} onKeyDown={(event) => { if (event.key === 'Escape') setCustomerFocused(false); }}>
            <em className="pos-customer-guest">KHÁCH LẺ</em>
            <input aria-label="Tìm khách hàng" placeholder="TÌM TÊN / SĐT / EMAIL..." value={customerSearch} onFocus={() => setCustomerFocused(true)} onKeyDown={(event) => { if (event.key === 'Enter' && customerStatus === 'done' && !customerResults.length) { event.preventDefault(); openCustomerModal(); } }} onChange={(event) => { const value = event.target.value; setCustomerSearch(value); setCustomerResults([]); setCustomerStatus(value.trim() ? 'loading' : 'idle'); setCustomerFocused(true); }} />
            {customerFocused && customerSearch.trim() && <div className="pos-customer-results">{customerStatus === 'loading' && <p>Đang tìm khách hàng...</p>}{customerStatus === 'error' && <p>Không thể tải khách hàng. Vui lòng thử lại.</p>}{customerStatus === 'done' && customerResults.map((customer) => <button type="button" key={customer.id} onClick={() => selectCustomer(customer)}><strong>{customer.name}</strong><small>{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'Không có thông tin liên hệ'}</small></button>)}{customerStatus === 'done' && !customerResults.length && <p>Không tìm thấy khách hàng.</p>}<button type="button" className="pos-customer-new-result" onClick={openCustomerModal}>+ TẠO KHÁCH HÀNG MỚI</button></div>}
          </div>}
          {!order.customer && <button type="button" className="pos-customer-create" onClick={openCustomerModal}>+ TẠO KHÁCH HÀNG MỚI</button>}
        </section>
        <section className="pos-block pos-tax"><div><span>Áp dụng VAT</span>{order.tax && <label className="pos-vat-mode"><span>Chế độ giá</span><select value={order.taxMode || 'CHUA_BAO_GOM'} onChange={(event) => patch({ taxMode: event.target.value })}><option value="CHUA_BAO_GOM">CHƯA BAO GỒM THUẾ</option><option value="DA_BAO_GOM">ĐÃ BAO GỒM THUẾ</option></select></label>}</div><button type="button" role="switch" aria-label="Áp dụng VAT" aria-checked={order.tax} className={`pos-switch ${order.tax ? 'is-on' : ''}`} onClick={() => patch({ tax: !order.tax })}><span /></button></section>
        <div className="pos-block pos-readonly"><span>Bảng giá</span><strong>Giá lẻ</strong></div>
        <div className="pos-block pos-readonly"><span>Nhân viên thanh toán</span><strong>{order.employee?.ho_ten || 'Đang tải phiên đăng nhập...'}</strong></div>
        <label className="pos-block pos-field"><span>Ghi chú</span><textarea value={order.note || ''} onChange={(event) => patch({ note: event.target.value })} /></label>
      </aside>
      <section className="pos-middle" aria-label="Sản phẩm trong đơn">
        <div className="pos-search-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProductFocused(false); }} onKeyDown={(event) => { if (event.key === 'Escape') setProductFocused(false); }}>
          <div className={`pos-search ${productFocused && productSearch.trim() ? 'is-active' : ''}`}><HiOutlineSearch /><input aria-label="Tìm sản phẩm" placeholder="TÌM MÃ / TÊN / PHIÊN BẢN / MÃ VẠCH..." value={productSearch} onFocus={() => setProductFocused(true)} onChange={(event) => { setProductSearch(event.target.value); setProductResults([]); setProductStatus(event.target.value.trim() ? 'loading' : 'idle'); setProductFocused(true); }} />{productSearch && <button type="button" aria-label="Xóa tìm kiếm sản phẩm" onClick={() => setProductSearch('')}><HiOutlineX /></button>}</div>
          {productFocused && productSearch.trim() && <div className="pos-product-results">{productStatus === 'loading' && !optionsError && <p>Đang tìm sản phẩm...</p>}{(productStatus === 'error' || optionsError) && <p>Không thể tải sản phẩm. Vui lòng thử lại.</p>}{productStatus === 'done' && productResults.map((product) => <button type="button" key={product.id} disabled={product.stock < 1} onClick={() => selectProduct(product)}><span><strong>{productName(product)}</strong><small>{productCode(product)}</small><small>CÒN BÁN: {product.stock}{product.serialManaged && <b className="pos-serial-required">YÊU CẦU SERIAL</b>}</small></span><span className="pos-result-price"><strong>{money(productPrice(product, order.priceList))}</strong></span></button>)}{productStatus === 'done' && !productResults.length && <p>Không tìm thấy sản phẩm.</p>}</div>}
        </div>
        <div className="pos-cart-scroll"><table className="pos-cart"><thead><tr><th>STT</th><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>VAT</th><th>Chiết khấu</th><th>Thành tiền</th><th>Serial</th><th><span className="pos-sr-only">Xóa</span></th></tr></thead><tbody>
          {order.cart.map(({ product, quantity, serials = [], serialAvailable }, index) => {
            const price = productPrice(product, order.priceList);
            const subtotal = price * quantity;
            const lineTotal = subtotal + (order.tax && (order.taxMode || 'CHUA_BAO_GOM') === 'CHUA_BAO_GOM' ? Math.round(subtotal * product.vatRate / 100) : 0);
            return <tr key={product.id}><td>{index + 1}</td><td><strong>{productName(product)}</strong><small>{productCode(product)}</small>{quantity > product.stock && <small className="pos-inline-error">Số lượng vượt tồn có thể bán ({product.stock}).</small>}</td><td><div className="pos-stepper"><button type="button" aria-label={`Giảm số lượng ${productName(product)}`} disabled={quantity === 1} onClick={() => changeQuantity(product.id, quantity - 1)}>−</button><input aria-label={`Số lượng ${productName(product)}`} type="number" inputMode="numeric" min="1" max={product.stock} value={quantity} onChange={(event) => changeQuantity(product.id, event.target.value)} /><button type="button" aria-label={`Tăng số lượng ${productName(product)}`} disabled={quantity >= product.stock} onClick={() => changeQuantity(product.id, quantity + 1)}>+</button></div></td><td className="pos-price">{money(price)}</td><td>{order.tax && <span className="pos-vat-badge">{product.vatRate}%</span>}</td><td>—</td><td className="pos-line-total">{money(lineTotal)}</td><td>{product.serialManaged && <button type="button" className={`pos-serial-badge ${serials.length === quantity ? 'is-complete' : ''}`} onClick={() => openSerialModal({ product, quantity, serials, serialAvailable })}>{serials.length}/{quantity} SERIAL</button>}{serials.map((serial) => <small key={serial.id}>{serial.serial}</small>)}</td><td><button type="button" className="pos-remove" aria-label={`Xóa ${productName(product)}`} onClick={() => patch((current) => ({ cart: current.cart.filter((item) => item.product.id !== product.id) }))}><HiOutlineTrash /></button></td></tr>;
          })}
        </tbody></table>
        {!order.cart.length && <div className="pos-empty"><HiOutlineShoppingCart /><strong>CHƯA CÓ SẢN PHẨM</strong><p>Tìm và thêm sản phẩm ở thanh tìm kiếm phía trên</p></div>}
        </div>
      </section>
      <aside className="pos-right">
        <section className="pos-block pos-summary"><Heading>Tổng đơn hàng</Heading><div><span>Tạm tính</span><strong>{money(totals.subtotal)}</strong></div><div><span>Thuế VAT</span><strong>{order.tax ? money(totals.vat) : 'Miễn thuế'}</strong></div><label className="pos-discount"><span>Chiết khấu (%)</span><span><input aria-label="Chiết khấu (%)" type="number" min="0" max="100" value={order.discount} onChange={(event) => patch({ discount: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} /><i>%</i></span></label>{order.discount > 0 && <div className="pos-discount-amount"><span>Giảm giá</span><strong>-{money(totals.discountAmount)}</strong></div>}<div className="pos-total"><strong>TỔNG TIỀN</strong><strong>{money(totals.total)}</strong></div></section>
        <section className="pos-block pos-field"><span>Phương thức thanh toán</span><div className="pos-payment-method">{[['cash', 'TIỀN MẶT'], ['transfer', 'CHUYỂN KHOẢN'], ['card', 'THẺ']].map(([id, label]) => <button type="button" key={id} aria-pressed={order.paymentMethod === id} className={order.paymentMethod === id ? 'is-selected' : ''} onClick={() => patch({ paymentMethod: id })}>○ {label}</button>)}</div></section>
        <label className="pos-block pos-field"><span>{order.paymentMethod === 'cash' ? 'Tiền khách đưa' : 'Số tiền đã nhận'}</span><div className="pos-paid"><input aria-label={order.paymentMethod === 'cash' ? 'Tiền khách đưa' : 'Số tiền đã nhận'} inputMode="numeric" value={Number(order.paid).toLocaleString('vi-VN')} onChange={(event) => patch({ paid: Number(event.target.value.replace(/\D/g, '')) || 0 })} /><span>đ</span></div>{order.paymentMethod === 'cash' && <small className="pos-change">TIỀN THỪA TRẢ KHÁCH <strong>{money(Math.max(0, order.paid - totals.total))}</strong></small>}</label>
        {order.paymentMethod !== 'cash' && <label className="pos-block pos-field"><span>Mã giao dịch *</span><input aria-label="Mã giao dịch" placeholder="Nhập mã giao dịch..." value={order.transactionCode || ''} onChange={(event) => patch({ transactionCode: event.target.value })} /></label>}
        <div className="pos-checkout">{stockIssue && <p className="pos-error">Số lượng {productName(stockIssue.product)} vượt tồn có thể bán ({stockIssue.product.stock}).</p>}{serialIssue && <p className="pos-error">{Number.isFinite(serialIssue.serialAvailable) && serialIssue.quantity > serialIssue.serialAvailable ? `Chỉ có ${serialIssue.serialAvailable} serial khả dụng, cần ${serialIssue.quantity}` : 'Cần chọn đủ serial trước khi thanh toán'}</p>}{transactionMissing && <p className="pos-error">Vui lòng nhập mã giao dịch</p>}{checkoutError && <p className="pos-error">{checkoutError}</p>}<button type="button" className="pos-red-button" disabled={!order.cart.length || Boolean(serialIssue) || Boolean(stockIssue) || transactionMissing} onClick={checkout}><HiOutlineCheck /> THANH TOÁN</button><small>Đơn hoàn thành ngay sau khi thanh toán.</small></div>
      </aside>
    </div>
    {customerModal && <PosDialog className="pos-form-modal" labelledBy="pos-create-customer-title" onClose={() => setCustomerModal(null)}><header><h2 id="pos-create-customer-title">TẠO KHÁCH HÀNG MỚI</h2></header><form onSubmit={submitCustomer}><label>HỌ TÊN *<input required autoFocus disabled={customerModal.saving} placeholder="Nhập họ tên..." value={customerModal.name} onChange={(event) => setCustomerModal({ ...customerModal, name: event.target.value })} /></label><label>SỐ ĐIỆN THOẠI *<input required type="tel" disabled={customerModal.saving} placeholder="Nhập số điện thoại..." value={customerModal.phone} onChange={(event) => setCustomerModal({ ...customerModal, phone: event.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '') })} /></label>{customerCreateError && <p className="pos-error">{customerCreateError}</p>}<footer><button type="button" disabled={customerModal.saving} onClick={() => setCustomerModal(null)}>HỦY</button><button type="submit" disabled={customerModal.saving}>{customerModal.saving ? 'ĐANG LƯU...' : 'TẠO KHÁCH HÀNG'}</button></footer></form></PosDialog>}
    {serialModal && serialLine && <PosDialog className="pos-form-modal pos-serial-modal" labelledBy="pos-serial-title" onClose={closeSerialModal}><header><div><h2 id="pos-serial-title">CHỌN SERIAL</h2><small>{productName(serialLine.product)} — CẦN {serialLine.quantity} SERIAL, ĐÃ CHỌN {serialLine.serials?.length || 0}</small></div><button type="button" aria-label="Đóng" onClick={closeSerialModal}><HiOutlineX /></button></header><div className="pos-serial-body"><input autoFocus placeholder="QUÉT / NHẬP SERIAL..." value={serialSearch} onChange={(event) => setSerialSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const exact = shownSerials.find((item) => item.serial.toLowerCase() === serialSearch.trim().toLowerCase()); if (exact) { toggleSerial(exact); setSerialSearch(''); } } }} />{serialModal.loading && <p>Đang tải serial...</p>}{serialModal.error && <p className="pos-error">{serialModal.error}</p>}{!serialModal.loading && serialLine.quantity > serialModal.total && <p className="pos-error">Chỉ có {serialModal.total} serial khả dụng, cần {serialLine.quantity}</p>}<div className="pos-serial-list">{shownSerials.map((candidate) => { const selected = serialLine.serials?.some((item) => item.id === candidate.id); return <button type="button" key={candidate.id} className={selected ? 'is-selected' : ''} onClick={() => toggleSerial(candidate)}><strong>{candidate.serial}</strong>{selected && <span>✓ ĐÃ CHỌN</span>}</button>; })}</div></div><footer><button type="button" disabled={(serialLine.serials?.length || 0) !== serialLine.quantity || serialLine.quantity > serialModal.total} onClick={closeSerialModal}>XONG ({serialLine.serials?.length || 0}/{serialLine.quantity})</button></footer></PosDialog>}
    {receipt && <PaymentSuccessModal receipt={receipt} onDismiss={dismissPayment} />}
  </main>;
}
