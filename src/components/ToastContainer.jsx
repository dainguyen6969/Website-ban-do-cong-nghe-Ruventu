import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import './ToastContainer.css';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleCartUpdate = () => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: 'Đã thêm sản phẩm vào giỏ hàng thành công!' }]);
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter(toast => toast.id !== id));
      }, 3000);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className="toast-item">
          <div className="toast-icon">
            <Check size={24} color="#fff" strokeWidth={3} />
          </div>
          <div className="toast-content">
            {toast.message}
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
