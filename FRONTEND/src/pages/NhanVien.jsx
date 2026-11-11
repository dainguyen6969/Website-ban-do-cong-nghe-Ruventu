import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineX,
} from 'react-icons/hi';
import FilterDropdown, { FormDropdown } from '../components/FilterDropdown';
import TablePagination from '../components/TablePagination';
import useMockAuth from '../auth/useMockAuth';
import {
  employeeRoleLabel,
  employeeStatusLabel,
  isStaffAccount,
  makeGeneratedPassword,
  toEmployee,
} from '../auth/accountModel';

import { dateTime, money } from '../../orders/api/orderApi';
import { OrderStateBadge } from '../../orders/pages/DanhSachDonHang';

import './NhanVien.css';

const PAGE_SIZE = 8;
const STATUS_ALL = 'Tất cả trạng thái';
const ROLE_ALL = 'Tất cả vai trò';
const statusOptions = [STATUS_ALL, 'Hoạt động', 'Ngừng hoạt động'];
const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
const formatPhone = (phone) =>
  String(phone ?? '').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') || '—';

function useSuccessBanner() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);
  return [message, setMessage];
}

function EmployeeStatus({ value }) {
  return (
    <span className={`employee-status employee-status--${value}`}>
      {employeeStatusLabel(value)}
    </span>
  );
}

function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div className="employee-success" role="status">
      {message}
    </div>
  );
}

