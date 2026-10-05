import { useEffect, useRef } from 'react';
import '../pages/ChiTietDonHang.css';

export default function OrderModal({ title, subtitle, children, busy, close, submit, disabled = false, error = '', confirmLabel = 'XÁC NHẬN', cancelLabel = 'QUAY LẠI', className = '', showClose = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.querySelector('input, select, textarea, button')?.focus();
    return () => previous?.focus();
  }, []);
  const keys = (event) => {
    if (event.key === 'Escape' && !busy) close();
    if (event.key !== 'Tab') return;
    const controls = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
    const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div className="order-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) close(); }}>
    <form ref={ref} className={`order-cancel-modal order-operation-modal ${className}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={keys} onSubmit={(event) => { event.preventDefault(); if (!busy && !disabled) submit(); }}>
      <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{showClose && <button type="button" aria-label="Đóng" disabled={busy} onClick={close}>×</button>}</header>
      <fieldset disabled={busy} className="order-operation-fields">{children}</fieldset>
      {error && <p className="order-api-message order-api-message--error" role="alert">{error}</p>}
      <footer><button type="button" className="order-action order-action--back" disabled={busy} onClick={close}>{cancelLabel}</button><button type="submit" className="order-action order-action--black" disabled={busy || disabled}>{busy ? 'ĐANG LƯU...' : confirmLabel}</button></footer>
    </form>
  </div>;
}
