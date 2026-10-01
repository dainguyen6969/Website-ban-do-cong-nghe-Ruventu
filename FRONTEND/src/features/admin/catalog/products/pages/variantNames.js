export function defaultVariantName(productName, variantName, totalVariants) {
  const product = productName.trim();
  return totalVariants > 1 && product ? `${product} - ${variantName}` : variantName;
}
