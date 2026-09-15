import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { formatMoney, getOrderById } from '../data/mockOrders';
import { OrderStateBadge } from './DanhSachDonHang';
import './ChiTietDonHang.css';

export default function ChiTietDonHang() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = getOrderById(orderId);

  if (!order) return <div className="admin-order-detail"><h2>KHÔNG TÌM THẤY ĐƠN HÀNG</h2></div>;

  return (
    <section className="admin-order-detail">
      <header>
        <div><span>CHI TIẾT ĐƠN HÀNG</span><h2>{order.id}</h2></div>
        <button type="button" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}><HiOutlineArrowLeft size={15} /> QUAY LẠI DANH SÁCH</button>
      </header>
      <div className="admin-order-detail__grid">
        <article>
          <h3>THÔNG TIN ĐƠN HÀNG</h3>
          <dl>
            <div><dt>Mã đơn hàng</dt><dd>{order.id}</dd></div>
            <div><dt>Loại đơn</dt><dd><OrderStateBadge value={order.type} /></dd></div>
            <div><dt>Ngày tạo</dt><dd>{order.createdDate} {order.createdTime}</dd></div>
            <div><dt>Trạng thái</dt><dd><OrderStateBadge value={order.status} /></dd></div>
            <div><dt>Thanh toán</dt><dd><OrderStateBadge value={order.payment} /></dd></div>
            <div><dt>Tổng tiền</dt><dd className="admin-order-detail__total">{formatMoney(order.total)}</dd></div>
          </dl>
        </article>
        <article>
          <h3>KHÁCH HÀNG &amp; XỬ LÝ</h3>
          <dl>
            <div><dt>Khách hàng</dt><dd>{order.customerName}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{order.customerPhone || '—'}</dd></div>
            <div><dt>Đóng gói</dt><dd><OrderStateBadge value={order.packing} /></dd></div>
            <div><dt>Xuất kho</dt><dd><OrderStateBadge value={order.warehouse} /></dd></div>
            <div><dt>Giao hàng</dt><dd>{order.delivery}</dd></div>
          </dl>
        </article>
      </div>
    </section>
  );
}
