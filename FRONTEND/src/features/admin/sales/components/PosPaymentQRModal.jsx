import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import './PosPaymentQRModal.css';

const BANK_INFO = {
  bankName: 'MB Bank',
  bankCode: 'MB',
  accountNumber: '35666888856789',
  accountHolder: 'PHAM NGOC GIA BAO',
};

export default function PosPaymentQRModal({ order, totals, onConfirm, onClose }) {
  const dialogRef = useRef(null);
  const [copiedField, setCopiedField] = useState('');

  // Lấy hoặc tự sinh mã chuyển khoản đồng nhất theo mã đơn
  const [transferCode] = useState(() => {
    if (order.transferCode) return order.transferCode;
    if (order.transactionCode && order.transactionCode.trim()) {
      return order.transactionCode.trim();
    }
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return `DH-${dateStr}-${String(order.id).padStart(6, '0')}`;
  });

  const amount = totals?.total != null && totals.total > 0
    ? totals.total
    : order.paid > 0
      ? order.paid
      : 0;

  useEffect(() => {
    const element = dialogRef.current;
    if (element && !element.open) {
      element.showModal();
    }
    return () => {
      if (element && element.open) {
        element.close();
      }
    };
  }, []);

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

  const qrImageUrl = `https://img.vietqr.io/image/${BANK_INFO.bankCode}-${BANK_INFO.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferCode)}&accountName=${encodeURIComponent(BANK_INFO.accountHolder)}`;

  const handleConfirm = () => {
    onConfirm({
      transferCode,
      transactionCode: transferCode,
      paid: amount,
      paymentReceived: true,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="pos-qr-dialog"
      aria-labelledby="pos-qr-info-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="pos-qr-modal-content">
        <div className="pos-qr-modal-body">
          {/* Cột trái: Ảnh QR */}
          <div className="pos-qr-left-col">
            <div className="pos-qr-frame">
              <img
                src={qrImageUrl}
                alt={`Mã QR thanh toán cho đơn hàng ${transferCode}`}
                className="pos-qr-img"
              />
            </div>
            <p className="pos-qr-scan-guide">
              Sử dụng App <strong>MBBank</strong>, ứng dụng ngân hàng bất kỳ hoặc ví điện tử để quét mã QR thanh toán nhanh
            </p>
          </div>

          {/* Cột phải: Thông tin chuyển khoản */}
          <div className="pos-qr-right-col">
            <div className="pos-qr-header-title">
              <span className="accent-bar"></span>
              <h3 id="pos-qr-info-title">THÔNG TIN CHUYỂN KHOẢN</h3>
            </div>

            <div className="pos-qr-info-table">
              <div className="pos-qr-row">
                <span className="pos-qr-row-label">NGÂN HÀNG</span>
                <span className="pos-qr-val bold">{BANK_INFO.bankName}</span>
              </div>

              <div className="pos-qr-row">
                <span className="pos-qr-row-label">CHỦ TÀI KHOẢN</span>
                <span className="pos-qr-val bold">{BANK_INFO.accountHolder}</span>
              </div>

              <div className="pos-qr-row">
                <span className="pos-qr-row-label">SỐ TÀI KHOẢN</span>
                <div className="pos-qr-row-val-group">
                  <span className="pos-qr-val bold val-acc">{BANK_INFO.accountNumber}</span>
                  <button
                    type="button"
                    className="pos-qr-btn-copy"
                    onClick={() => handleCopy(BANK_INFO.accountNumber, 'acc')}
                  >
                    {copiedField === 'acc' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedField === 'acc' ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP'}</span>
                  </button>
                </div>
              </div>

              <div className="pos-qr-row highlight-row">
                <span className="pos-qr-row-label">SỐ TIỀN</span>
                <div className="pos-qr-row-val-group">
                  <span className="pos-qr-val bold val-amount">{formatPrice(amount)}</span>
                  <button
                    type="button"
                    className="pos-qr-btn-copy"
                    onClick={() => handleCopy(amount, 'amount')}
                  >
                    {copiedField === 'amount' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedField === 'amount' ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP'}</span>
                  </button>
                </div>
              </div>

              <div className="pos-qr-row">
                <span className="pos-qr-row-label">NỘI DUNG CHUYỂN KHOẢN</span>
                <div className="pos-qr-row-val-group">
                  <span className="pos-qr-val bold val-code">{transferCode}</span>
                  <button
                    type="button"
                    className="pos-qr-btn-copy"
                    onClick={() => handleCopy(transferCode, 'code')}
                  >
                    {copiedField === 'code' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedField === 'code' ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lưu ý quan trọng */}
            <div className="pos-qr-notice">
              <div className="pos-qr-notice-title">
                <AlertCircle size={15} />
                <span>LƯU Ý QUAN TRỌNG:</span>
              </div>
              <ul className="pos-qr-notice-list">
                <li>
                  Vui lòng nhập <strong>chính xác nội dung chuyển khoản</strong> là <strong>{transferCode}</strong> để hệ thống tự động xác nhận đơn hàng nhanh nhất.
                </li>
                <li>
                  Không tự ý chỉnh sửa số tiền thanh toán <strong>{formatPrice(amount)}</strong> khi quét mã.
                </li>
                <li>
                  Sau khi chuyển khoản thành công trên app ngân hàng, vui lòng nhấn nút <strong>"XÁC NHẬN ĐÃ CHUYỂN KHOẢN"</strong> bên dưới.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="pos-qr-footer">
          <button
            type="button"
            className="pos-qr-btn-cancel"
            onClick={onClose}
          >
            HỦY
          </button>
          <button
            type="button"
            className="pos-qr-btn-confirm"
            onClick={handleConfirm}
          >
            <Check size={16} />
            <span>XÁC NHẬN ĐÃ CHUYỂN KHOẢN</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
