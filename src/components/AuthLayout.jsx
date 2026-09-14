import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './AuthLayout.css';
import logo from '../assets/reventu_white.png';

const AuthLayout = ({ leftContent, children }) => {
  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-left-overlay"></div>
        <div className="auth-left-content">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} /> VỀ TRANG CHỦ
          </Link>
          <img src={logo} alt="Ruventu Logo" className="auth-logo" />
          {leftContent}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-right-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
