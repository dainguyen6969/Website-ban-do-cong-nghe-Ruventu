// Admin customer screen: DanhSachKhachHang.
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import AddCustomerModal from '../components/AddCustomerModal';
import { formatCustomerStatus } from '../../../../data/mockCustomers';
import { customerService } from '../../../../shared/services/customerService';
import './KhachHang.css';

const PAGE_SIZE = 10;
const statusOptions = ['Tất cả trạng thái', 'Hoạt động', 'Ngừng hoạt động'];

export default function DanhSachKhachHang() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusOptions[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchTimeoutRef = useRef(null);

  // Debounce search input
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 500);
  };

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      let trangThai = undefined;
      if (statusFilter === 'Hoạt động') trangThai = 1;
      if (statusFilter === 'Ngừng hoạt động') trangThai = 0;

      const response = await customerService.getCustomers({
        keyword: debouncedSearch.trim() || undefined,
        trang_thai: trangThai,
        page: Math.max(0, currentPage - 1),
        limit: PAGE_SIZE
      });

      if (response.data?.data) {
        setCustomers(response.data.data.items || []);
        setTotalElements(response.data.data.pagination?.total_elements || 0);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách khách hàng:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, currentPage]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCustomer = (id) => navigate(`/admin/khach-hang-doi-tac/khach-hang/${id}`);

  const customerCreated = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter(statusOptions[0]);
    setCurrentPage(1);
    fetchCustomers();
  };

  const mapStatusStr = (trangThaiVal) => trangThaiVal === 1 ? 'active' : 'inactive';

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
          <input id="customer-search-input" value={search} onChange={handleSearchChange} placeholder="TÌM TÊN / SỐ ĐIỆN THOẠI / EMAIL..." />
        </label>
        <FilterDropdown id="customer-status-filter" className="customer-status-filter" options={statusOptions} value={statusFilter} onSelect={(value) => { setStatusFilter(value); setCurrentPage(1); }} />
      </section>

      <section className="customer-list-content">
        <div className="customer-table-wrap"><table className="customer-table">
          <thead><tr><th>MÃ</th><th>TÊN KHÁCH HÀNG</th><th>EMAIL</th><th>SỐ ĐIỆN THOẠI</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr className="customer-empty-row"><td colSpan="6">Đang tải dữ liệu...</td></tr>
            ) : customers.length > 0 ? (
              customers.map((customer) => (
                <tr key={customer.id} tabIndex={0} onClick={() => openCustomer(customer.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openCustomer(customer.id); }} aria-label={`Xem chi tiết khách hàng ${customer.ho_ten}`}>
                  <td className="customer-code">#{customer.id}</td><td className="customer-name">{customer.ho_ten}</td><td className={customer.email ? '' : 'customer-muted'}>{customer.email || '—'}</td><td>{customer.so_dien_thoai}</td><td><StatusBadge status={mapStatusStr(customer.trang_thai)} /></td>
                  <td><button type="button" className="customer-action-btn" onClick={(event) => { event.stopPropagation(); openCustomer(customer.id); }}>XEM CHI TIẾT</button></td>
                </tr>
              ))
            ) : (
              <tr className="customer-empty-row"><td colSpan="6">Không tìm thấy khách hàng phù hợp.</td></tr>
            )}
          </tbody>
        </table></div>
        <div className="customer-list-footer">
          <p>HIỂN THỊ {customers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, totalElements)} TRÊN TỔNG SỐ {totalElements} KHÁCH HÀNG</p>
          <TablePagination totalItems={totalElements} pageSize={PAGE_SIZE} currentPage={currentPage} onPageChange={setCurrentPage} idPrefix="customer" />
        </div>
      </section>

      <AddCustomerModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onCreated={customerCreated} />
    </main>
  );
}

export function StatusBadge({ status }) {
  return <span className={`customer-status customer-status--${status}`}>{formatCustomerStatus(status)}</span>;
}
