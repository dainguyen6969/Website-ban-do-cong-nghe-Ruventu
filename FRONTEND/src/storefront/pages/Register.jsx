import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState('weak'); // weak, medium, strong
  const [pwCriteria, setPwCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const checkPasswordStrength = (pw) => {
    const criteria = {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw)
    };
    setPwCriteria(criteria);

    const validCount = Object.values(criteria).filter(Boolean).length;
    if (validCount <= 2) setPasswordStrength('weak');
    else if (validCount <= 4) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên.';
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Địa chỉ email không hợp lệ.';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!/^(0[1-9][0-9]{8})$/.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678).';
    }
    
    const validCount = Object.values(pwCriteria).filter(Boolean).length;
    if (validCount < 5) {
      newErrors.password = 'Mật khẩu chưa đáp ứng đủ yêu cầu bảo mật.';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
      newErrors.confirmPasswordMismatch = 'Mật khẩu chưa khớp';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    console.log('Register successful', formData);
    navigate('/login');
  };

  const leftContent = (
    <>
      <h1 className="auth-left-title">
        THAM GIA<br />
        <span>REVENTU</span><br />
        NGAY HÔM NAY
      </h1>
      <p className="auth-left-desc">
        Tạo tài khoản để theo dõi đơn hàng, nhận ưu đãi thành viên và tư vấn build PC miễn phí.
      </p>
      <div style={{ marginTop: 'auto' }}></div>
    </>
  );

  return (
    <AuthLayout leftContent={leftContent}>
      <div className="auth-form-container">
        <div className="auth-tag">KHÁCH HÀNG MỚI</div>
        <h2 className="auth-title">ĐĂNG KÝ TÀI KHOẢN</h2>
        <p className="auth-subtitle">Đã có tài khoản? <Link to="/login">ĐĂNG NHẬP</Link></p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>HỌ VÀ TÊN <span>*</span></label>
            <input 
              type="text" 
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`form-input ${errors.fullName ? 'error' : ''}`} 
              placeholder="Nguyễn Văn A" 
            />
            {errors.fullName && <span className="error-text"><AlertCircle size={14} /> {errors.fullName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>EMAIL <span>*</span></label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`} 
                placeholder="email@example.com" 
              />
              {errors.email && <span className="error-text"><AlertCircle size={14} /> {errors.email}</span>}
            </div>
            <div className="form-group">
              <label>SỐ ĐIỆN THOẠI <span>*</span></label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`form-input ${errors.phone ? 'error' : ''}`} 
                placeholder="0912 345 678" 
              />
              {errors.phone && <span className="error-text"><AlertCircle size={14} /> {errors.phone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>MẬT KHẨU <span>*</span></label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`} 
                placeholder="Tối thiểu 8 ký tự" 
              />
              {showPassword ? 
                <EyeOff className="eye-icon" size={18} onClick={() => setShowPassword(false)} /> : 
                <Eye className="eye-icon" size={18} onClick={() => setShowPassword(true)} />
              }
            </div>
            {formData.password.length > 0 && (
              <div className="password-strength-container">
                <div className="strength-bars">
                  <div className={`strength-bar ${passwordStrength === 'weak' || passwordStrength === 'medium' || passwordStrength === 'strong' ? 'active weak' : ''}`}></div>
                  <div className={`strength-bar ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'active medium' : ''}`}></div>
                  <div className={`strength-bar ${passwordStrength === 'strong' ? 'active strong' : ''}`}></div>
                </div>
                <span className={`strength-label ${passwordStrength}`}>
                  {passwordStrength === 'weak' ? 'Yếu' : passwordStrength === 'medium' ? 'Trung bình' : 'Mạnh'}
                </span>
                
                <div className="password-checklist">
                  <div className={`checklist-item ${pwCriteria.length ? 'valid' : 'invalid'}`}>
                    {pwCriteria.length ? <Check size={14} className="checklist-icon" /> : <X size={14} className="checklist-icon" />}
                    Ít nhất 8 ký tự
                  </div>
                  <div className={`checklist-item ${pwCriteria.uppercase ? 'valid' : 'invalid'}`}>
                    {pwCriteria.uppercase ? <Check size={14} className="checklist-icon" /> : <X size={14} className="checklist-icon" />}
                    1 chữ hoa (A-Z)
                  </div>
                  <div className={`checklist-item ${pwCriteria.lowercase ? 'valid' : 'invalid'}`}>
                    {pwCriteria.lowercase ? <Check size={14} className="checklist-icon" /> : <X size={14} className="checklist-icon" />}
                    1 chữ thường (a-z)
                  </div>
                  <div className={`checklist-item ${pwCriteria.number ? 'valid' : 'invalid'}`}>
                    {pwCriteria.number ? <Check size={14} className="checklist-icon" /> : <X size={14} className="checklist-icon" />}
                    1 chữ số (0-9)
                  </div>
                  <div className={`checklist-item ${pwCriteria.special ? 'valid' : 'invalid'}`}>
                    {pwCriteria.special ? <Check size={14} className="checklist-icon" /> : <X size={14} className="checklist-icon" />}
                    1 ký tự đặc biệt (!@#...)
                  </div>
                </div>
              </div>
            )}
            {errors.password && <span className="error-text"><AlertCircle size={14} /> {errors.password}</span>}
          </div>

          <div className="form-group">
            <label>XÁC NHẬN MẬT KHẨU <span>*</span></label>
            <div className="password-input-wrapper">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`} 
                placeholder="Nhập lại mật khẩu" 
              />
              {showConfirmPassword ? 
                <EyeOff className="eye-icon" size={18} onClick={() => setShowConfirmPassword(false)} /> : 
                <Eye className="eye-icon" size={18} onClick={() => setShowConfirmPassword(true)} />
              }
            </div>
            {errors.confirmPasswordMismatch && <span className="error-text" style={{marginTop: '4px', marginBottom: '0'}}><X size={14} /> {errors.confirmPasswordMismatch}</span>}
            {errors.confirmPassword && <span className="error-text"><AlertCircle size={14} /> {errors.confirmPassword}</span>}
          </div>

          <p className="terms-text">
            Bằng cách đăng ký, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a> của Reventu.
          </p>

          <button type="submit" className="btn-primary">ĐĂNG KÝ NGAY</button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default Register;
