import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check, Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import './Auth.css';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ account: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [loginFailed, setLoginFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Tài khoản hoặc mật khẩu không chính xác.');
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
      setLoginFailed(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.account.trim()) newErrors.account = 'Vui lòng nhập email hoặc số điện thoại';
    if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoginFailed(true);
      setErrorMessage('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    
    setLoading(true);
    setLoginFailed(false);

    // Xử lý riêng cho tài khoản Admin giả lập (mock)
    if (formData.account === 'admin' && formData.password === 'Admin@123') {
      localStorage.setItem('user', JSON.stringify({ 
        name: 'Admin', 
        role: 'admin',
        email: 'admin@ruventu.com'
      }));
      setUserName('Admin');
      setIsLoginSuccess(true);
      setLoading(false);
      return;
    }

    // Xử lý riêng cho tài khoản bị khóa giả lập (mock) để test UI
    if (formData.account === 'locked@ruventu.com' && formData.password === 'User@123') {
      navigate('/404', { state: { type: 'account' } });
      return;
    }

    try {
      const response = await axios.post('http://localhost:8080/api/v1/auth/login', {
        tai_khoan: formData.account,
        mat_khau: formData.password,
        ghi_nho_dang_nhap: formData.remember
      });
      
      // Axios trả về dữ liệu trong response.data
      const result = response.data;
      
      if (result.data) {
        // Lưu token
        localStorage.setItem('accessToken', result.data.access_token);
        
        // Lưu thông tin user
        const userData = result.data.user;
        const nameToDisplay = userData?.ho_ten || formData.account;
        
        localStorage.setItem('user', JSON.stringify({ 
          name: nameToDisplay, 
          role: userData?.vai_tro_id === 1 ? 'admin' : 'user',
          avatar: userData?.anh_dai_dien 
        }));
        
        setUserName(nameToDisplay);
        setIsLoginSuccess(true);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        navigate('/404', { state: { type: 'account' } });
        return;
      }
      setLoginFailed(true);
      setErrorMessage(error.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoginSuccess) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fff', padding: '20px' }}>
        <div className="login-success-box">
          <div className="login-success-header">ĐĂNG NHẬP THÀNH CÔNG</div>
          <div className="login-success-content">
            <div className="success-icon-box">
              <Check size={24} className="check-icon" />
            </div>
            <div className="success-title">CHÀO MỪNG TRỞ LẠI!</div>
            <div className="success-desc">Xin chào <b>{userName}</b>, chúc bạn mua sắm vui vẻ!</div>
            <button className="btn-home" onClick={() => navigate('/')}>VỀ TRANG CHỦ</button>
          </div>
        </div>
      </div>
    );
  }

  const leftContent = (
    <>
      <h1 className="auth-left-title">
        CHÀO MỪNG<br />
        <span>TRỞ LẠI</span><br />
        REVENTU
      </h1>
      <p className="auth-left-desc">
        Đăng nhập để theo dõi đơn hàng, nhận ưu đãi thành viên và truy cập lịch sử mua sắm.
      </p>
      <div style={{ marginTop: 'auto' }}></div>
    </>
  );

  return (
    <AuthLayout leftContent={leftContent}>
      <div className="auth-form-container">
        <div className="auth-tag">THÀNH VIÊN REVENTU</div>
        <h2 className="auth-title">ĐĂNG NHẬP</h2>
        <p className="auth-subtitle">Chưa có tài khoản? <Link to="/register">ĐĂNG KÝ NGAY</Link></p>

        {loginFailed && (
          <div className="alert-banner">
            <AlertCircle className="alert-banner-icon" size={20} />
            <div className="alert-banner-content">
              <h3 className="alert-title">ĐĂNG NHẬP THẤT BẠI</h3>
              <p className="alert-desc">{errorMessage}</p>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>TÀI KHOẢN <span>*</span></label>
            <input 
              type="text" 
              name="account"
              value={formData.account}
              onChange={handleChange}
              className={`form-input ${errors.account ? 'error' : ''}`} 
              placeholder="Email hoặc số điện thoại" 
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>MẬT KHẨU <span>*</span></label>
              <a href="#">QUÊN MẬT KHẨU?</a>
            </div>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`} 
                placeholder="Nhập mật khẩu" 
              />
              {showPassword ? 
                <EyeOff className="eye-icon" size={18} onClick={() => setShowPassword(false)} /> : 
                <Eye className="eye-icon" size={18} onClick={() => setShowPassword(true)} />
              }
            </div>
          </div>

          <div className="checkbox-group">
            <input 
              type="checkbox" 
              id="remember" 
              name="remember"
              checked={formData.remember}
              onChange={handleChange}
            />
            <label htmlFor="remember">Ghi nhớ đăng nhập <span>(phiên tạm thời)</span></label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}> <Loader2 className="spinner" size={18} /> ĐANG ĐĂNG NHẬP...</span> : 'ĐĂNG NHẬP'}
          </button>
          
          <div className="divider">HOẶC</div>
          
          <Link to="/register" style={{textDecoration: 'none', display: 'block'}}>
            <button type="button" className="btn-secondary" style={{width: '100%'}}>TẠO TÀI KHOẢN MỚI</button>
          </Link>

          <p className="terms-text" style={{textAlign: 'center', marginTop: '20px'}}>
            Bằng cách đăng nhập, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a>.
          </p>
        </form>
      </div>
    </AuthLayout>
  );
};

export default Login;
