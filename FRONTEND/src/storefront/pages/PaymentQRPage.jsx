import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Copy, Check, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './PaymentQRPage.css';

const BANK_INFO = {
  bankName: 'MB Bank',
  bankCode: 'MB',
  accountNumber: '35666888856789',
  accountHolder: 'PHAM NGOC GIA BAO',
};

export default function PaymentQRPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [paymentData] = useState(() => {
    if (location.state?.orderCode) {
      return location.state;
    }
    try {
      const stored = sessionStorage.getItem('last_payment_order');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [copiedField, setCopiedField] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!paymentData?.orderCode) {
      navigate('/cart', { replace: true });
    }
  }, [paymentData, navigate]);

  if (!paymentData?.orderCode) {
    return null;
  }

  const { orderCode, amount = 0, intake } = paymentData;

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString('vi-VN') + 'đ';
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField('');
    }, 2000);
  };

  const qrImageUrl = `https://img.vietqr.io/image/${BANK_INFO.bankCode}-${BANK_INFO.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(BANK_INFO.accountHolder)}`;

  const handleCancel = () => {
    navigate('/cart');
  };

  const handleConfirmPaid = () => {
    setIsConfirming(true);
    navigate('/success', {
      state: {
        orderCode,
        intake,
        paid: true,
      },
    });
  };

  return (
    <div className="payment-qr-page-wrapper">
      <Header />

      <div className="payment-qr-container">
        {/* Breadcrumb */}
        <div className="payment-breadcrumb">
          <Link to="/cart">GIỎ HÀNG</Link> <span>&rsaquo;</span>
          <Link to="/checkout">THANH TOÁN</Link> <span>&rsaquo;</span>
          <span className="current">TIẾN HÀNH THANH TOÁN</span>
        </div>

        <div className="payment-qr-box">
          {/* Header */}
          <div className="payment-qr-header">
            <div className="header-left">
              <span className="qr-badge">VIETQR 24/7</span>
              <h2>TIẾN HÀNH THANH TOÁN CHUYỂN KHOẢN</h2>
            </div>
            <div className="header-right">
              <span className="order-tag">
                Mã đơn: <strong>{orderCode}</strong>
              </span>
            </div>
          </div>

          {/* Body Content (2 Columns) */}
          <div className="payment-qr-body">
            {/* Left Column: QR Code */}
            <div className="payment-qr-visual">
              <div className="qr-image-frame">
                <img
                  src={qrImageUrl}
                  alt={`Mã QR thanh toán cho đơn hàng ${orderCode}`}
                  className="qr-image"
                />
              </div>
              <p className="qr-scan-guide">
                Sử dụng App <strong>MBBank</strong>, ứng dụng ngân hàng bất kỳ hoặc ví điện tử để quét mã QR thanh toán nhanh
              </p>
            </div>

            {/* Right Column: Khu vực để bạn tự thêm thông tin khác (đã bỏ phần khung đỏ thông tin ngân hàng & lưu ý) */}
            <div className="payment-info-column payment-custom-info-container">
              {/* TODO: Bạn có thể tự thêm thông tin khác vào khu vực này */}
            </div>
          </div>

          {/* Action Buttons: HỦY và XÁC NHẬN ĐÃ CHUYỂN KHOẢN cạnh nhau */}
          <div className="payment-qr-actions">
            <button
              type="button"
              className="btn-payment-cancel"
              onClick={handleCancel}
            >
              HỦY
            </button>

            <button
              type="button"
              className="btn-payment-confirm"
              onClick={handleConfirmPaid}
              disabled={isConfirming}
            >
              <Check size={18} />
              <span>{isConfirming ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐÃ CHUYỂN KHOẢN'}</span>
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
