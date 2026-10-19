import assert from 'node:assert/strict';
import test from 'node:test';
import { addProduct, comboSerialRequirements, findIncompleteSerialLine, setProductQuantity } from './salesState.js';

const combo = { id: 747, type: 'BO_PC', serialManaged: true, stock: 10 };
const cart = [{ product: combo, quantity: 2, serials: [{ id: 999 }], componentSerials: { 10: [{ id: 101 }], 20: [{ id: 201 }] } }];
const preview = { san_pham: [
  { ma_dong: 'd747', la_qua_tang: false, serial_requirements: [{ phien_ban_id: 10, so_luong_can_serial: 2 }, { phien_ban_id: 10, so_luong_can_serial: 2 }, { phien_ban_id: 20, so_luong_can_serial: 2 }] },
  { ma_dong: 'GIFT-1', la_qua_tang: true, serial_requirements: [{ phien_ban_id: 99, so_luong_can_serial: 1 }] },
] };

test('combo groups use component version IDs and BE quantities, merging duplicate versions without selecting a combo serial', () => {
  const groups = comboSerialRequirements(cart, preview);
  assert.deepEqual(groups, [
    { key: 'd747:10', productId: 747, variantId: 10, quantity: 4, perUnit: 2, serials: [{ id: 101 }] },
    { key: 'd747:20', productId: 747, variantId: 20, quantity: 2, perUnit: 1, serials: [{ id: 201 }] },
  ]);
  assert.equal(findIncompleteSerialLine(cart), null);
  assert.deepEqual(comboSerialRequirements(cart, null), []);
  assert.deepEqual(comboSerialRequirements(cart, { san_pham: [{ ma_dong: 'd747', serial_requirements: [] }] }), []);
  assert.equal(groups.some(group => group.variantId === combo.id), false);
});

test('quantity edits invalidate only the changed combo selections; single-product serial behavior is retained', () => {
  const single = { product: { id: 10, type: 'DON', stock: 10, serialManaged: true }, quantity: 2, serials: [{ id: 101 }, { id: 102 }] };
  const changed = setProductQuantity([...cart, single], 747, 1);
  assert.deepEqual(changed[0].componentSerials, {});
  assert.equal(changed[1], single);
  assert.deepEqual(cart[0].componentSerials[10], [{ id: 101 }]);
  assert.deepEqual(addProduct(cart, combo)[0].componentSerials, {});
  assert.equal(setProductQuantity(cart, 747, 2)[0].componentSerials, cart[0].componentSerials);
  assert.equal(setProductQuantity([single], 10, 1)[0].serials.length, 1);
  assert.equal(findIncompleteSerialLine([single]), null);
  assert.ok(findIncompleteSerialLine([{ ...single, serials: [] }]));
});
