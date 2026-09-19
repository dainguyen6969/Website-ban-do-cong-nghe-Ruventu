import { useEffect, useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import useCustomers from '../context/useCustomers';

const emptyForm = { name: '', phone: '', email: '', city: '', ward: '', address: '' };

export default function AddCustomerModal({ open, onClose, onCreated }) {
  const { addCustomer } = useCustomers();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const close = () => {
    setForm(emptyForm);
    setErrors({});
    onClose();
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
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
    const customer = addCustomer(form);
    onCreated?.(customer);
    close();
  };

  return (
    <div className="customer-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="customer-add-modal" role="dialog" aria-modal="true" aria-labelledby="add-customer-title">
        <header><h2 id="add-customer-title"><span />THÊM KHÁCH HÀNG</h2><button type="button" onClick={close} aria-label="Đóng"><HiOutlineX size={18} /></button></header>
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
          <footer><button type="button" className="customer-btn customer-btn--outline" onClick={close}>HỦY</button><button type="submit" className="customer-btn customer-btn--black">LƯU KHÁCH HÀNG</button></footer>
        </form>
      </section>
    </div>
  );
}

function CustomerField({ label, value, onChange, placeholder, error, ...inputProps }) {
  return <label className={`customer-form-field ${error ? 'customer-form-field--error' : ''}`}><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} {...inputProps} />{error && <small>{error}</small>}</label>;
}
