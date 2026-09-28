import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { getPurchaseOrderPage, getSupplierOptions, IMPORT_STATUS, PAYMENT_STATUS } from '../api/purchaseOrderApi';
import { money, PageCrumb, StatusBadge } from './PurchaseShared';
import './NhapHang.css';

export default function DanhSachNhapHang() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ keyword: '', supplierId: '', importStatus: '', paymentStatus: '', page: 1 });
  const [data, setData] = useState({ items: [], totalItems: 0, totalPages: 0 });
  const [suppliers, setSuppliers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); getSupplierOptions(controller.signal).then(setSuppliers).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); }); return () => controller.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    const timer = setTimeout(() => getPurchaseOrderPage(filters, controller.signal).then(setData).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); }).finally(() => setLoading(false)), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters]);
  const update = (key) => (event) => setFilters((old) => ({ ...old, [key]: event.target.value, page: 1 }));
  const hasFilters = filters.supplierId || filters.importStatus || filters.paymentStatus;

  return <main className="purchase-page purchase-list-page">
    <div className="purchase-heading"><div><PageCrumb /><h1>DANH SÁCH ĐƠN NHẬP HÀNG</h1></div><button className="purchase-btn black" onClick={() => navigate('/kho-hang/nhap-hang/tao-moi')}><HiOutlinePlus /> TẠO ĐƠN NHẬP HÀNG</button></div>
    <div className="purchase-toolbar">
      <label className="purchase-search"><HiOutlineSearch /><input value={filters.keyword} onChange={update('keyword')} placeholder="TÌM MÃ ĐƠN NHẬP / NHÀ CUNG CẤP..." /></label>
      <select aria-label="Nhà cung cấp" value={filters.supplierId} onChange={update('supplierId')}><option value="">NHÀ CUNG CẤP</option>{suppliers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <select aria-label="Trạng thái nhập" value={filters.importStatus} onChange={update('importStatus')}><option value="">TRẠNG THÁI NHẬP</option>{Object.entries(IMPORT_STATUS).map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select>
      <select aria-label="Thanh toán" value={filters.paymentStatus} onChange={update('paymentStatus')}><option value="">THANH TOÁN</option>{Object.entries(PAYMENT_STATUS).map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select>
      {hasFilters && <button className="clear-filters" onClick={() => setFilters((old) => ({ ...old, supplierId: '', importStatus: '', paymentStatus: '', page: 1 }))}>XÓA BỘ LỌC</button>}
    </div>
    {error && <p className="purchase-message error">{error}</p>}
    <div className="purchase-table-wrap"><table className="purchase-table"><thead><tr><th>MÃ ĐƠN NHẬP</th><th>NHÀ CUNG CẤP</th><th>TRẠNG THÁI NHẬP</th><th>THANH TOÁN</th><th>TỔNG TIỀN</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr></thead><tbody>
      {!loading && data.items.map((order) => <tr key={order.id} className={order.importStatus === 'HUY' ? 'cancelled' : ''}><td><strong>{order.code}</strong></td><td><strong>{order.supplier.name}</strong></td><td><StatusBadge>{order.importStatusLabel}</StatusBadge></td><td><StatusBadge>{order.paymentStatusLabel}</StatusBadge></td><td className="purchase-money">{money(order.total)}</td><td>{order.createdAtLabel}</td><td><button className="purchase-btn outline small" onClick={() => navigate(`/kho-hang/nhap-hang/${order.id}`)}>XEM CHI TIẾT</button></td></tr>)}
      {(loading || !data.items.length) && <tr className="purchase-empty"><td colSpan="7">{loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy đơn nhập hàng phù hợp.'}</td></tr>}
    </tbody></table><div className="purchase-pagination-caption">{data.totalItems} ĐƠN NHẬP · TRANG {filters.page}/{Math.max(1, data.totalPages)}</div><TablePagination totalItems={data.totalItems} pageSize={10} currentPage={filters.page} onPageChange={(page) => setFilters((old) => ({ ...old, page }))} idPrefix="purchase" /></div>
  </main>;
}
