export const FONT_OPTIONS = Object.freeze([
  { name: 'Inter', family: "'Inter', Arial, sans-serif" },
  { name: 'Archivo', family: "'Archivo', Arial, sans-serif" },
  { name: 'Kanit', family: "'Kanit', Arial, sans-serif" },
  { name: 'Inter Tight', family: "'Inter Tight', Arial, sans-serif" },
  { name: 'Geist', family: "'Geist', Arial, sans-serif" },
  { name: 'Asap Condensed', family: "'Asap Condensed', Arial, sans-serif" },
  { name: 'Roboto Condensed', family: "'Roboto Condensed', Arial, sans-serif" },
  { name: 'Oswald', family: "'Oswald', Arial, sans-serif" },
  { name: 'Barlow Condensed', family: "'Barlow Condensed', Arial, sans-serif" },
  { name: 'Fjalla One', family: "'Fjalla One', Arial, sans-serif" },
  { name: 'Saira Condensed', family: "'Saira Condensed', Arial, sans-serif" },
]);

export const DEFAULT_FONT_OPTION = FONT_OPTIONS[0];

export function findFontOption(name) {
  return FONT_OPTIONS.find((option) => option.name === name) || DEFAULT_FONT_OPTION;
}
