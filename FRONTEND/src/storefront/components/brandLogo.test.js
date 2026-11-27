import assert from 'node:assert/strict';
import test from 'node:test';
import { brandLogoUrl } from './brandLogo.js';

test('brand previews enlarge vectors, trim whitespace and retain the stored asset and background', () => {
  const source='https://res.cloudinary.com/demo/image/upload/b_black,f_png/v123/logo.svg';
  assert.equal(brandLogoUrl(source), 'https://res.cloudinary.com/demo/image/upload/c_scale,w_600/e_trim/c_fit,w_288,h_112/b_black,f_png/v123/logo.svg');
  assert.equal(brandLogoUrl('https://example.com/logo.png'), 'https://example.com/logo.png');
  assert.equal(brandLogoUrl('/logo.png'), '/logo.png');
  assert.equal(brandLogoUrl(null), null);
});
