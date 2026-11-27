import React from 'react';
import './CashbookBadges.css';

export const groupConfig = {
  KHACH_HANG: {
    label: 'KHÁCH HÀNG',
    className: 'badge-customer',
  },
  NHAN_VIEN: {
    label: 'NHÂN VIÊN',
    className: 'badge-employee',
  },
  NHA_CUNG_CAP: {
    label: 'NHÀ CUNG CẤP',
    className: 'badge-supplier',
  },
  DOI_TAC_GIAO_HANG: {
    label: 'ĐỐI TÁC GIAO HÀNG',
    className: 'badge-shipping',
  },
  KHAC: {
    label: 'KHÁC',
    className: 'badge-other',
  },
};

export const methodConfig = {
  TIEN_MAT: {
    label: 'TIỀN MẶT',
    className: 'method-cash',
  },
  CHUYEN_KHOAN: {
    label: 'CHUYỂN KHOẢN',
    className: 'method-transfer',
  },
  THE: {
    label: 'QUẸT THẺ',
    className: 'method-card',
  },
};

export function CashGroupBadge({ group, size = 'normal' }) {
  if (!group) return <span>—</span>;
  const config = groupConfig[group] || {
    label: group,
    className: 'badge-other',
  };

  return (
    <span className={`cash-group-badge ${config.className} size-${size}`}>
      {config.label}
    </span>
  );
}

export function PaymentMethodBadge({ method, size = 'normal' }) {
  if (!method) return <span>—</span>;
  const config = methodConfig[method] || {
    label: method,
    className: 'method-other',
  };

  return (
    <span className={`cash-method-badge ${config.className} size-${size}`}>
      {config.label}
    </span>
  );
}