export function DanhSachNhanVien() {
  const navigate = useNavigate();
  const { accounts, roles, createEmployee } = useMockAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [roleFilter, setRoleFilter] = useState(ROLE_ALL);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useSuccessBanner();
  const roleOptions = useMemo(() => [ROLE_ALL, ...roles.map((role) => role.label)], [roles]);
  const employees = useMemo(
    () =>
      accounts
        .filter(isStaffAccount)
        .map(toEmployee)
        .sort((a, b) => Number(a.id.match(/\d+/)?.[0]) - Number(b.id.match(/\d+/)?.[0])),
    [accounts]
  );
  const filtered = useMemo(
    () =>
      employees.filter((employee) => {
        const query = normalize(search.trim());
        const matchesSearch =
          !query ||
          [employee.id, employee.hoTen, employee.soDienThoai, employee.email].some((value) =>
            normalize(value).includes(query)
          );
        const matchesStatus =
          statusFilter === STATUS_ALL ||
          (statusFilter === 'Hoạt động'
            ? employee.trangThai === 'hoat_dong'
            : employee.trangThai === 'ngung_hoat_dong');
        const matchesRole =
          roleFilter === ROLE_ALL || employeeRoleLabel(employee.vaiTro, roles) === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
      }),
    [employees, roleFilter, roles, search, statusFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const handleCreate = (values) => {
    const result = createEmployee(values);
    if (result.error) return result.error;
    setShowCreate(false);
    setSearch('');
    setStatusFilter(STATUS_ALL);
    setRoleFilter(ROLE_ALL);
    setPage(1);
    setSuccess('ĐÃ TẠO TÀI KHOẢN NHÂN VIÊN THÀNH CÔNG');
    return '';
  };

  return (
    <main className="employee-page" role="main">
      <section className="employee-hero">
        <div>
          <p className="employee-crumb">NHÂN VIÊN / DANH SÁCH NHÂN VIÊN</p>
          <h1>DANH SÁCH NHÂN VIÊN</h1>
          <span>QUẢN LÝ TÀI KHOẢN NHÂN SỰ VÀ VAI TRÒ</span>
        </div>
        <button className="employee-btn employee-btn--black" onClick={() => setShowCreate(true)}>
          <HiOutlinePlus /> THÊM NHÂN VIÊN
        </button>
      </section>
      <SuccessBanner message={success} />
      <section className="employee-toolbar">
        <label className="employee-search">
          <HiOutlineSearch />
          <span className="sr-only">Tìm kiếm nhân viên</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="TÌM MÃ / TÊN / SỐ ĐIỆN THOẠI / EMAIL..."
          />
        </label>
        <FilterDropdown
          id="employee-status-filter"
          options={statusOptions}
          value={statusFilter}
          onSelect={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
        <FilterDropdown
          id="employee-role-filter"
          options={roleOptions}
          value={roleFilter}
          onSelect={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        />
      </section>
      <section className="employee-list-content">
        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>MÃ NV</th>
                <th>TÊN NHÂN VIÊN</th>
                <th>SỐ ĐIỆN THOẠI</th>
                <th>EMAIL</th>
                <th>VAI TRÒ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((employee) => (
                <tr key={employee.accountId}>
                  <td className="employee-code">{employee.id}</td>
                  <td className="employee-name">{employee.hoTen}</td>
                  <td>{formatPhone(employee.soDienThoai)}</td>
                  <td>{employee.email}</td>
                  <td>{employeeRoleLabel(employee.vaiTro, roles)}</td>
                  <td>
                    <EmployeeStatus value={employee.trangThai} />
                  </td>
                  <td>
                    <button
                      className="employee-row-action"
                      onClick={() => navigate(`/admin/nhan-vien/${employee.accountId}`)}
                    >
                      XEM CHI TIẾT
                    </button>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td className="employee-empty" colSpan="7">
                    KHÔNG TÌM THẤY NHÂN VIÊN PHÙ HỢP.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="employee-list-footer">
          <p>
            HIỂN THỊ {filtered.length ? start + 1 : 0}-
            {Math.min(start + PAGE_SIZE, filtered.length)} TRÊN TỔNG SỐ {filtered.length} NHÂN VIÊN
          </p>
          <TablePagination
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            currentPage={safePage}
            onPageChange={setPage}
            idPrefix="employee"
            showSummary={false}
          />
        </div>
      </section>
      {showCreate && (
        <EmployeeFormModal
          mode="create"
          accounts={accounts}
          roles={roles}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </main>
  );
}

export function ChiTietNhanVien() {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const { accounts, roles, updateEmployee, setEmployeeStatus } = useMockAuth();
  const account = accounts.find((item) => item.id === accountId && isStaffAccount(item));
  const employee = account ? toEmployee(account) : null;
  const [modal, setModal] = useState('');
  const [success, setSuccess] = useSuccessBanner();

  if (!employee)
    return (
      <main className="employee-page employee-not-found">
        <h1>KHÔNG TÌM THẤY NHÂN VIÊN</h1>
        <button
          className="employee-btn employee-btn--black"
          onClick={() => navigate('/admin/nhan-vien/danh-sach')}
        >
          QUAY LẠI DANH SÁCH
        </button>
      </main>
    );

  const saveEdit = (values) => {
    updateEmployee(accountId, values);
    setModal('');
    setSuccess('ĐÃ CẬP NHẬT THÔNG TIN NHÂN VIÊN');
  };
  const confirmStatus = () => {
    const suspending = modal === 'suspend';
    setEmployeeStatus(accountId, suspending ? 'ngung_hoat_dong' : 'hoat_dong');
    setModal('');
    setSuccess(
      suspending ? 'ĐÃ NGỪNG HOẠT ĐỘNG TÀI KHOẢN NHÂN VIÊN' : 'ĐÃ KHÔI PHỤC TÀI KHOẢN NHÂN VIÊN'
    );
  };

  return (
    <main className="employee-page" role="main">
      <section className="employee-detail-hero">
        <div>
          <p className="employee-crumb">NHÂN VIÊN / DANH SÁCH NHÂN VIÊN / CHI TIẾT NHÂN VIÊN</p>
          <div className="employee-detail-kicker">
            {employee.id} <EmployeeStatus value={employee.trangThai} />
          </div>
          <h1>{employee.hoTen.toLocaleUpperCase('vi')}</h1>
        </div>
        <div className="employee-hero-actions">
          <button
            className="employee-btn employee-btn--outline"
            onClick={() => navigate('/admin/nhan-vien/danh-sach')}
          >
            <HiOutlineArrowLeft /> QUAY LẠI
          </button>
          <button className="employee-btn employee-btn--black" onClick={() => setModal('edit')}>
            CHỈNH SỬA
          </button>
          <button
            className={`employee-btn employee-btn--${employee.trangThai === 'hoat_dong' ? 'danger' : 'success'}`}
            onClick={() => setModal(employee.trangThai === 'hoat_dong' ? 'suspend' : 'restore')}
          >
            {employee.trangThai === 'hoat_dong' ? 'NGỪNG HOẠT ĐỘNG' : 'KHÔI PHỤC'}
          </button>
        </div>
      </section>
      <div className="employee-detail-body">
        <SuccessBanner message={success} />
        <div className="employee-detail-grid">
          <section className="employee-info-card">
            <header>
              <span />
              THÔNG TIN NHÂN VIÊN
            </header>
            <dl>
              <Info label="MÃ NHÂN VIÊN" value={employee.id} />
              <Info label="TÊN NHÂN VIÊN" value={employee.hoTen} />
              <Info label="SỐ ĐIỆN THOẠI" value={formatPhone(employee.soDienThoai)} />
              <Info label="EMAIL" value={employee.email} />
              <Info label="VAI TRÒ" value={employeeRoleLabel(employee.vaiTro, roles)} />
              <Info label="TRẠNG THÁI" value={<EmployeeStatus value={employee.trang_thai} />} />
              <Info label="NGÀY TẠO" value={formatDate(employee.createdAt)} />
              <Info label="CẬP NHẬT CUỐI" value={formatDate(employee.updatedAt)} />
            </dl>
          </section>
        </div>
        <EmployeeReconciliation key={employee.id} employeeId={employee.id} />
      </div>{' '}
      {modal === 'edit' && (
        <EmployeeFormModal
          mode="edit"
          accounts={accounts}
          roles={roles}
          employee={employee}
          onClose={() => setModal('')}
          onSubmit={saveEdit}
        />
      )}
      {(modal === 'suspend' || modal === 'restore') && (
        <StatusConfirmModal
          mode={modal}
          employee={employee}
          onClose={() => setModal('')}
          onConfirm={confirmStatus}
        />
      )}
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const EMPLOYEE_ACTIVITY_LIMIT = 5;
const employeeActivityOptions = [
  ['GAN_TREN_DON', 'Đơn đứng tên'],
  ['DA_DUYET', 'Đơn đã duyệt'],
  ['DA_THAO_TAC', 'Đơn có thao tác'],
  ['THU', 'Phiếu thu'],
  ['CHI', 'Phiếu chi'],
];
const employeeOrderPath = (id) => `/admin/don-hang/danh-sach-don-hang/${id}`;

function EmployeeReconciliation({ employeeId }) {
  const [kind, setKind] = useState('GAN_TREN_DON');
  const [voucherRole, setVoucherRole] = useState('LAP_PHIEU');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState(null);

  const isVoucher = kind === 'THU' || kind === 'CHI';
  const requestKey = `${employeeId}:${kind}:${voucherRole}:${page}:${retry}`;
  const result = response?.key === requestKey ? response : null;

  useEffect(() => {
    const controller = new AbortController();

    getEmployeeActivityPage(
      employeeId,
      { kind, voucherRole, page, limit: EMPLOYEE_ACTIVITY_LIMIT },
      controller.signal
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data?.items)) throw new Error('Dữ liệu đối soát không hợp lệ.');

        const total = Number(data.pagination?.total_elements ?? 0);
        const lastPage = Math.max(1, Math.ceil(total / EMPLOYEE_ACTIVITY_LIMIT));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResponse({ key: requestKey, items: data.items, total, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResponse({ key: requestKey, error: error?.message || 'Không tải được dữ liệu.' });
        }
      });

    return () => controller.abort();
  }, [employeeId, kind, voucherRole, page, requestKey]);

  const columns = isVoucher
    ? [
        'Mã phiếu',
        'Người lập',
        kind === 'THU' ? 'Bên nộp' : 'Bên nhận',
        'Chứng từ',
        'Số tiền',
        'Ngày ghi nhận',
        'Trạng thái',
      ]
    : ['Mã đơn', 'Loại đơn', 'Trạng thái', 'Thanh toán', 'Giá trị đơn', 'Ngày tạo'];
  const voucherPath = kind === 'THU' ? 'phieu-thu' : 'phieu-chi';

  return (
    <section className="employee-activity-card" aria-labelledby="employee-activity-title">
      <header>
        <span aria-hidden="true" />
        <h2 id="employee-activity-title">ĐỐI SOÁT NGHIỆP VỤ</h2>
      </header>

      <div className="employee-activity-toolbar">
        <div className="employee-activity-tabs" role="group" aria-label="Nhóm đối soát">
          {employeeActivityOptions.map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {isVoucher && (
          <FilterDropdown
            id="employee-voucher-role"
            aria-label="Vai trò trên phiếu"
            options={[
              ['LAP_PHIEU', 'Đứng tên lập phiếu'],
              ['BEN_NOP_NHAN', kind === 'THU' ? 'Là bên nộp tiền' : 'Là bên nhận tiền'],
            ]}
            value={voucherRole}
            onSelect={(value) => {
              setVoucherRole(value);
              setPage(1);
            }}
          />
        )}
      </div>

      <p className="employee-activity-note">
        {isVoucher
          ? 'Người lập phiếu và bên nộp/nhận là hai vai trò riêng. Số tiền là giá trị trên phiếu.'
          : 'Một đơn có thể thuộc nhiều nhóm. Đơn hệ thống tự duyệt không được tính là nhân viên duyệt.'}
      </p>

      <div
        className="admin-table-scroll admin-table-scroll--embedded"
        tabIndex={0}
        role="region"
        aria-label="Kết quả đối soát"
        aria-busy={!result}
      >
        <table className="admin-data-table admin-data-table--records">
          <thead>
            <tr>
              {columns.map((title) => (
                <th key={title} scope="col">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!result || result.error || !result.items.length ? (
              <tr>
                <td colSpan={columns.length} className="employee-empty">
                  {result?.error ? (
                    <>
                      <span role="alert">{result.error}</span>{' '}
                      <button
                        type="button"
                        className="employee-row-action"
                        onClick={() => setRetry((value) => value + 1)}
                      >
                        Thử lại
                      </button>
                    </>
                  ) : !result ? (
                    'Đang tải dữ liệu…'
                  ) : (
                    'Không có bản ghi phù hợp.'
                  )}
                </td>
              </tr>
            ) : (
              result.items.map((item) => {
                if (!isVoucher) {
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link className="employee-activity-link" to={employeeOrderPath(item.id)}>
                          {item.ma_don_hang}
                        </Link>
                      </td>
                      <td>
                        <OrderStateBadge value={item.loai_don_hang} />
                      </td>
                      <td>
                        <OrderStateBadge value={item.trang_thai_don_hang} />
                      </td>
                      <td>
                        <OrderStateBadge value={item.trang_thai_thanh_toan} />
                      </td>
                      <td>{money(item.tong_thanh_toan)}</td>
                      <td>{dateTime(item.ngay_tao)}</td>
                    </tr>
                  );
                }

                const recorded = item.trang_thai === 'DA_GHI_NHAN';
                const canceled = item.trang_thai === 'HUY';
                return (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="employee-activity-link"
                        to={`/admin/so-quy-tien-mat/${voucherPath}/${item.id}`}
                      >
                        {item.ma_phieu}
                      </Link>
                    </td>
                    <td>{item.ten_nguoi_tao || '—'}</td>
                    <td>{item.ten_nguoi_nop_nhan || '—'}</td>
                    <td>
                      {item.don_hang_id ? (
                        <Link
                          className="employee-activity-link"
                          to={employeeOrderPath(item.don_hang_id)}
                        >
                          {item.ma_don_hang || 'Xem đơn'}
                        </Link>
                      ) : (
                        item.ma_chung_tu_tham_chieu || '—'
                      )}
                      {item.ma_phieu_giao_hang && (
                        <small className="employee-activity-ref">{item.ma_phieu_giao_hang}</small>
                      )}
                    </td>
                    <td>{money(item.so_tien)}</td>
                    <td>{dateTime(item.ngay_ghi_nhan)}</td>
                    <td>
                      <span data-admin-status={recorded ? 'green' : canceled ? 'red' : 'neutral'}>
                        {recorded ? 'Đã ghi nhận' : canceled ? 'Đã hủy' : 'Chưa rõ'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {result?.total > 0 && (
        <TablePagination
          className="employee-activity-pagination"
          totalItems={result.total}
          pageSize={EMPLOYEE_ACTIVITY_LIMIT}
          currentPage={page}
          onPageChange={setPage}
          idPrefix="employee-activity"
        />
      )}
    </section>
  );
}

function ModalShell({ title, theme, onClose, children, labelledBy = 'employee-modal-title' }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return (
    <div
      className="employee-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`employee-modal employee-modal--${theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <header>
          <h2 id={labelledBy}>
            <span />
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <HiOutlineX />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

const blankForm = {
  hoTen: '',
  soDienThoai: '',
  email: '',
  vaiTro: '',
  trangThai: 'hoat_dong',
  password: '',
  confirmPassword: '',
};
function validateForm(form, mode, resetPassword, accounts, employee) {
  const errors = {};
  if (form.hoTen.trim().length < 2) errors.hoTen = 'Họ và tên phải có ít nhất 2 ký tự.';
  const phone = form.soDienThoai.replace(/\s+/g, '');
  if (!phone) errors.soDienThoai = 'Vui lòng nhập số điện thoại.';
  else if (!/^0\d{9}$/.test(phone))
    errors.soDienThoai = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.';
  if (mode === 'create') {
    if (!form.email.trim()) errors.email = 'Vui lòng nhập email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Email không đúng định dạng.';
    else if (
      accounts.some((account) => account.email.toLowerCase() === form.email.trim().toLowerCase())
    )
      errors.email = 'Email này đã được sử dụng bởi một tài khoản khác.';
  }
  if (!form.vaiTro) errors.vaiTro = 'Vui lòng chọn vai trò.';
  if (mode === 'create' || resetPassword) {
    if (!form.password) errors.password = 'Vui lòng nhập mật khẩu.';
    else if (form.password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    if (!form.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    else if (form.password !== form.confirmPassword)
      errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
  }
  if (mode === 'edit' && !employee) errors.form = 'Không tìm thấy nhân viên.';
  return errors;
}

function EmployeeFormModal({ mode, accounts, roles, employee, onClose, onSubmit }) {
  const creating = mode === 'create';
  const [form, setForm] = useState(() => (creating ? blankForm : { ...blankForm, ...employee }));
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const passwordVisible = creating || resetPassword;
  const change = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '', form: '' }));
  };
  const generatePassword = () => {
    if (!form.vaiTro) {
      setErrors((current) => ({
        ...current,
        vaiTro: 'Vui lòng chọn vai trò trước khi tạo mật khẩu.',
      }));
      return;
    }
    const password = makeGeneratedPassword(form.vaiTro, accounts, roles);
    setForm((current) => ({ ...current, password, confirmPassword: password }));
    setErrors((current) => ({ ...current, password: '', confirmPassword: '' }));
  };
  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form, mode, resetPassword, accounts, employee);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const serverError = onSubmit({
      ...form,
      password: passwordVisible ? form.password : undefined,
    });
    if (serverError) setErrors((current) => ({ ...current, email: serverError }));
  };
  const toggleReset = () => {
    setResetPassword((value) => !value);
    setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
    setErrors((current) => ({ ...current, password: '', confirmPassword: '' }));
    setShowPassword(false);
    setShowConfirm(false);
  };

  return (
    <ModalShell
      title={creating ? 'THÊM NHÂN VIÊN' : 'CHỈNH SỬA NHÂN VIÊN'}
      theme={creating ? 'create' : 'edit'}
      onClose={onClose}
    >
      <form className="employee-form" onSubmit={submit} noValidate>
        <fieldset>
          <legend>THÔNG TIN NHÂN VIÊN</legend>
          <FormField label="HỌ VÀ TÊN *" error={errors.hoTen}>
            <input
              autoFocus
              value={form.hoTen}
              onChange={(event) => change('hoTen', event.target.value)}
              placeholder="Nguyễn Văn An"
            />
          </FormField>
          <div className="employee-form-grid">
            <FormField label="SỐ ĐIỆN THOẠI *" error={errors.soDienThoai}>
              <input
                value={form.soDienThoai}
                onChange={(event) => change('soDienThoai', event.target.value)}
                placeholder="0901 234 567"
                inputMode="tel"
              />
            </FormField>
            <FormField label={creating ? 'EMAIL *' : 'EMAIL (KHÔNG ĐỔI ĐƯỢC)'} error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(event) => creating && change('email', event.target.value)}
                placeholder="nhanvien@ruventu.vn"
                disabled={!creating}
              />
            </FormField>
          </div>
          <div className="employee-form-grid">
            <FormField label="VAI TRÒ *" error={errors.vaiTro}>
              <FormDropdown
                aria-label="VAI TRÒ *"
                value={form.vaiTro}
                onChange={(event) => change('vaiTro', event.target.value)}
              >
                <option value="">— Chọn vai trò —</option>
                {roles.map((role) => (
                  <option value={role.id} key={role.id}>
                    {role.label}
                  </option>
                ))}
              </FormDropdown>
            </FormField>
            {!creating && (
              <FormField label="TRẠNG THÁI">
                <FormDropdown
                  aria-label="TRẠNG THÁI"
                  value={form.trangThai}
                  onChange={(event) => change('trangThai', event.target.value)}
                >
                  <option value="hoat_dong">Hoạt động</option>
                  <option value="ngung_hoat_dong">Ngừng hoạt động</option>
                </FormDropdown>
              </FormField>
            )}
          </div>
        </fieldset>
        {creating && (
          <fieldset>
            <legend>MẬT KHẨU</legend>
            <PasswordSection
              form={form}
              errors={errors}
              change={change}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirm={showConfirm}
              setShowConfirm={setShowConfirm}
              onGenerate={generatePassword}
            />
          </fieldset>
        )}
        {!creating && (
          <div className="employee-reset">
            <button
              type="button"
              className={`employee-reset-toggle ${resetPassword ? 'employee-reset-toggle--on' : ''}`}
              onClick={toggleReset}
            >
              {resetPassword ? '×' : '+'} CẤP LẠI MẬT KHẨU
            </button>
            {resetPassword && (
              <div className="employee-reset-fields">
                <PasswordSection
                  form={form}
                  errors={errors}
                  change={change}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showConfirm={showConfirm}
                  setShowConfirm={setShowConfirm}
                  onGenerate={generatePassword}
                />
              </div>
            )}
          </div>
        )}
        {errors.form && <p className="employee-field-error">{errors.form}</p>}
        <footer>
          <button type="button" className="employee-btn employee-btn--outline" onClick={onClose}>
            HỦY
          </button>
          <button type="submit" className="employee-btn employee-btn--black">
            {creating ? 'TẠO NHÂN VIÊN' : 'LƯU THAY ĐỔI'}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function PasswordSection({
  form,
  errors,
  change,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  onGenerate,
}) {
  return (
    <>
      <button type="button" className="employee-generate" onClick={onGenerate}>
        TẠO MẬT KHẨU TỰ ĐỘNG
      </button>
      <div className="employee-form-grid">
        <FormField label="MẬT KHẨU *" error={errors.password}>
          <div className="employee-password">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => change('password', event.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
            </button>
          </div>
        </FormField>
        <FormField label="NHẬP LẠI MẬT KHẨU *" error={errors.confirmPassword}>
          <div className="employee-password">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(event) => change('confirmPassword', event.target.value)}
              placeholder="Nhập lại mật khẩu"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((value) => !value)}
              aria-label={showConfirm ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
            >
              {showConfirm ? <HiOutlineEyeOff /> : <HiOutlineEye />}
            </button>
          </div>
        </FormField>
      </div>
    </>
  );
}

function FormField({ label, error, children }) {
  return (
    <label className="employee-field">
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

function StatusConfirmModal({ mode, employee, onClose, onConfirm }) {
  const suspending = mode === 'suspend';
  return (
    <ModalShell
      title={
        suspending
          ? 'NGỪNG HOẠT ĐỘNG TÀI KHOẢN NHÂN VIÊN?'
          : 'KHÔI PHỤC HOẠT ĐỘNG TÀI KHOẢN NHÂN VIÊN?'
      }
      theme={suspending ? 'danger' : 'success'}
      onClose={onClose}
    >
      <div className="employee-confirm-body">
        <strong>
          {employee.id} – {employee.hoTen.toLocaleUpperCase('vi')}
        </strong>
        <p>
          {suspending
            ? 'Nhân viên sẽ không thể đăng nhập và phiên đăng nhập hiện tại sẽ bị thu hồi.'
            : 'Nhân viên sẽ có thể đăng nhập trở lại bình thường.'}
        </p>
      </div>
      <footer className="employee-confirm-footer">
        <button className="employee-btn employee-btn--outline" onClick={onClose}>
          HỦY
        </button>
        <button
          className={`employee-btn employee-btn--solid-${suspending ? 'danger' : 'success'}`}
          onClick={onConfirm}
        >
          {suspending ? 'XÁC NHẬN NGỪNG' : 'KHÔI PHỤC'}
        </button>
      </footer>
    </ModalShell>
  );
}
