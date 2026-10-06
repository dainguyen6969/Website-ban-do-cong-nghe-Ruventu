import { useEffect, useState } from 'react';
import { getSerialCandidates } from '../api/orderApi';
import { canExport, exportPayload } from './exportSelection';
import OrderModal from './OrderModal';

export default function ExportOrderDialog({ order, dialog, setDialog, warehouses, busy, error, submit }) {
  const [picker, setPicker] = useState(null);
  const ready = canExport(dialog.warehouseId, dialog.groups);
  return <>
    <div inert={picker !== null}>
      <OrderModal title="XUẤT KHO ĐƠN HÀNG" subtitle="CHỌN SERIAL THEO TỪNG SẢN PHẨM / PHIÊN BẢN" className="order-export-modal" showClose cancelLabel="HỦY" confirmLabel="XÁC NHẬN XUẤT KHO" close={() => setDialog(null)} busy={busy} error={error} disabled={!ready || picker !== null} submit={() => submit(exportPayload(dialog.warehouseId, dialog.requirements, dialog.groups))}>
        <div className="order-export-warehouses" role="group" aria-label="Kho xuất hàng"><span>KHO XUẤT HÀNG</span>{warehouses.map((warehouse) => <label key={warehouse.id}><input type="radio" name="export-warehouse" checked={Number(dialog.warehouseId) === warehouse.id} onChange={() => setDialog((current) => ({ ...current, warehouseId: warehouse.id }))} />{warehouse.name}</label>)}</div>
        {!warehouses.length && <p role="status">Chưa có kho xuất hàng.</p>}
        {dialog.requirements.map((line) => {
          const product = order.san_pham.find((item) => item.chi_tiet_don_hang_id === line.chi_tiet_don_hang_id);
          const groups = dialog.groups.filter((group) => group.lineId === line.chi_tiet_don_hang_id);
          return <section className="order-export-product" key={line.chi_tiet_don_hang_id}>
            <header><strong>{product?.ten_san_pham || '—'}</strong><span className="order-export-product__type">{line.loai_san_pham === 'BO_PC' ? 'BỘ PC' : 'SẢN PHẨM ĐƠN'}</span><small>SL ĐẶT: {line.so_luong_dat}</small></header>
            {groups.map((group) => <div className="order-export-variant" key={group.phien_ban_id}>
              <div><strong>{group.name}</strong><small>{group.barcode || '—'}</small><span>SL MỖI ĐƠN VỊ: {group.so_luong_moi_don_vi} · CẦN SERIAL: {group.so_luong_can_serial}</span></div>
              <div className="order-export-variant__actions"><span className={group.selected.length === group.so_luong_can_serial ? 'is-complete' : 'is-missing'}>{group.selected.length === group.so_luong_can_serial ? `✓ ĐÃ CHỌN: ${group.selected.length} / ${group.so_luong_can_serial}` : `CÒN THIẾU ${group.so_luong_can_serial - group.selected.length} SERIAL`}</span><button type="button" className={`order-action ${group.selected.length ? '' : 'order-action--black'}`} onClick={() => setPicker(group)}>{group.selected.length ? 'SỬA SERIAL' : 'CHỌN SERIAL'}</button></div>
            </div>)}
            {!groups.length && <p className="order-export-no-serial">{product?.ten_phien_ban || '—'} · Không yêu cầu serial.</p>}
          </section>;
        })}
      </OrderModal>
    </div>
    {picker && <SerialPicker orderId={order.id} group={picker} usedIds={dialog.groups.filter((group) => group !== picker).flatMap((group) => group.selected)} close={() => setPicker(null)} confirm={(selected) => {
      setDialog((current) => ({ ...current, groups: current.groups.map((group) => group.lineId === picker.lineId && group.phien_ban_id === picker.phien_ban_id ? { ...group, selected } : group) }));
      setPicker(null);
    }} />}
  </>;
}

function SerialPicker({ orderId, group, usedIds, close, confirm }) {
  const [selected, setSelected] = useState(group.selected);
  const [filter, setFilter] = useState({ keyword: '', page: 0 });
  const [result, setResult] = useState({ items: [], pagination: {}, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await getSerialCandidates(orderId, { chi_tiet_don_hang_id: group.lineId, phien_ban_id: group.phien_ban_id, keyword: filter.keyword.trim(), page: filter.page, limit: 100 }, controller.signal);
        if (!controller.signal.aborted) setResult({ ...data, loading: false, error: '' });
      } catch (failure) {
        if (!controller.signal.aborted) setResult({ items: [], pagination: {}, loading: false, error: failure.message });
      }
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [orderId, group.lineId, group.phien_ban_id, filter]);
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : !usedIds.includes(id) && current.length < group.so_luong_can_serial ? [...current, id] : current);
  const search = (keyword, page = 0) => { setResult((current) => ({ ...current, loading: true, error: '' })); setFilter({ keyword, page }); };
  return <OrderModal title={`CHỌN SERIAL - ${group.name}`} className="order-select-serial" showClose cancelLabel="HỦY" close={close} error={result.error} disabled={selected.length !== group.so_luong_can_serial || result.loading || !!result.error} submit={() => confirm(selected)}>
    <p className="order-serial-count">SỐ LƯỢNG CẦN CHỌN: <strong>{group.so_luong_can_serial}</strong><span>ĐÃ CHỌN: <strong className={selected.length === group.so_luong_can_serial ? 'is-complete' : 'is-missing'}>{selected.length} / {group.so_luong_can_serial}</strong></span></p>
    <input className="order-serial-search" aria-label="Tìm hoặc quét serial" placeholder="TÌM / QUÉT SERIAL..." value={filter.keyword} onChange={(event) => search(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const match = !result.loading && result.items.find((item) => item.so_serial.toLowerCase() === filter.keyword.trim().toLowerCase()); if (match) toggle(match.id); } }} />
    <div className="order-serial-results" aria-busy={result.loading}>
      {result.loading ? <p role="status">Đang tải serial...</p> : result.items.length ? result.items.map((serial) => <button type="button" key={serial.id} className="order-serial-row" aria-pressed={selected.includes(serial.id)} disabled={usedIds.includes(serial.id) || !selected.includes(serial.id) && selected.length >= group.so_luong_can_serial} onClick={() => toggle(serial.id)}><span>{serial.so_serial}</span><span className="order-serial-stock">{selected.includes(serial.id) ? '✓ ĐÃ CHỌN' : usedIds.includes(serial.id) ? 'ĐÃ CHỌN Ở DÒNG KHÁC' : 'TRONG KHO'}</span></button>) : <p role="status">Không có serial khả dụng.</p>}
    </div>
    {result.pagination?.total_pages > 1 && <div className="order-serial-pages"><button type="button" disabled={result.loading || filter.page === 0} onClick={() => search(filter.keyword, filter.page - 1)}>Trang trước</button><span>{filter.page + 1} / {result.pagination.total_pages}</span><button type="button" disabled={result.loading || filter.page + 1 >= result.pagination.total_pages} onClick={() => search(filter.keyword, filter.page + 1)}>Trang sau</button></div>}
  </OrderModal>;
}
