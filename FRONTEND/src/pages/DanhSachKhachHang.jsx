import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import FilterDropdown from '../components/FilterDropdown';
import TablePagination from '../components/TablePagination';
import AddCustomerModal from '../components/AddCustomerModal';
import { formatCustomerStatus } from '../data/mockCustomers';
import useCustomers from '../context/useCustomers';
import './KhachHang.css';

const PAGE_SIZE = 10;
const statusOptions = ['Tất cả trạng thái', 'Hoạt động', 'Ngừng hoạt động'];
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export default function DanhSachKhachHang() {
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusOptions[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const query = normalize(search.trim());
    const matchesSearch = !query || [customer.name, customer.email, customer.phone].some((value) => normalize(value || '').includes(query));
    const matchesStatus = statusFilter === statusOptions[0]
      || (statusFilter === 'Hoạt động' && customer.status === 'active')
      || (statusFilter === 'Ngừng hoạt động' && customer.status === 'inactive');
    return matchesSearch && matchesStatus;
  }), [customers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleCustomers = filteredCustomers.slice(startIndex, startIndex + PAGE_SIZE);
  const openCustomer = (id) => navigate(`/admin/khach-hang-doi-tac/khach-hang/${id}`);

  const customerCreated = () => {
    setSearch('');
    setStatusFilter(statusOptions[0]);
    setCurrentPage(1);
  };

  return (
    <main className="customer-page customer-list-page" role="main">
      <section className="customer-page__hero">
        <div>
          <nav className="customer-page__crumbs" aria-label="Breadcrumb nội dung"><span>KHÁCH HÀNG &amp; ĐỐI TÁC</span><span>/</span><strong>KHÁCH HÀNG</strong></nav>
          <h1>DANH SÁCH KHÁCH HÀNG</h1>
          <p>QUẢN LÝ HỒ SƠ VÀ LỊCH SỬ MUA HÀNG KHÁCH HÀNG</p>
        </div>
        <button type="button" className="customer-btn customer-btn--black" onClick={() => setIsAddOpen(true)}><HiOutlinePlus size={16} /><span>THÊM KHÁCH HÀNG</span></button>
      </section>

      <section className="customer-toolbar" aria-label="Tìm kiếm và lọc khách hàng">
        <label className="customer-search" htmlFor="customer-search-input"><HiOutlineSearch size={18} />
          <input id="customer-search-input" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="TÌM TÊN / SỐ ĐIỆN THOẠI / EMAIL..." />
        </label>
        <FilterDropdown id="customer-status-filter" className="customer-status-filter" options={statusOptions} value={statusFilter} onSelect={(value) => { setStatusFilter(value); setCurrentPage(1); }} />
      </section>

      <section className="customer-list-content">
        <div className="customer-table-wrap"><table className="customer-table">
          <thead><tr><th>MÃ</th><th>TÊN KHÁCH HÀNG</th><th>EMAIL</th><th>SỐ ĐIỆN THOẠI</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {visibleCustomers.map((customer) => (
              <tr key={customer.id} tabIndex={0} onClick={() => openCustomer(customer.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openCustomer(customer.id); }} aria-label={`Xem chi tiết khách hàng ${customer.name}`}>
                <td className="customer-code">#{customer.id}</td><td className="customer-name">{customer.name}</td><td className={customer.email ? '' : 'customer-muted'}>{customer.email || '—'}</td><td>{customer.phone}</td><td><StatusBadge status={customer.status} /></td>
                <td><button type="button" className="customer-action-btn" onClick={(event) => { event.stopPropagation(); openCustomer(customer.id); }}>XEM CHI TIẾT</button></td>
              </tr>
            ))}
            {!visibleCustomers.length && <tr className="customer-empty-row"><td colSpan="6">Không tìm thấy khách hàng phù hợp.</td></tr>}
          </tbody>
        </table></div>
        <div className="customer-list-footer">
          <p>HIỂN THỊ {filteredCustomers.length ? startIndex + 1 : 0}-{Math.min(startIndex + PAGE_SIZE, filteredCustomers.length)} TRÊN TỔNG SỐ {filteredCustomers.length} KHÁCH HÀNG</p>
          <TablePagination totalItems={filteredCustomers.length} pageSize={PAGE_SIZE} currentPage={safePage} onPageChange={setCurrentPage} idPrefix="customer" />
        </div>
      </section>

      <AddCustomerModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onCreated={customerCreated} />
    </main>
  );
}

export function StatusBadge({ status }) {
  return <span className={`customer-status customer-status--${status}`}>{formatCustomerStatus(status)}</span>;
}
