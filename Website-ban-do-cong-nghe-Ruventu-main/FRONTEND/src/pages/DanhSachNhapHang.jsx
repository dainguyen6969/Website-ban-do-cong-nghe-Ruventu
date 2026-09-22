import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import TablePagination from '../components/TablePagination';
import { getPurchaseOrders, getSupplier, suppliers, totalOrder } from '../data/purchaseOrders';
import { money, PageCrumb, StatusBadge } from './PurchaseShared';
import './NhapHang.css';

export default function DanhSachNhapHang() {
  const navigate = useNavigate();
  const [orders] = useState(() => getPurchaseOrders());
  const [query, setQuery] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => orders.filter((order) => {
    const supplierInfo = getSupplier(order.supplierId);
    const text = `${order.id} ${supplierInfo?.name || ''}`.toLocaleLowerCase('vi');
    return (!query.trim() || text.includes(query.trim().toLocaleLowerCase('vi'))) && (!supplier || order.supplierId === supplier) && (!status || order.status === status) && (!payment || order.paymentStatus === payment);
  }), [orders, query, supplier, status, payment]);
  const pageSize = 10;
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = supplier || status || payment;
  const resetFilters = () => { setSupplier(''); setStatus(''); setPayment(''); setPage(1); };
  const updateFilter = (setter) => (event) => { setter(event.target.value); setPage(1); };

  return <main className="purchase-page purchase-list-page">
    <div className="purchase-heading"><div><PageCrumb /><h1>DANH SÁCH ĐƠN NHẬP HÀNG</h1></div><button className="purchase-btn black" onClick={() => navigate('/kho-hang/nhap-hang/tao-moi')}><HiOutlinePlus /> TẠO ĐƠN NHẬP HÀNG</button></div>
    <div className="purchase-toolbar">
      <label className="purchase-search"><HiOutlineSearch /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="TÌM MÃ ĐƠN NHẬP / NHÀ CUNG CẤP..." /></label>
      <select aria-label="Nhà cung cấp" value={supplier} onChange={updateFilter(setSupplier)}><option value="">NHÀ CUNG CẤP</option>{suppliers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <select aria-label="Trạng thái nhập" value={status} onChange={updateFilter(setStatus)}><option value="">TRẠNG THÁI NHẬP</option>{['Đặt hàng','Đã duyệt','Đã nhập kho','Hoàn trả toàn bộ','Hoàn trả một phần','Đã hủy'].map((value) => <option key={value}>{value}</option>)}</select>
      <select aria-label="Thanh toán" value={payment} onChange={updateFilter(setPayment)}><option value="">THANH TOÁN</option>{['Chưa trả','Trả một phần','Đã trả'].map((value) => <option key={value}>{value}</option>)}</select>
      {hasFilters && <button className="clear-filters" onClick={resetFilters}>XÓA BỘ LỌC</button>}
    </div>
    <div className="purchase-table-wrap">
      <table className="purchase-table"><thead><tr><th>MÃ ĐƠN NHẬP</th><th>NHÀ CUNG CẤP</th><th>TRẠNG THÁI NHẬP</th><th>THANH TOÁN</th><th>TỔNG TIỀN</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr></thead>
        <tbody>{visible.map((order) => <tr key={order.id} className={order.status === 'Đã hủy' ? 'cancelled' : ''}>
          <td><strong>{order.id}</strong></td><td><strong>{getSupplier(order.supplierId)?.name}</strong></td><td><StatusBadge>{order.status}</StatusBadge></td><td><StatusBadge>{order.paymentStatus}</StatusBadge></td><td className="purchase-money">{money(totalOrder(order))}</td><td>{order.createdAt}</td><td><button className="purchase-btn outline small" onClick={() => navigate(`/kho-hang/nhap-hang/${order.id}`)}>XEM CHI TIẾT</button></td>
        </tr>)}{visible.length === 0 && <tr><td colSpan="7" className="purchase-empty">Không tìm thấy đơn nhập hàng phù hợp.</td></tr>}</tbody>
      </table>
      <div className="purchase-pagination-caption">{filtered.length} ĐƠN NHẬP · TRANG {Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))}/{Math.max(1, Math.ceil(filtered.length / pageSize))}</div>
      <TablePagination totalItems={filtered.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} idPrefix="purchase" />
    </div>
  </main>;
}
