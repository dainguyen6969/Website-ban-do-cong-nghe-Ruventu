// Admin organization screen: NhanVien.
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineExclamationCircle
} from 'react-icons/hi';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { employeeStatusLabel, makeGeneratedPassword } from '../../../../auth/accountModel';
import { getEmployeePage, getEmployeeDetail, createEmployee, updateEmployee, deleteEmployee } from '../api/employeeApi';
import { getAllRoles } from '../api/roleApi';
import './NhanVien.css';

const PAGE_SIZE = 8;
const STATUS_ALL = 'Tất cả trạng thái';
const ROLE_ALL = 'Tất cả vai trò';
const statusOptions = [STATUS_ALL, 'Hoạt động', 'Ngừng hoạt động'];
const formatPhone = (phone = '') => phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', hour12: false }).format(new Date(value)) : '—';

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
  // backend value 1 = hoat_dong, 0 = ngung_hoat_dong
  const statusKey = value === 1 ? 'hoat_dong' : 'ngung_hoat_dong';
  return <span className={`employee-status employee-status--${statusKey}`}>{employeeStatusLabel(statusKey)}</span>;
}

function SuccessBanner({ message }) {
  if (!message) return null;
  return <div className="employee-success" role="status">{message}</div>;
}

export function DanhSachNhanVien() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [roleFilter, setRoleFilter] = useState(ROLE_ALL);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useSuccessBanner();

  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  const roleOptions = [ROLE_ALL, ...roles.map((role) => role.ten_vai_tro)];
  
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    getAllRoles().then(setRoles).catch(console.error);
  }, []);

  const loadData = () => {
    const selectedRole = roles.find(r => r.ten_vai_tro === roleFilter);
    const filterParams = {
      page,
      limit: PAGE_SIZE,
      keyword: search,
      trangThai: statusFilter === STATUS_ALL ? null : (statusFilter === 'Hoạt động' ? 1 : 0),
      vaiTroId: selectedRole ? selectedRole.id : null,
    };
    
    getEmployeePage(filterParams).then(res => {
      setEmployees(res.items);
      setTotalItems(res.totalItems);
    }).catch(console.error);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, roleFilter, roles]);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(e.target.value);
      setPage(1);
    }, 500);
  };

  const handleCreate = async (values) => {
    try {
      await createEmployee(values);
      setShowCreate(false);
      setSearchInput(''); setSearch(''); setStatusFilter(STATUS_ALL); setRoleFilter(ROLE_ALL); setPage(1);
      setSuccess('ĐÃ TẠO TÀI KHOẢN NHÂN VIÊN THÀNH CÔNG');
      loadData();
      return '';
    } catch (e) {
      return e.message || 'Lỗi khi tạo nhân viên';
    }
  };

  return <main className="employee-page" role="main">
    <section className="employee-hero">
      <div><p className="employee-crumb">NHÂN VIÊN / DANH SÁCH NHÂN VIÊN</p><h1>DANH SÁCH NHÂN VIÊN</h1><span>QUẢN LÝ TÀI KHOẢN NHÂN SỰ VÀ VAI TRÒ</span></div>
      <button className="employee-btn employee-btn--black" onClick={() => setShowCreate(true)}><HiOutlinePlus /> THÊM NHÂN VIÊN</button>
    </section>
    <SuccessBanner message={success} />
    <section className="employee-toolbar">
      <label className="employee-search"><HiOutlineSearch /><span className="sr-only">Tìm kiếm nhân viên</span><input value={searchInput} onChange={handleSearchChange} placeholder="TÌM TÊN / SỐ ĐIỆN THOẠI / EMAIL..." /></label>
      <FilterDropdown id="employee-status-filter" options={statusOptions} value={statusFilter} onSelect={(value) => { setStatusFilter(value); setPage(1); }} />
      <FilterDropdown id="employee-role-filter" options={roleOptions} value={roleFilter} onSelect={(value) => { setRoleFilter(value); setPage(1); }} />
    </section>
    <section className="employee-list-content">
      <div className="employee-table-wrap"><table className="employee-table"><thead><tr><th>MÃ NV</th><th>TÊN NHÂN VIÊN</th><th>SỐ ĐIỆN THOẠI</th><th>EMAIL</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
        {employees.map((employee) => <tr key={employee.id}>
          <td className="employee-code">NV{String(employee.id).padStart(5, '0')}</td><td className="employee-name">{employee.ho_ten}</td><td>{formatPhone(employee.so_dien_thoai)}</td><td>{employee.email}</td><td>{employee.vai_tro?.ten_vai_tro || '—'}</td><td><EmployeeStatus value={employee.trang_thai} /></td>
          <td><button className="employee-row-action" onClick={() => navigate(`/admin/nhan-vien/${employee.id}`)}>XEM CHI TIẾT</button></td>
        </tr>)}
        {!employees.length && <tr><td className="employee-empty" colSpan="7">KHÔNG TÌM THẤY NHÂN VIÊN PHÙ HỢP.</td></tr>}
      </tbody></table></div>
      <div className="employee-list-footer"><p>HIỂN THỊ {employees.length} TRÊN TỔNG SỐ {totalItems} NHÂN VIÊN</p><TablePagination totalItems={totalItems} pageSize={PAGE_SIZE} currentPage={page} onPageChange={setPage} idPrefix="employee" showSummary={false} /></div>
    </section>
    {showCreate && <EmployeeFormModal mode="create" roles={roles} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
  </main>;
}

