export function defaultVariantName(productName, variantName, totalVariants) {
  const product = String(productName ?? '').trim();
  const variant = String(variantName ?? '').trim();

  if (totalVariants <= 1) return product;

  return [product, variant].filter(Boolean).join(' - ');
}