export const FONT_OPTIONS = Object.freeze([
  { name: 'Inter', family: "'Inter', Arial, sans-serif" },
  { name: 'Archivo', family: "'Archivo', Arial, sans-serif" },
  { name: 'Kanit', family: "'Kanit', Arial, sans-serif" },
  { name: 'Inter Tight', family: "'Inter Tight', Arial, sans-serif" },
  { name: 'Geist', family: "'Geist', Arial, sans-serif" },
  { name: 'Asap Condensed', family: "'Asap Condensed', Arial, sans-serif" },
]);

export const ADMIN_FONT_STORAGE_KEY = 'ruventu_admin_font_override';
export const HOMEPAGE_FONT_STORAGE_KEY = 'ruventu_homepage_font_override';

export const DEFAULT_FONT_OPTION = FONT_OPTIONS[0];

export function findFontOption(name) {
  return FONT_OPTIONS.find((option) => option.name === name) || DEFAULT_FONT_OPTION;
}
