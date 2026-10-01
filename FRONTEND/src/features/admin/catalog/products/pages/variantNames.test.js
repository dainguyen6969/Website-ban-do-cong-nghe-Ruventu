import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultVariantName } from './variantNames.js';

test('prefixes defaults only when a new product has multiple versions', () => {
  assert.equal(defaultVariantName('Aloo', 'Đỏ - 16GB', 2), 'Aloo - Đỏ - 16GB');
  assert.equal(defaultVariantName('Aloo', 'Mặc định', 1), 'Mặc định');
});
