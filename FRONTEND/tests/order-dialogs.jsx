// Manual UI check: open /tests/order-dialogs.html in Vite. No order/stock mutations.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/index.css';
import ExportOrderDialog from '../src/features/admin/orders/components/ExportOrderDialog';
import StartDeliveryDialog from '../src/features/admin/orders/components/StartDeliveryDialog';

const realFetch = window.fetch.bind(window);
const serials = [1, 2, 3].map((id) => ({ id, so_serial: `TEST-SERIAL-00${id}`, trang_thai: 'TRONG_KHO' }));
window.fetch = (url, options) => {
  if (String(url).includes('/orders/0/warehouse/serial-candidates')) {
    const keyword = new URL(url, location.origin).searchParams.get('keyword')?.toLowerCase() || '';
    return Promise.resolve(new Response(JSON.stringify({ data: { items: serials.filter((item) => item.so_serial.toLowerCase().includes(keyword)), pagination: { total_pages: 1 } } }), { status: 200 }));
  }
  return realFetch(url, options);
};
const order = { id: 0, ma_don_hang: 'TEST-UI-ONLY', ten_nguoi_nhan: 'Người nhận thử', sdt_nguoi_nhan: '0900000000', dia_chi_giao_hang: 'Địa chỉ thử', san_pham: [{ chi_tiet_don_hang_id: 10, ten_san_pham: 'Sản phẩm kiểm tra serial', ten_phien_ban: 'Phiên bản thử' }] };
const initial = () => ({ warehouseId: 1, requirements: [{ chi_tiet_don_hang_id: 10, loai_san_pham: 'DON', so_luong_dat: 1 }], groups: [{ lineId: 10, phien_ban_id: 20, name: 'Phiên bản thử', barcode: 'TEST-BARCODE', so_luong_moi_don_vi: 1, so_luong_can_serial: 1, selected: [] }] });
function App() {
  const [dialog, setDialog] = useState(initial);
  const [courier, setCourier] = useState(false);
  const [saved, setSaved] = useState(null);
  return <main className="admin-app" style={{ display: 'block', padding: 32, minHeight: '100vh' }}>
    <h1>KIỂM TRA GIAO DIỆN — DỮ LIỆU THỬ</h1><p>Không xuất kho, không cập nhật đơn hàng thật.</p>
    <button onClick={() => setDialog(initial())}>MỞ XUẤT KHO</button><button onClick={() => setCourier(true)}>MỞ NGƯỜI GIAO HÀNG</button>
    {saved && <pre aria-label="Payload kiểm tra">{JSON.stringify(saved, null, 2)}</pre>}
    {dialog && <ExportOrderDialog order={order} dialog={dialog} setDialog={setDialog} warehouses={[{ id: 1, name: 'Kho thử 1' }, { id: 2, name: 'Kho thử 2' }]} submit={(body) => { setSaved(body); setDialog(null); }} />}
    {courier && <StartDeliveryDialog order={order} close={() => setCourier(false)} submit={(partnerId, fee) => { setSaved({ partnerId, fee }); setCourier(false); }} />}
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
