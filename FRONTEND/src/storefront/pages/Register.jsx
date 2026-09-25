import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check, X, Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import './Auth.css';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    otp: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [passwordStrength, setPasswordStrength] = useState('weak');
  const [pwCriteria, setPwCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  
  // Registration Flow States
  const [step, setStep] = useState(1); // 1: Register Form, 2: OTP Verification
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

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
    // Only allow numbers for OTP
    if (name === 'otp' && !/^\d*$/.test(value)) return;
    
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
    
    const newErrors = { ...errors };
    if (newErrors[name]) {
      newErrors[name] = '';
    }
    // Xóa lỗi lệch mật khẩu ngay khi người dùng gõ sửa lại
    if (name === 'password' || name === 'confirmPassword') {
      newErrors.confirmPasswordMismatch = '';
      newErrors.confirmPassword = '';
    }
    setErrors(newErrors);
  };

  const validateEmail = () => {
    if (!formData.email.trim()) {
      return 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Địa chỉ email không hợp lệ.';
    }
    return null;
  };

  const validatePhone = () => {
    if (!formData.phone.trim()) {
      return 'Vui lòng nhập số điện thoại.';
    } else if (!/^(0[1-9][0-9]{8})$/.test(formData.phone.replace(/\s+/g, ''))) {
      return 'Số điện thoại không hợp lệ (VD: 0912345678).';
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên.';
    
    const emailError = validateEmail();
    if (emailError) newErrors.email = emailError;
    
    const phoneError = validatePhone();
    if (phoneError) newErrors.phone = phoneError;
    
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

  const handleRegister = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    setServerError('');
    
    try {
      await axios.post('http://localhost:8080/api/v1/auth/register', {
        ho_ten: formData.fullName,
        email: formData.email,
        so_dien_thoai: formData.phone,
        mat_khau: formData.password,
        xac_nhan_mat_khau: formData.confirmPassword
      });
      
      // Success, move to step 2
      setStep(2);
      setOtpTimer(60);
    } catch (error) {
      let errorMsg = error.response?.data?.message;
      if (errorMsg === 'Dữ liệu bị xung đột') {
        errorMsg = 'Số điện thoại hoặc Email này đã được sử dụng. Vui lòng dùng thông tin khác.';
      }
      setServerError(errorMsg || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!formData.otp.trim() || formData.otp.length < 6) {
      setErrors({ ...errors, otp: 'Vui lòng nhập mã OTP 6 số.' });
      return;
    }

    setLoading(true);
    setServerError('');
    
    try {
      await axios.post('http://localhost:8080/api/v1/auth/verify-otp', {
        tai_khoan: formData.email,
        otp_code: formData.otp
      });
      navigate('/login');
    } catch (error) {
      setServerError(error.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    
    setLoading(true);
    setServerError('');
    
    try {
      await axios.post('http://localhost:8080/api/v1/auth/otp/resend', {
        tai_khoan: formData.email
      });
      setOtpTimer(60);
    } catch (error) {
      setServerError(error.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
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
        <h2 className="auth-title">{step === 1 ? 'ĐĂNG KÝ TÀI KHOẢN' : 'XÁC THỰC OTP'}</h2>
        <p className="auth-subtitle">
          {step === 1 ? (
            <>Đã có tài khoản? <Link to="/login">ĐĂNG NHẬP</Link></>
          ) : (
            <>Mã xác nhận đã được gửi đến email <b>{formData.email}</b></>
          )}
        </p>

        {serverError && (
          <div className="server-error" style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {serverError}
          </div>
        )}

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleRegister}>
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

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}> <Loader2 className="spinner" size={18} /> ĐANG XỬ LÝ...</span> : 'ĐĂNG KÝ NGAY'}
            </button>
          </form>
        ) : (
          <form className="auth-form animate-fade-in" onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label>MÃ XÁC NHẬN OTP <span>*</span></label>
              <input 
                type="text" 
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                className={`form-input ${errors.otp ? 'error' : ''}`} 
                placeholder="Nhập mã 6 chữ số gửi về email" 
                maxLength={6}
              />
              {errors.otp && <span className="error-text"><AlertCircle size={14} /> {errors.otp}</span>}
            </div>
            
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginBottom: '16px' }}>
              {loading ? <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}> <Loader2 className="spinner" size={18} /> ĐANG XÁC THỰC...</span> : 'XÁC NHẬN'}
            </button>
            
            <div style={{ textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={handleResendOtp}
                disabled={otpTimer > 0 || loading}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: otpTimer > 0 ? '#9ca3af' : '#dc2626', 
                  cursor: otpTimer > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {otpTimer > 0 ? `Gửi lại mã sau ${otpTimer}s` : 'Gửi lại mã OTP'}
              </button>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
              >
                Quay lại sửa thông tin
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};

export default Register;