export function ChiTietNhanVien() {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [employee, setEmployee] = useState(null);
  const [roles, setRoles] = useState([]);
  const [modal, setModal] = useState('');
  const [success, setSuccess] = useSuccessBanner();
  const [errorBanner, setErrorBanner] = useState('');

  const loadDetail = () => {
    getEmployeeDetail(accountId).then(setEmployee).catch(() => setEmployee(null));
  };

  useEffect(() => {
    getAllRoles().then(setRoles).catch(console.error);
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  if (!employee) return <main className="employee-page employee-not-found"><h1>ĐANG TẢI... HOẶC KHÔNG TÌM THẤY NHÂN VIÊN</h1><button className="employee-btn employee-btn--black" onClick={() => navigate('/admin/nhan-vien/danh-sach')}>QUAY LẠI DANH SÁCH</button></main>;

  const saveEdit = async (values) => {
    try {
      await updateEmployee(accountId, values);
      setModal('');
      setSuccess('ĐĐ CẬP NHẬT THÔNG TIN NHÂN VIÊN');
      loadDetail();
      return '';
    } catch (e) {
      return e.message || 'Lỗi cập nhật';
    }
  };
  
  const confirmStatus = async () => {
    const suspending = modal === 'suspend';
    try {
      await updateEmployee(accountId, { 
        ho_ten: employee.ho_ten, 
        so_dien_thoai: employee.so_dien_thoai, 
        vai_tro_id: employee.vai_tro?.id, 
        trang_thai: suspending ? 0 : 1 
      });
      setModal('');
      setErrorBanner('');
      setSuccess(suspending ? 'ĐÃ NGỪNG HOẠT ĐỘNG TÀI KHOẢN NHÂN VIÊN' : 'ĐÃ KHÔI PHỤC TÀI KHOẢN NHÂN VIÊN');
      loadDetail();
    } catch (e) {
      setModal('');
      setErrorBanner(e.message || 'Không thể thay đổi trạng thái');
    }
  };

  return <main className="employee-page" role="main">
    <section className="employee-detail-hero">
      <div><p className="employee-crumb">NHÂN VIÊN / DANH SÁCH NHÂN VIÊN / CHI TIẾT NHÂN VIÊN</p><div className="employee-detail-kicker">NV{String(employee.id).padStart(5, '0')} <EmployeeStatus value={employee.trang_thai} /></div><h1>{employee.ho_ten.toLocaleUpperCase('vi')}</h1></div>
      <div className="employee-hero-actions"><button className="employee-btn employee-btn--outline" onClick={() => navigate('/admin/nhan-vien/danh-sach')}><HiOutlineArrowLeft /> QUAY LẠI</button><button className="employee-btn employee-btn--black" onClick={() => setModal('edit')}>CHỈNH SỬA</button><button className={`employee-btn employee-btn--${employee.trang_thai === 1 ? 'danger' : 'success'}`} onClick={() => setModal(employee.trang_thai === 1 ? 'suspend' : 'restore')}>{employee.trang_thai === 1 ? 'NGỪNG HOẠT ĐỘNG' : 'KHÔI PHỤC'}</button></div>
    </section>
    <div className="employee-detail-body">
      <SuccessBanner message={success} />
      {errorBanner && <div className="role-error-banner" style={{marginBottom:'24px'}} role="alert"><p><HiOutlineExclamationCircle />{errorBanner}</p></div>}
      <section className="employee-info-card"><header><span />THÔNG TIN NHÂN VIÊN</header><dl>
        <Info label="MÃ NHÂN VIÊN" value={`NV${String(employee.id).padStart(5, '0')}`} /><Info label="TÊN NHÂN VIÊN" value={employee.ho_ten} /><Info label="SỐ ĐIỆN THOẠI" value={formatPhone(employee.so_dien_thoai)} /><Info label="EMAIL" value={employee.email} /><Info label="VAI TRÒ" value={employee.vai_tro?.ten_vai_tro || '—'} /><Info label="TRẠNG THÁI" value={employeeStatusLabel(employee.trang_thai === 1 ? 'hoat_dong' : 'ngung_hoat_dong')} />
      </dl></section>
    </div>
    {modal === 'edit' && <EmployeeFormModal mode="edit" roles={roles} employee={employee} onClose={() => setModal('')} onSubmit={saveEdit} />}
    {(modal === 'suspend' || modal === 'restore') && <StatusConfirmModal mode={modal} employee={employee} onClose={() => setModal('')} onConfirm={confirmStatus} />}
  </main>;
}

function Info({ label, value }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

function ModalShell({ title, theme, onClose, children, labelledBy = 'employee-modal-title' }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return <div className="employee-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`employee-modal employee-modal--${theme}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}><header><h2 id={labelledBy}><span />{title}</h2><button type="button" onClick={onClose} aria-label="Đóng"><HiOutlineX /></button></header>{children}</section></div>;
}

const blankForm = { ho_ten: '', so_dien_thoai: '', email: '', vai_tro_id: '', trang_thai: 1, mat_khau: '', xac_nhan_mat_khau: '' };
function validateForm(form, mode, resetPassword, employee) {
  const errors = {};
  if (!form.ho_ten || form.ho_ten.trim().length < 2) errors.ho_ten = 'Họ và tên phải có ít nhất 2 ký tự.';
  const phone = form.so_dien_thoai.replace(/\s+/g, '');
  if (!phone) errors.so_dien_thoai = 'Vui lòng nhập số điện thoại.';
  else if (!/^\+?0\d{9}$/.test(phone)) errors.so_dien_thoai = 'Số điện thoại không hợp lệ.';
  if (mode === 'create') {
    if (!form.email || !form.email.trim()) errors.email = 'Vui lòng nhập email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email không đúng định dạng.';
  }
  if (!form.vai_tro_id) errors.vai_tro_id = 'Vui lòng chọn vai trò.';
  if (mode === 'create' || resetPassword) {
    if (!form.mat_khau) errors.mat_khau = 'Vui lòng nhập mật khẩu.';
    else if (form.mat_khau.length < 8) errors.mat_khau = 'Mật khẩu phải có ít nhất 8 ký tự.';
    if (!form.xac_nhan_mat_khau) errors.xac_nhan_mat_khau = 'Vui lòng nhập lại mật khẩu.';
    else if (form.mat_khau !== form.xac_nhan_mat_khau) errors.xac_nhan_mat_khau = 'Mật khẩu nhập lại không khớp.';
  }
  return errors;
}

function EmployeeFormModal({ mode, roles, employee, onClose, onSubmit }) {
  const creating = mode === 'create';
  
  const initForm = () => {
    if (creating) return blankForm;
    return {
      ho_ten: employee.ho_ten || '',
      so_dien_thoai: employee.so_dien_thoai || '',
      email: employee.email || '',
      vai_tro_id: employee.vai_tro?.id || '',
      trang_thai: employee.trang_thai,
      mat_khau: '', xac_nhan_mat_khau: ''
    };
  };

  const [form, setForm] = useState(initForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  
  const passwordVisible = creating || resetPassword;
  
  const change = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: '', form: '' })); setServerError(''); };
  
  const generatePassword = () => {
    if (!form.vai_tro_id) { setErrors((current) => ({ ...current, vai_tro_id: 'Vui lòng chọn vai trò trước khi tạo mật khẩu.' })); return; }
    const roleObj = roles.find(r => String(r.id) === String(form.vai_tro_id));
    const roleAbbr = roleObj ? roleObj.ten_vai_tro.replace(/\s+/g, '').slice(0,4) : 'User';
    const num = Math.floor(1000 + Math.random() * 9000);
    const password = `${roleAbbr}@${num}`;
    setForm((current) => ({ ...current, mat_khau: password, xac_nhan_mat_khau: password }));
    setErrors((current) => ({ ...current, mat_khau: '', xac_nhan_mat_khau: '' }));
  };
  
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form, mode, resetPassword, employee);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    
    const payload = { ...form };
    if (!passwordVisible) {
      delete payload.mat_khau;
      delete payload.xac_nhan_mat_khau;
    }
    
    const sError = await onSubmit(payload);
    if (sError) setServerError(sError);
  };
  
  const toggleReset = () => {
    setResetPassword((value) => !value);
    setForm((current) => ({ ...current, mat_khau: '', xac_nhan_mat_khau: '' }));
    setErrors((current) => ({ ...current, mat_khau: '', xac_nhan_mat_khau: '' }));
    setShowPassword(false); setShowConfirm(false);
  };

  return <ModalShell title={creating ? 'THÊM NHÂN VIÊN' : 'CHỈNH SỬA NHÂN VIÊN'} theme={creating ? 'create' : 'edit'} onClose={onClose}>
    <form className="employee-form" onSubmit={submit} noValidate>
      {serverError && <div className="role-error-banner" style={{marginBottom:'16px'}} role="alert"><p><HiOutlineExclamationCircle />{serverError}</p></div>}
      <fieldset><legend>THÔNG TIN NHÂN VIÊN</legend>
        <FormField label="HỌ VÀ TÊN *" error={errors.ho_ten}><input autoFocus value={form.ho_ten} onChange={(event) => change('ho_ten', event.target.value)} placeholder="Nguyễn Văn An" /></FormField>
        <div className="employee-form-grid"><FormField label="SỐ ĐIỆN THOẠI *" error={errors.so_dien_thoai}><input value={form.so_dien_thoai} onChange={(event) => change('so_dien_thoai', event.target.value)} placeholder="0901 234 567" inputMode="tel" /></FormField><FormField label={creating ? 'EMAIL *' : 'EMAIL (KHÔNG ĐỔI ĐƯỢC)'} error={errors.email}><input type="email" value={form.email} onChange={(event) => creating && change('email', event.target.value)} placeholder="nhanvien@ruventu.vn" disabled={!creating} /></FormField></div>
        <div className="employee-form-grid"><FormField label="VAI TRÒ *" error={errors.vai_tro_id}><select value={form.vai_tro_id} onChange={(event) => change('vai_tro_id', event.target.value)}><option value="">— Chọn vai trò —</option>{roles.map((role) => <option value={role.id} key={role.id}>{role.ten_vai_tro}</option>)}</select></FormField>{!creating && <FormField label="TRẠNG THÁI"><select value={form.trang_thai} onChange={(event) => change('trang_thai', Number(event.target.value))}><option value={1}>Hoạt động</option><option value={0}>Ngừng hoạt động</option></select></FormField>}</div>
      </fieldset>
      {creating && <fieldset><legend>MẬT KHẨU</legend><PasswordSection form={form} errors={errors} change={change} showPassword={showPassword} setShowPassword={setShowPassword} showConfirm={showConfirm} setShowConfirm={setShowConfirm} onGenerate={generatePassword} /></fieldset>}
      {!creating && <div className="employee-reset"><button type="button" className={`employee-reset-toggle ${resetPassword ? 'employee-reset-toggle--on' : ''}`} onClick={toggleReset}>{resetPassword ? '×' : '+'} CẤP LẠI MẬT KHẨU</button>{resetPassword && <div className="employee-reset-fields"><PasswordSection form={form} errors={errors} change={change} showPassword={showPassword} setShowPassword={setShowPassword} showConfirm={showConfirm} setShowConfirm={setShowConfirm} onGenerate={generatePassword} /></div>}</div>}
      <footer><button type="button" className="employee-btn employee-btn--outline" onClick={onClose}>HỦY</button><button type="submit" className="employee-btn employee-btn--black">{creating ? 'TẠO NHÂN VIÊN' : 'LƯU THAY ĐỔI'}</button></footer>
    </form>
  </ModalShell>;
}

