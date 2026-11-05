// Relative em/% sizes already follow their parent; scaling them again compounds the size.
export function scaledFontSize(value) {
  const size = typeof value === 'number' ? `${value}px` : value;
  return /^\d+(?:\.\d+)?(?:px|rem)$/.test(size)
    ? `calc(${size} * var(--project-font-scale, 1))`
    : size;
}

export default function projectFontSize() {
  return {
    postcssPlugin: 'ruventu-project-font-size',
    Declaration(declaration) {
      if (declaration.prop === 'font-size') declaration.value = scaledFontSize(declaration.value);
      if (declaration.prop === 'font' && !declaration.value.includes('--project-font-scale')) {
        declaration.value = declaration.value.replace(
          /(^|\s)(\d+(?:\.\d+)?(?:px|rem))(?=[/\s])/,
          (_, space, size) => `${space}${scaledFontSize(size)}`,
        );
      }
    },
  };
}
