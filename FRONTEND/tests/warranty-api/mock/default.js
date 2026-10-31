// Local frontend transport simulation. Fixtures: Thiết_kế_API.xlsx, Tổng hợp toàn bộ API!A96:K109.
// This does not replace backend business-rule or database tests.
const http = require('node:http');
const examples = require('../examples.json');
const original = examples.BH03.data;
const records = new Map([[original.id, structuredClone(original)]]);
records.get(original.id).lich_su.items = Array.from({ length: 105 }, (_, index) => ({ id: 1000 - index, loai_su_kien: 'DIEU_CHINH_HOA_DON_BAO_HANH', noi_dung: index === 104 ? 'Duyệt ngoại lệ công nợ' : 'Điều chỉnh hóa đơn', ngay_tao: '2026-10-30T10:00:00+07:00' }));
const replays = new Map();
let nextId = 600, eventId = 2000;
const root = '/api/v1/admin/warranties';
const server = http.createServer(async (req, res) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': req.headers.origin || 'http://127.0.0.1:5174', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' };
  const send = (status, data, message = 'Thành công') => { res.writeHead(status, headers); res.end(JSON.stringify({ status, message, data })); };
  if (req.method === 'OPTIONS') return send(200, null);
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith(root)) return send(501, null, 'Not modeled by this frontend test');
  if (!req.headers.authorization) return send(401, null, 'Chưa xác thực');
  if (url.searchParams.get('keyword') === 'TEST_ERROR') return send(503, null, 'Không đọc được dữ liệu bảo hành');
  if (req.method === 'GET' && url.pathname === `${root}/lookup`) return send(200, examples.BH02.data);
  if (req.method === 'GET' && url.pathname === root) {
    const items = [...records.values()].map(item => ({ ...examples.BH01.data.items[0], id: item.id, ma_phieu: item.ma_phieu, trang_thai_xu_ly: item.trang_thai_xu_ly, ngay_tiep_nhan: item.ngay_tiep_nhan }));
    const filtered = items.filter(item => (!url.searchParams.get('trang_thai_xu_ly') || item.trang_thai_xu_ly === url.searchParams.get('trang_thai_xu_ly')) && (!url.searchParams.get('keyword') || JSON.stringify(item).toLowerCase().includes(url.searchParams.get('keyword').toLowerCase())));
    const page = Number(url.searchParams.get('page') || 0), limit = Number(url.searchParams.get('limit') || 20);
    filtered.sort((a, b) => Date.parse(b.ngay_tiep_nhan) - Date.parse(a.ngay_tiep_nhan) || b.id - a.id);
    return send(200, { items: filtered.slice(page * limit, (page + 1) * limit), pagination: { page, limit, total_elements: filtered.length, total_pages: Math.ceil(filtered.length / limit) } });
  }
  const segments = url.pathname.slice(root.length).split('/').filter(Boolean);
  const record = records.get(Number(segments[0]));
  if (req.method === 'GET') {
    if (!record) return send(404, null, 'Không tìm thấy phiếu bảo hành');
    const detail = structuredClone(record);
    const page = Number(url.searchParams.get('history_page') || 0), limit = Number(url.searchParams.get('history_limit') || 20), total = detail.lich_su.items.length;
    detail.lich_su.items = detail.lich_su.items.slice(page * limit, (page + 1) * limit);
    detail.lich_su.pagination = { page, limit, total_elements: total, total_pages: Math.ceil(total / limit) };
    return send(200, detail);
  }
  const key = req.headers['idempotency-key'];
  if (!key) return send(400, null, 'Thiếu Idempotency-Key');
  const body = req.body || {};
  const hash = JSON.stringify([req.method, url.pathname, body]);
  if (replays.has(key)) {
    const previous = replays.get(key);
    if (previous.hash !== hash) return send(409, null, 'Idempotency-Key đã dùng với nội dung khác');
    return send(previous.status, previous.data);
  }
  const success = (status, data) => { replays.set(key, { hash, status, data }); return send(status, data); };
  if (url.pathname === `${root}/intake-results`) return success(201, { ...examples.BH05.data, yeu_cau_tiep_nhan_id: ++eventId, ket_qua_tiep_nhan: body.ket_qua_tiep_nhan });
  if (url.pathname === root && req.method === 'POST') {
    if (!body.ten_nguoi_lien_he || (body.thiet_bi_id == null) === (body.chi_tiet_don_hang_id == null)) return send(400, null, 'Sai đối tượng tiếp nhận');
    const id = nextId++, detail = structuredClone(original);
    Object.assign(detail, { id, ma_phieu: `BH-${id}`, trang_thai_xu_ly: 'TIEP_NHAN', ket_qua_xu_ly: 'CHUA_CO_KET_QUA', bao_gia: [], hoa_don: null, giao_dich_tien: [], ngay_tiep_nhan: body.ngay_tiep_nhan_thuc_te });
    detail.nguoi_lien_he = { ten: body.ten_nguoi_lien_he, sdt: body.sdt_nguoi_lien_he };
    Object.assign(detail, { ket_luan: [], noi_dang_giu: { loai: 'CUA_HANG', ten: 'Cửa hàng' }, phuong_an_doi: null, doi_soat_nha_cung_cap: null, giao_nhan: [], hoa_don_da_huy: [], thiet_bi_hien_hanh: detail.thiet_bi, ngay_cap_nhat: body.ngay_tiep_nhan_thuc_te });
    detail.tiep_nhan = { ly_do: body.ly_do_bao_hanh, tinh_trang: body.tinh_trang_tiep_nhan, phu_kien: body.phu_kien, anh_urls: body.anh_urls };
    detail.lich_su.items = [];
    records.set(id, detail);
    return success(201, { ...examples.BH04.data, id, ma_phieu: detail.ma_phieu });
  }
  if (!record) return send(404, null, 'Không tìm thấy phiếu bảo hành');
  const endpoint = segments[1];
  if (endpoint === 'handover') {
    if (!body.xac_nhan_khach || !body.bang_chung_urls?.length) return send(400, null, 'Thiếu xác nhận hoặc bằng chứng');
    if (record.trang_thai_xu_ly !== 'CHO_TRA_KHACH') return send(409, null, 'Phiếu chưa sẵn sàng bàn giao');
    if (body.phe_duyet_cong_no_lich_su_id === 999999) return send(409, { con_phai_thu: 50000, da_ban_giao: false }, 'Chưa đủ điều kiện thanh toán trước bàn giao');
    record.trang_thai_xu_ly = 'HOAN_TAT';
    record.noi_dang_giu = { loai: 'KHACH_HANG', thiet_bi_id: body.thiet_bi_ban_giao_id };
    const history = { id: ++eventId, loai_su_kien: 'HANDOVER', noi_dung: 'Đã bàn giao cho khách', ngay_tao: body.thoi_diem };
    record.lich_su.items.unshift(history);
    return success(200, { id: record.id, trang_thai_xu_ly: 'HOAN_TAT', thiet_bi_da_tra_id: body.thiet_bi_ban_giao_id, lich_su_id: history.id });
  }
  const supported = { status: 'BH06', events: 'BH07', quotes: segments.length > 2 ? 'BH09' : 'BH08', invoice: 'BH010', 'money-transactions': 'BH011', 'replacement-plan': 'BH012', 'replacement-items': 'BH013', 'supplier-settlements': 'BH014' };
  if (!supported[endpoint]) return send(501, null, 'Endpoint not modeled');
  if (endpoint === 'money-transactions' && !(body.so_tien > 0)) return send(400, null, 'Số tiền phải lớn hơn 0');
  if (endpoint === 'status') record.trang_thai_xu_ly = body.su_kien === 'SAN_SANG_TRA' ? 'CHO_TRA_KHACH' : 'DANG_KIEM_TRA';
  const history = { id: ++eventId, loai_su_kien: body.su_kien || body.hanh_dong || body.loai || endpoint, ngay_tao: new Date().toISOString(), nguoi_thuc_hien_id: 8, noi_dung: body.noi_dung || body.ly_do || 'Đã ghi nhận trong môi trường mô phỏng' };
  record.lich_su.items.unshift(history);
  if (endpoint === 'events' && body.su_kien === 'GHI_KET_LUAN') record.ket_luan.push({ lich_su_id: history.id, noi_dung: body.noi_dung, hang_muc: body.hang_muc });
  const result = { ...examples[supported[endpoint]].data, lich_su_id: history.id, trang_thai_xu_ly: record.trang_thai_xu_ly };
  if (endpoint === 'money-transactions') {
    const transaction = { id: history.id, loai: body.loai, so_tien: body.so_tien, phieu_thu_chi_id: history.id };
    record.giao_dich_tien.push(transaction);
    Object.assign(result, transaction);
  }
  return success(endpoint === 'quotes' && segments.length === 2 || endpoint === 'money-transactions' ? 201 : 200, result);
});
server.listen(process.env.PORT || 4911);
