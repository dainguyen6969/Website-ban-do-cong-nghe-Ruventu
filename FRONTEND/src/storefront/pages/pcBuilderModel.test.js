import test from 'node:test';
import assert from 'node:assert/strict';
import { availableQuantity, buildItems, confirmedBuild, money, pcBuilderPriceBands } from './pcBuilderModel.js';
import { withIdempotency } from '../../shared/services/mutationUtils.js';

test('Các khoảng giá gửi biên bao gồm, không trùng hoặc bỏ sót giá tại mốc 5/15 triệu', () => {
  for (const [price, expected] of [[0.01, 'UNDER_5M'], [4999999.99, 'UNDER_5M'], [5000000, '5M_15M'], [15000000, '5M_15M'], [15000000.01, 'OVER_15M']]) {
    const bands = pcBuilderPriceBands.slice(1).filter(band =>
      (band.min === '' || price >= Number(band.min)) && (band.max === '' || price <= Number(band.max)));
    assert.deepEqual(bands.map(band => band.value), [expected]);
  }
  assert.deepEqual([pcBuilderPriceBands[0].min, pcBuilderPriceBands[0].max], ['', '']);
});

test('Hai ô SSD chia sẻ tồn có thể bán, thay thế chính ô không trừ hai lần', () => {
  const product = { phien_ban_id: 8, ton_co_the_ban: 5 };
  const selections = { SSD_1: { ...product, so_luong: 3 }, SSD_2: { ...product, so_luong: 2 } };
  assert.equal(availableQuantity(product, 'SSD_2', selections), 2);
  assert.equal(availableQuantity(product, 'SSD_1', selections, 4), 2);
  assert.equal(availableQuantity(product, 'SSD_2', selections, 1), 0);
  assert.deepEqual(buildItems(selections), [
    { ma_hang_muc: 'SSD_1', phien_ban_id: 8, so_luong: 3 },
    { ma_hang_muc: 'SSD_2', phien_ban_id: 8, so_luong: 2 },
  ]);
});

test('Giỏ nhận giá preview, từ chối preview không hợp lệ và không giả giá bằng 0', () => {
  const line = { ma_hang_muc: 'CPU', phien_ban_id: 1, so_luong: 2, don_gia: 1250000, thanh_tien: 2500000 };
  const preview = { co_the_gui_yeu_cau_them_gio: true, items: [line] };
  assert.deepEqual(confirmedBuild(preview), { items: [{ ma_hang_muc: 'CPU', phien_ban_id: 1, so_luong: 2, don_gia_xac_nhan: 1250000 }] });
  assert.throws(() => confirmedBuild({ ...preview, co_the_gui_yeu_cau_them_gio: false }));
  assert.throws(() => confirmedBuild({ ...preview, items: [{ ...line, don_gia: null }] }));
  assert.equal(money(null), '—');
  assert.equal(money(0), '0đ');
});

test('Lỗi chưa xác định giữ UUID/body, chặn bấm lặp và đổi cấu hình; 409 mở lại chỉnh sửa', async () => {
  const slot = { current: null };
  const body = { items: [{ phien_ban_id: 1, so_luong: 1, don_gia_xac_nhan: 1000 }] };
  let firstKey;
  await assert.rejects(withIdempotency(slot, 'guest', body, async key => {
    firstKey = key;
    throw Object.assign(new Error('Mất kết nối'), { status: 503 });
  }));
  assert.match(firstKey, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await assert.rejects(withIdempotency(slot, 'guest', { items: [] }, () => assert.fail('Không được gửi body khác')));
  let release;
  const pending = withIdempotency(slot, 'guest', body, (key, sent) => {
    assert.equal(key, firstKey);
    assert.deepEqual(sent, body);
    return new Promise(resolve => { release = resolve; });
  });
  await assert.rejects(withIdempotency(slot, 'guest', body, () => assert.fail('Không được gửi trùng')));
  release({ success: true });
  await pending;
  assert.equal(slot.current, null);
  await assert.rejects(withIdempotency(slot, 'guest', body, async key => {
    assert.notEqual(key, firstKey);
    throw Object.assign(new Error('Giá thay đổi'), { status: 409 });
  }));
  assert.equal(slot.current, null);
});
