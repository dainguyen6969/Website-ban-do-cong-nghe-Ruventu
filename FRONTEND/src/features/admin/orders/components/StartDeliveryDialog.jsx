import { useEffect, useState } from 'react';
import { searchDeliveryPartners } from '../api/orderApi';
import OrderModal from './OrderModal';

const partnerText = (partner) => [partner.ten_doi_tac, partner.so_dien_thoai].filter(Boolean).join(' · ');

export default function StartDeliveryDialog({ order, busy, error, close, submit }) {
  const [query, setQuery] = useState('');
  const [fee, setFee] = useState('');
  const [partners, setPartners] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState({ loading: false, error: '' });
  useEffect(() => {
    if (selected) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch({ loading: true, error: '' });
      try {
        const data = await searchDeliveryPartners(query.trim(), controller.signal);
        if (!controller.signal.aborted) { setPartners(data.items || []); setSearch({ loading: false, error: '' }); }
      } catch (failure) {
        if (!controller.signal.aborted) { setPartners([]); setSearch({ loading: false, error: failure.message }); }
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, selected]);
  const valid = selected && fee.trim() !== '' && Number.isFinite(Number(fee)) && Number(fee) >= 0 && Number(fee) <= 9999999999999.99;
  return <OrderModal title="BẮT ĐẦU XỬ LÝ GIAO HÀNG" className="order-start-delivery" showClose cancelLabel="HỦY" confirmLabel="XÁC NHẬN BẮT ĐẦU XỬ LÝ" busy={busy} close={close} error={error || search.error} disabled={!valid} submit={() => submit(selected.id, Number(fee))}>
    <p className="order-start-delivery__intro">CHỌN NGƯỜI GIAO HÀNG TRƯỚC KHI BẮT ĐẦU XỬ LÝ ĐƠN</p>
    <dl className="order-start-delivery__summary">
      <div><dt>MÃ ĐƠN HÀNG</dt><dd>{order.ma_don_hang}</dd></div>
      <div><dt>NGƯỜI NHẬN</dt><dd>{order.ten_nguoi_nhan || '—'}</dd></div>
      <div><dt>SỐ ĐIỆN THOẠI</dt><dd>{order.sdt_nguoi_nhan || '—'}</dd></div>
      <div><dt>ĐỊA CHỈ GIAO HÀNG</dt><dd>{order.dia_chi_giao_hang || '—'}</dd></div>
      <div><dt>MÃ VẬN ĐƠN</dt><dd>{order.phieu_giao_hang?.find((delivery) => delivery.trang_thai_giao_hang === 'CHO_GIAO')?.ma_van_don || '—'}</dd></div>
    </dl>
    <div className="order-operation-field"><label htmlFor="delivery-person-search">NGƯỜI GIAO HÀNG *</label>
      <input id="delivery-person-search" required autoComplete="off" value={query} placeholder="Tìm theo tên hoặc số điện thoại..." onChange={(event) => {
        const value = event.target.value;
        setQuery(value); setSelected(null); setPartners([]); setSearch({ loading: true, error: '' });
      }} />
      {(selected ? [selected] : query.trim() ? partners : []).map((partner) => <button type="button" className="order-courier-card" aria-pressed={selected?.id === partner.id} key={partner.id} onClick={() => { setSelected(partner); setQuery(partnerText(partner)); }}>
        <span><strong>{partner.ten_doi_tac}</strong><small>{partner.ma_doi_tac} · {partner.so_dien_thoai}</small></span><span className="order-courier-card__type">{partner.loai_doi_tac === 'SHIP_CUA_HANG' ? 'SHIP CỬA HÀNG' : 'SHIP CÁ NHÂN'}</span>
      </button>)}
      {query && !selected && !search.error && (search.loading || partners.length === 0) && <small role="status">{search.loading ? 'Đang tìm...' : 'Không tìm thấy người giao hàng.'}</small>}
    </div>
    <label className="order-operation-field"><span>PHÍ TRẢ NGƯỜI GIAO (đ) *</span>
      <input type="number" required min="0" max="9999999999999.99" step="0.01" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="Nhập phí trả người giao..." aria-describedby="order-delivery-fee-help" />
      <small id="order-delivery-fee-help">Khác với phí giao hàng thu từ khách (phi_giao_hang)</small>
    </label>
  </OrderModal>;
}
