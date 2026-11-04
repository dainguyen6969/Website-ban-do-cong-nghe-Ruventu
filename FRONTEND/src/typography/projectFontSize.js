// shortcut: scales CSS pixel text sizes; extend to inline/canvas text if those widgets need resizing.
export function scaledFontSize(value) {
  return /^\d+(?:\.\d+)?px$/.test(value)
    ? `calc(${value} * var(--project-font-scale, 1))`
    : value;
}

export default function projectFontSize() {
  return {
    postcssPlugin: 'ruventu-project-font-size',
    Declaration(declaration) {
      if (declaration.prop === 'font-size') declaration.value = scaledFontSize(declaration.value);
    },
  };
}
