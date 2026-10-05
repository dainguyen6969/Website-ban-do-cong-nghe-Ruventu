import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement, useContext } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const canonical = {
 LoaiDonHang: ['ONLINE','TAI_QUAY'],
 TrangThaiDonHang: ['CHO_DUYET','CHO_THANH_TOAN','CHO_DONG_GOI','CHO_LAY_HANG','DANG_GIAO_HANG','HOAN_THANH','HUY_HANG'],
 TrangThaiDongGoi: ['CHUA_DONG_GOI','DANG_DONG_GOI','DA_DONG_GOI','HUY_DONG_GOI'],
 TrangThaiXuatKho: ['CHUA_XUAT_KHO','DA_XUAT_KHO','DA_HOAN_KHO'],
 TrangThaiThanhToanDonHang: ['CHUA_THANH_TOAN','DA_THANH_TOAN'],
 TrangThaiTraHang: ['CHO_TIEP_NHAN','DA_NHAN_HANG','DA_HOAN_TIEN'],
 LoaiDoiTacVanChuyen: ['SHIP_CUA_HANG','SHIP_CA_NHAN'],
 TrangThaiGiaoHang: ['CHO_GIAO','DA_NHAN_HANG','DANG_GIAO','GIAO_THANH_CONG','GIAO_THAT_BAI','CHO_HOAN_HANG','DA_HOAN_HANG','HUY_GIAO_HANG'],
 LoaiGiaoDichKho: ['NHAP_HANG','XUAT_BAN','KHACH_TRA','TRA_NCC','KIEM_KHO'],
 TrangThaiNhapHang: ['DAT_HANG','DA_DUYET','NHAP_MOT_PHAN','DA_NHAP_KHO','HOAN_TRA_TOAN_BO','HOAN_TRA_MOT_PHAN','HUY'],
 TrangThaiThanhToanNhap: ['CHUA_TRA','TRA_MOT_PHAN','DA_TRA'],
 TrangThaiPhieuKiemKho: ['DANG_KIEM','DA_CAN_BANG','DA_HUY'],
};

test('all backend enum values match the corrected canonical definitions', () => {
 for (const [name, values] of Object.entries(canonical)) {
  const names = ['LoaiDoiTacVanChuyen','TrangThaiGiaoHang'].includes(name) ? [name,name+'Enum'] : [name];
  for(const file of names) {
   const source=readFileSync('../BACKEND/src/main/java/com/example/dantruventu/Enum/'+file+'.java','utf8');
   const actual=source.slice(source.indexOf('{')+1,source.lastIndexOf('}')).trim().split(',').map(value=>value.trim());
   assert.deepEqual(actual.sort(),[...values].sort(),file);
  }
 }
});

test('mock enums and cached legacy values normalize without losing record data', async () => {
 const saved=new Map();
 globalThis.window={addEventListener() {}};
 globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try {
  const partners=await server.ssrLoadModule('/src/data/shippingPartners.js');
  const deliveries=await server.ssrLoadModule('/src/data/deliveries.js');
  const returns=await server.ssrLoadModule('/src/data/customerReturns.js');
  const stock=await server.ssrLoadModule('/src/data/mockStockChecks.js');
  assert.deepEqual(deliveries.DELIVERY_STATUSES.map(([key])=>key).sort(),[...canonical.TrangThaiGiaoHang].sort());
  assert.deepEqual(Object.values(returns.RETURN_STATUS).sort(),[...canonical.TrangThaiTraHang].sort());
  assert.deepEqual(Object.keys(stock.STOCK_CHECK_LABELS).sort(),[...canonical.TrangThaiPhieuKiemKho].sort());
  assert.ok(partners.getShippingPartners().every(record=>canonical.LoaiDoiTacVanChuyen.includes(record.loaiDoiTac)));
  assert.ok(deliveries.getDeliveries().every(record=>canonical.TrangThaiGiaoHang.includes(record.trangThaiGiao)));
  assert.ok(stock.getStockChecks().every(record=>canonical.TrangThaiPhieuKiemKho.includes(record.status)));
  saved.set(partners.SHIPPING_PARTNER_STORAGE_KEY,JSON.stringify([{id:'legacy',loaiDoiTac:'ship_cua_hang',note:'keep'}]));
  assert.deepEqual(partners.getShippingPartners(),[{id:'legacy',loaiDoiTac:'SHIP_CUA_HANG',note:'keep'}]);
  saved.set(deliveries.DELIVERY_STORAGE_KEY,JSON.stringify([{id:'legacy',trangThaiGiao:'giao_that_bai'+'_placeholder',note:'keep'}]));
  assert.deepEqual(deliveries.getDeliveries(),[{id:'legacy',trangThaiGiao:'GIAO_THAT_BAI',note:'keep'}]);
  saved.set(returns.CUSTOMER_RETURNS_STORAGE_KEY,JSON.stringify([{id:'legacy',trangThai:'da_hoan_tien',note:'keep'}]));
  assert.deepEqual(returns.readCustomerReturns(),[{id:'legacy',trangThai:'DA_HOAN_TIEN',note:'keep'}]);
  saved.set('ruventu_stock_checks_v1',JSON.stringify([{id:'legacy',status:'Đã cân bằng',note:'keep'}]));
  assert.deepEqual(stock.getStockChecks(),[{id:'legacy',status:'DA_CAN_BANG',note:'keep'}]);
  const { default: OrderProvider }=await server.ssrLoadModule('/src/context/OrderProvider.jsx');
  const { default: OrderContext }=await server.ssrLoadModule('/src/context/orderContext.js');
  saved.set('ruventu_orders_v1',JSON.stringify([
   {id:'exported',warehouse:'Đã xuất kho',packing:'Đã đóng gói',history:[]},
   {id:'pending',warehouse:'Chưa xuất kho',packing:'Đang đóng gói',history:[]}
  ]));
  let orders;
  function Probe() { orders=useContext(OrderContext); return null; }
  renderToStaticMarkup(createElement(OrderProvider,null,createElement(Probe)));
  assert.throws(()=>orders.cancelPacking('exported'),/Đơn đã xuất hoặc hoàn kho/);
  assert.throws(()=>orders.completePacking('exported'),/Đơn đã xuất hoặc hoàn kho/);
  orders.completePacking('pending');
  const packed=JSON.parse(saved.get('ruventu_orders_v1')).find(x=>x.id==='pending');
  assert.equal(packed.status,'Chờ đóng gói');
  assert.equal(packed.packing,'Đã đóng gói');
  assert.equal(packed.warehouse,'Chưa xuất kho');
 } finally { await server.close(); delete globalThis.window; delete globalThis.localStorage; }
});
