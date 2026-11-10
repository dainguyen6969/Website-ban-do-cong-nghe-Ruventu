import { productService } from '../../shared/services/productService';
import { shuffleProducts } from '../pages/catalogModel';

export const recommendationKeywords = [
  'sản phẩm tôi thích',
  'sản phẩm bạn thích',
  'sản phẩm yêu thích',
  'sản phẩm tốt nhất',
  'sản phẩm giá trị nhất',
  'gợi ý cho tôi',
  'gợi ý cho bạn',
  'gợi ý sản phẩm',
  'đề xuất cho tôi',
  'đề xuất sản phẩm',
  'sản phẩm phù hợp với tôi',
  'sản phẩm phù hợp với bạn',
  'dành cho bạn',
  'dành cho tôi',
  'sản phẩm đáng mua',
  'nên mua gì',
];

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const triggers = recommendationKeywords.map(normalize);

export function isRecommendationQuery(query) {
  const normalized = ` ${normalize(query)} `;
  return triggers.some(trigger => normalized.includes(` ${trigger} `));
}

export function selectRecommendedProducts(products, { excludeId, categoryId, limit } = {}) {
  return shuffleProducts(products.filter(product =>
    (excludeId == null || String(product.id) !== String(excludeId)) &&
    (categoryId == null || String(product.categoryId) === String(categoryId))
  )).slice(0, limit);
}

export async function getRecommendedProducts({ excludeId, categoryId, limit, params = {} } = {}) {
  const products = await productService.getAllProducts({
    ...params,
    ...(categoryId == null ? {} : { danh_muc_id: categoryId }),
  });
  return selectRecommendedProducts(products, { excludeId, categoryId, limit });
}

export function recommendationResultsUrl(product, related = false) {
  const params = new URLSearchParams({ exclude: product.id });
  if (related) {
    params.set('danh_muc_id', product.categoryId);
    params.set('q', product.category);
  } else {
    params.set('mode', 'recommended');
    params.set('q', 'dành cho bạn');
  }
  return `/search?${params}`;
}