function PasswordSection({ form, errors, change, showPassword, setShowPassword, showConfirm, setShowConfirm, onGenerate }) {
  return <><button type="button" className="employee-generate" onClick={onGenerate}>TẠO MẬT KHẨU TỰ ĐỘNG</button><div className="employee-form-grid"><FormField label="MẬT KHẨU *" error={errors.mat_khau}><div className="employee-password"><input type={showPassword ? 'text' : 'password'} value={form.mat_khau} onChange={(event) => change('mat_khau', event.target.value)} placeholder="Tối thiểu 8 ký tự" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}</button></div></FormField><FormField label="NHẬP LẠI MẬT KHẨU *" error={errors.xac_nhan_mat_khau}><div className="employee-password"><input type={showConfirm ? 'text' : 'password'} value={form.xac_nhan_mat_khau} onChange={(event) => change('xac_nhan_mat_khau', event.target.value)} placeholder="Nhập lại mật khẩu" /><button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}>{showConfirm ? <HiOutlineEyeOff /> : <HiOutlineEye />}</button></div></FormField></div></>;
}

function FormField({ label, error, children }) { return <label className="employee-field"><span>{label}</span>{children}{error && <small>{error}</small>}</label>; }

function StatusConfirmModal({ mode, employee, onClose, onConfirm }) {
  const suspending = mode === 'suspend';
  return <ModalShell title={suspending ? 'NGỪNG HOẠT ĐỘNG TÀI KHOẢN NHÂN VIÊN?' : 'KHÔI PHỤC HOẠT ĐỘNG TÀI KHOẢN NHÂN VIÊN?'} theme={suspending ? 'danger' : 'success'} onClose={onClose}>
    <div className="employee-confirm-body"><strong>NV{String(employee.id).padStart(5, '0')} – {employee.ho_ten.toLocaleUpperCase('vi')}</strong><p>{suspending ? 'Nhân viên sẽ không thể đăng nhập và phiên đăng nhập hiện tại sẽ bị thu hồi.' : 'Nhân viên sẽ có thể đăng nhập trở lại bình thường.'}</p></div>
    <footer className="employee-confirm-footer"><button className="employee-btn employee-btn--outline" onClick={onClose}>HỦY</button><button className={`employee-btn employee-btn--solid-${suspending ? 'danger' : 'success'}`} onClick={onConfirm}>{suspending ? 'XÁC NHẬN NGỪNG' : 'KHÔI PHỤC'}</button></footer>
  </ModalShell>;
}
