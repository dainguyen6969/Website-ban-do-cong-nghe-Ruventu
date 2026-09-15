import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import FilterDropdown from '../components/FilterDropdown';
import TablePagination from '../components/TablePagination';
import { formatCustomerStatus } from '../data/mockCustomers';
import useCustomers from '../context/useCustomers';
import './KhachHang.css';

const PAGE_SIZE = 10;
const statusOptions = ['Tất cả trạng thái', 'Hoạt động', 'Ngừng hoạt động'];
const emptyForm = { name: '', phone: '', email: '', city: '', ward: '', address: '' };

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export default function DanhSachKhachHang() {
  const navigate = useNavigate();
  const { customers, addCustomer } = useCustomers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusOptions[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isAddOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsAddOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isAddOpen]);

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

  const closeAddModal = () => {
    setIsAddOpen(false);
    setForm(emptyForm);
    setErrors({});
  };

  const submitCustomer = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên khách hàng.';
    if (!form.phone.trim()) nextErrors.phone = 'Vui lòng nhập số điện thoại.';
    else if (phoneDigits.length < 9 || phoneDigits.length > 11) nextErrors.phone = 'Số điện thoại phải có từ 9 đến 11 chữ số.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Email chưa đúng định dạng.';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    addCustomer(form);
    setSearch('');
    setStatusFilter(statusOptions[0]);
    setCurrentPage(1);
    closeAddModal();
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
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

      {isAddOpen && (
        <div className="customer-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAddModal(); }}>
          <section className="customer-add-modal" role="dialog" aria-modal="true" aria-labelledby="add-customer-title">
            <header><h2 id="add-customer-title"><span />THÊM KHÁCH HÀNG</h2><button type="button" onClick={closeAddModal} aria-label="Đóng"><HiOutlineX size={18} /></button></header>
            <form onSubmit={submitCustomer} noValidate>
              <fieldset><legend>THÔNG TIN KHÁCH HÀNG</legend>
                <CustomerField label="TÊN KHÁCH HÀNG *" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Nguyễn Văn An" error={errors.name} autoFocus />
                <div className="customer-add-grid">
                  <CustomerField label="SỐ ĐIỆN THOẠI *" value={form.phone} onChange={(value) => updateField('phone', value)} placeholder="0901 234 567" error={errors.phone} inputMode="tel" />
                  <CustomerField label="EMAIL" value={form.email} onChange={(value) => updateField('email', value)} placeholder="example@gmail.com" error={errors.email} inputMode="email" />
                </div>
              </fieldset>
              <fieldset><legend>ĐỊA CHỈ <span>(TÙY CHỌN)</span></legend>
                <div className="customer-add-grid">
                  <CustomerField label="TỈNH / THÀNH" value={form.city} onChange={(value) => updateField('city', value)} placeholder="Hà Nội" />
                  <CustomerField label="PHƯỜNG / XÃ" value={form.ward} onChange={(value) => updateField('ward', value)} placeholder="Phường Tây Hồ" />
                </div>
                <CustomerField label="ĐỊA CHỈ CHI TIẾT" value={form.address} onChange={(value) => updateField('address', value)} placeholder="Số 12, ngõ 10, đường Xuân Diệu" />
              </fieldset>
              <footer><button type="button" className="customer-btn customer-btn--outline" onClick={closeAddModal}>HỦY</button><button type="submit" className="customer-btn customer-btn--black">LƯU KHÁCH HÀNG</button></footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function CustomerField({ label, value, onChange, placeholder, error, ...inputProps }) {
  return <label className={`customer-form-field ${error ? 'customer-form-field--error' : ''}`}><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} {...inputProps} />{error && <small>{error}</small>}</label>;
}

export function StatusBadge({ status }) {
  return <span className={`customer-status customer-status--${status}`}>{formatCustomerStatus(status)}</span>;
}
