import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import './PosPaymentQRPage.css';

const BANK_INFO = {
  bankName: 'MB Bank',
  bankCode: 'MB',
  accountNumber: '35666888856789',
  accountHolder: 'PHAM NGOC GIA BAO',
};

export default function PosPaymentQRPage() {
  const [searchParams] = useSearchParams();

  const [paymentData] = useState(() => {
    const codeParam = searchParams.get('code');
    const amountParam = searchParams.get('amount');
    const orderIdParam = searchParams.get('orderId');

    if (codeParam) {
      return {
        orderCode: codeParam,
        amount: Number(amountParam) || 0,
        orderId: orderIdParam || '',
      };
    }

    try {
      const stored = sessionStorage.getItem('pos_current_qr');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          orderCode: parsed.transferCode || parsed.orderCode || 'DH-POS',
          amount: Number(parsed.amount) || 0,
          orderId: parsed.orderId || '',
        };
      }
    } catch {}

    return {
      orderCode: 'DH-POS',
      amount: 0,
      orderId: '',
    };
  });

  const [isConfirming, setIsConfirming] = useState(false);
  const { orderCode, amount } = paymentData;

  const qrImageUrl = `https://img.vietqr.io/image/${BANK_INFO.bankCode}-${BANK_INFO.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(BANK_INFO.accountHolder)}`;

  const handleClose = () => {
    window.close();
  };

  const handleConfirmPaid = () => {
    setIsConfirming(true);

    const payload = {
      type: 'POS_QR_PAYMENT_CONFIRMED',
      transferCode: orderCode,
      amount,
      timestamp: Date.now(),
    };

    // 1. Gửi qua BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('pos_payment_sync');
        channel.postMessage(payload);
        channel.close();
      }
    } catch (e) {}

    // 2. Gửi qua window.opener postMessage
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, '*');
      }
    } catch (e) {}

    // 3. Gửi qua localStorage event fallback
    try {
      localStorage.setItem('pos_payment_confirmed_event', JSON.stringify(payload));
    } catch (e) {}

    // Đóng cửa sổ sau một chút để tin nhắn chắc chắn được truyền đi
    setTimeout(() => {
      window.close();
    }, 200);
  };

  return (
    <div className="pos-qr-page-wrapper">
      <div className="pos-qr-page-container">
        <div className="pos-qr-card">
          {/* Header */}
          <div className="pos-qr-card-header">
            <div className="header-left">
              <span className="pos-qr-badge">VIETQR 24/7</span>
              <h2>TIẾN HÀNH THANH TOÁN CHUYỂN KHOẢN</h2>
            </div>
            <div className="header-right">
              <span className="pos-qr-order-tag">
                Mã đơn: <strong>{orderCode}</strong>
              </span>
            </div>
          </div>

          {/* Body Content (2 Columns) */}
          <div className="pos-qr-card-body">
            {/* Cột trái: Ảnh QR */}
            <div className="pos-qr-visual-col">
              <div className="pos-qr-image-frame">
                <img
                  src={qrImageUrl}
                  alt={`Mã QR thanh toán cho đơn hàng ${orderCode}`}
                  className="pos-qr-img"
                />
              </div>
              <p className="pos-qr-scan-guide">
                Sử dụng App <strong>MBBank</strong>, ứng dụng ngân hàng bất kỳ hoặc ví điện tử để quét mã QR thanh toán nhanh
              </p>
            </div>

            {/* Cột phải: Khu vực để bạn tự thêm thông tin khác (đã bỏ phần khung đỏ thông tin ngân hàng & lưu ý) */}
            <div className="pos-qr-custom-info-col">
              {/* TODO: Bạn có thể tự thêm thông tin khác vào khu vực này */}
            </div>
          </div>

          {/* Action Buttons: HỦY và XÁC NHẬN ĐÃ CHUYỂN KHOẢN */}
          <div className="pos-qr-card-actions">
            <button
              type="button"
              className="btn-pos-qr-cancel"
              onClick={handleClose}
            >
              HỦY
            </button>

            <button
              type="button"
              className="btn-pos-qr-confirm"
              onClick={handleConfirmPaid}
              disabled={isConfirming}
            >
              <Check size={16} />
              <span>{isConfirming ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐÃ CHUYỂN KHOẢN'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
