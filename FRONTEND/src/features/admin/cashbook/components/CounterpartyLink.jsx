import React from 'react';
import { Link } from 'react-router-dom';
import './CounterpartyLink.css';

export function getCounterpartyUrl(item, displayName) {
  const name = displayName || item?.ten_nguoi_nop_nhan || '';
  const group = item?.nhom_nguoi_nop_nhan;
  const personId = item?.nguoi_nop_nhan_id;
  const supplierId = item?.nha_cung_cap_id;
  const partnerId = item?.doi_tac_van_chuyen_id;

  if (group === 'KHACH_HANG') {
    if (personId) {
      return `/admin/khach-hang-doi-tac/khach-hang/${personId}`;
    }
    if (name && name.trim().toLowerCase() !== 'khách lẻ') {
      return `/admin/khach-hang-doi-tac/khach-hang?keyword=${encodeURIComponent(name.trim())}`;
    }
    return '/admin/khach-hang-doi-tac/khach-hang';
  }

  if (group === 'NHA_CUNG_CAP') {
    const sId =
      supplierId ||
      personId ||
      (Number.isInteger(Number(name)) ? Number(name) : null);
    if (sId) {
      return `/admin/khach-hang-doi-tac/nha-cung-cap?id=${sId}`;
    }
    return '/admin/khach-hang-doi-tac/nha-cung-cap';
  }

  if (group === 'NHAN_VIEN') {
    if (personId) {
      return `/admin/nhan-vien/${personId}`;
    }
    return '/admin/nhan-vien/danh-sach';
  }

  if (group === 'DOI_TAC_GIAO_HANG') {
    const pId = partnerId || personId;
    if (pId) {
      return `/admin/khach-hang-doi-tac/doi-tac-van-chuyen?id=${pId}`;
    }
    return '/admin/khach-hang-doi-tac/doi-tac-van-chuyen';
  }

  if (personId) {
    return `/admin/khach-hang-doi-tac/khach-hang/${personId}`;
  }
  if (name) {
    return `/admin/khach-hang-doi-tac/khach-hang?keyword=${encodeURIComponent(name.trim())}`;
  }
  return '/admin/khach-hang-doi-tac/khach-hang';
}

export function CounterpartyLink({ item, name, className = '' }) {
  const displayName = name || item?.ten_nguoi_nop_nhan || '—';

  if (!displayName || displayName === '—') {
    return <span>—</span>;
  }

  const url = getCounterpartyUrl(item, displayName);

  return (
    <Link
      to={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`counterparty-link ${className}`}
      onClick={(e) => e.stopPropagation()}
      title={`Mở chi tiết ${displayName} (tab mới)`}
    >
      {displayName}
    </Link>
  );
}

export default CounterpartyLink;
