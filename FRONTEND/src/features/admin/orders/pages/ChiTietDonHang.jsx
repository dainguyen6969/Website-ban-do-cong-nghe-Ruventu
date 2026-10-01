// Admin order screen: ChiTietDonHang.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import useOrders from '../../../../context/useOrders';
import { formatMoney } from '../../../../data/mockOrders';
import { OrderStateBadge } from './DanhSachDonHang';
import './ChiTietDonHang.css';

export default function ChiTietDonHang() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, cancelOrder, confirmPayment, completePacking, cancelPacking } = useOrders();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const order = orders.find((item) => item.id === orderId);
  const productPagination = useDetailTablePagination(order?.products);

  useEffect(() => {
    if (!isCancelOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsCancelOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isCancelOpen]);

  if (!order) return <section className="admin-order-detail admin-order-not-found"><h1>KHÔNG TÌM THẤY ĐƠN HÀNG</h1><button type="button" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}>QUAY LẠI DANH SÁCH</button></section>;

  const isCancelled = order.status === 'Đã hủy';
  const productTotal = order.products.reduce((sum, product) => sum + product.subtotal, 0);
  const submitCancellation = () => {
    cancelOrder(order.id, cancelReason);
    setIsCancelOpen(false);
    setCancelReason('');
  };

  return (
    <section className="admin-order-detail">
      <header className="order-detail-hero">
        <div>
          <nav aria-label="Breadcrumb nội dung"><span>ĐƠN HÀNG</span><span>›</span><span>DANH SÁCH ĐƠN HÀNG</span><span>›</span><strong>{order.id}</strong></nav>
          <div className="order-detail-heading"><h1>{order.id}</h1><OrderStateBadge value={order.type} /></div>
          <p>{order.createdDate} {order.createdTime}</p>
          <div className="order-detail-statuses"><OrderStateBadge value={order.status} /><OrderStateBadge value={order.payment} /><OrderStateBadge value={order.packing} /><OrderStateBadge value={order.warehouse} /></div>
        </div>
        <div className="order-detail-hero__actions">
          {!isCancelled && <button type="button" className="order-action order-action--danger" onClick={() => setIsCancelOpen(true)}>HỦY ĐƠN HÀNG</button>}
          <button type="button" className="order-action order-action--back" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}><HiOutlineArrowLeft size={14} /> QUAY LẠI DANH SÁCH</button>
        </div>
      </header>

      <div className="order-detail-content">
        <div className="order-detail-main">
          <DetailPanel title="SẢN PHẨM TRONG ĐƠN" className="order-products-panel">
            <div className="order-products-table-wrap"><table className="order-products-table">
              <thead><tr><th>ẢNH</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>MÃ VẠCH</th><th>ĐƠN GIÁ</th><th>SL</th><th>THÀNH TIỀN</th></tr></thead>
              <tbody>{productPagination.visibleItems.map((product) => <tr key={product.barcode}><td><img src={product.image} alt="" /></td><td><strong>{product.name}</strong><span>{product.variant}</span></td><td>{product.barcode}</td><td className="align-right">{formatMoney(product.unitPrice)}</td><td className="align-center">{product.quantity}</td><td className="align-right"><strong>{formatMoney(product.subtotal)}</strong></td></tr>)}</tbody>
            </table></div>
            <DetailTablePagination totalItems={order.products.length} currentPage={productPagination.currentPage} onPageChange={productPagination.onPageChange} idPrefix="order-products" />
          </DetailPanel>

          <DetailPanel title="THANH TOÁN">
            <dl className="order-detail-kv"><InfoRow label="PHƯƠNG THỨC">{order.paymentMethod}</InfoRow><InfoRow label="TRẠNG THÁI"><OrderStateBadge value={order.payment} /></InfoRow><InfoRow label="MÃ GIAO DỊCH">{order.transactionCode || '—'}</InfoRow></dl>
            {!isCancelled && order.payment === 'Chưa thanh toán' && <div className="order-panel-actions"><button type="button" className="order-action order-action--black" onClick={() => confirmPayment(order.id)}>XÁC NHẬN THANH TOÁN</button></div>}
          </DetailPanel>

          <DetailPanel title="ĐÓNG GÓI VÀ XUẤT KHO">
            <div className="order-fulfillment-grid"><div><span>ĐÓNG GÓI</span><OrderStateBadge value={order.packing} /></div><div><span>XUẤT KHO</span><OrderStateBadge value={order.warehouse} /></div></div>
            {!isCancelled && !['Đã đóng gói', 'Hủy đóng gói'].includes(order.packing) && <div className="order-panel-actions"><button type="button" className="order-action order-action--black" onClick={() => completePacking(order.id)}>HOÀN TẤT ĐÓNG GÓI</button><button type="button" className="order-action order-action--back" onClick={() => cancelPacking(order.id)}>HỦY ĐÓNG GÓI</button></div>}
          </DetailPanel>

          <DetailPanel title="GIAO VẬN">
            <dl className="order-detail-kv"><InfoRow label="ĐƠN VỊ VẬN CHUYỂN">{order.shippingProvider}</InfoRow><InfoRow label="MÃ VẬN ĐƠN"><span className={order.trackingCode ? '' : 'order-alert-text'}>{order.trackingCode || 'CHƯA CÓ MÃ VẬN ĐƠN'}</span></InfoRow><InfoRow label="PHÍ GIAO HÀNG">{formatMoney(order.shippingFee)}</InfoRow></dl>
          </DetailPanel>

          <DetailPanel title="LỊCH SỬ XỬ LÝ" className="order-history-panel">
            <ol className="order-timeline">{order.history.map((entry, index) => <li key={`${entry.timestamp}-${entry.title}-${index}`} className={`order-timeline__item order-timeline__item--${entry.tone || 'black'}`}><time>{entry.timestamp}</time><strong>{entry.title}</strong><p>{entry.description}</p></li>)}</ol>
          </DetailPanel>
        </div>

        <aside className="order-detail-sidebar">
          <DetailPanel title="KHÁCH HÀNG"><dl className="order-sidebar-kv"><InfoRow label="HỌ TÊN">{order.customerName}</InfoRow><InfoRow label="SỐ ĐIỆN THOẠI">{order.customerPhone || '—'}</InfoRow></dl></DetailPanel>
          <DetailPanel title="NGƯỜI NHẬN"><dl className="order-sidebar-kv"><InfoRow label="TÊN NGƯỜI NHẬN">{order.recipient.name}</InfoRow><InfoRow label="SỐ ĐIỆN THOẠI">{order.recipient.phone || '—'}</InfoRow><InfoRow label="ĐỊA CHỈ GIAO HÀNG">{order.recipient.address}</InfoRow></dl></DetailPanel>
          <DetailPanel title="TỔNG KẾT"><dl className="order-summary"><InfoRow label="TIỀN HÀNG">{formatMoney(productTotal)}</InfoRow><InfoRow label="CHIẾT KHẤU">{order.discount ? formatMoney(order.discount) : '—'}</InfoRow><InfoRow label="PHÍ GIAO HÀNG">{formatMoney(order.shippingFee)}</InfoRow><div className="order-summary-total"><dt>KHÁCH PHẢI TRẢ</dt><dd>{formatMoney(order.total)}</dd></div></dl></DetailPanel>
          <DetailPanel title="GHI CHÚ"><p className="order-note">{order.note}</p></DetailPanel>
        </aside>
      </div>

      {isCancelOpen && <div className="order-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCancelOpen(false); }}><section className="order-cancel-modal" role="alertdialog" aria-modal="true" aria-labelledby="cancel-order-title"><header><h2 id="cancel-order-title">HỦY ĐƠN HÀNG</h2></header><div className="order-cancel-modal__body"><label htmlFor="cancel-reason">LÝ DO HỦY <span>(TÙY CHỌN)</span></label><textarea id="cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Nhập lý do hủy đơn..." autoFocus /></div><footer><button type="button" className="order-action order-action--back" onClick={() => setIsCancelOpen(false)}>QUAY LẠI</button><button type="button" className="order-action order-action--confirm-cancel" onClick={submitCancellation}>XÁC NHẬN HỦY ĐƠN</button></footer></section></div>}
    </section>
  );
}

function DetailPanel({ title, className = '', children }) {
  return <section className={`order-detail-panel ${className}`}><h2><span />{title}</h2>{children}</section>;
}

function InfoRow({ label, children }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}
