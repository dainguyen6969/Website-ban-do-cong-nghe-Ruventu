import { parseSpecifications, selectHighlights, toSpecRows } from '../../shared/services/productSpecifications.js';
export { parseSpecifications, selectHighlights, toSpecRows } from '../../shared/services/productSpecifications.js';
const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[_\s]+/g, ' ').trim();
export function resolveProductContent(specifications, description, category, variantId) {
  const root = parseSpecifications(specifications), selected = root.phien_ban?.[variantId];
  const fullSpecs = toSpecRows(selected?.thong_so_ky_thuat ?? root), explicitMain = toSpecRows(selected?.thong_so_chinh);
  const mainSpecs = selectHighlights(explicitMain.length ? explicitMain : fullSpecs,category);
  const text = String(selected?.mo_ta ?? description ?? '').trim();
  // Remove only the demo introduction; editors may append real text and images after it.
  const content = text.replace(/^(?:Dữ liệu kiểm thử local|Bộ PC mẫu kiểm thử|Dữ liệu mẫu kiểm thử)[^<.\r\n]*(?:\.|(?=<|\r|\n|$))/i,'').trim();
  return {fullSpecs,mainSpecs,specsSummary:mainSpecs,description:content,descriptionTitle:selected?.ten_phien_ban || ''};
}
export function sanitizeDescription(html, title = '') {
  // Keep the API's article formatting without allowing executable markup.
  if (typeof DOMParser === 'undefined') return String(html).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const document = new DOMParser().parseFromString(html,'text/html');
  const allowed = new Set(['P','DIV','SECTION','H1','H2','H3','H4','H5','H6','BR','UL','OL','LI','STRONG','B','EM','I','U','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','BLOCKQUOTE','FIGURE','FIGCAPTION','IMG','A','HR','SPAN']);
  for (const element of document.body.querySelectorAll('*')) {
    if (!allowed.has(element.tagName)) {
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|FORM|INPUT|BUTTON|TEMPLATE)$/.test(element.tagName)) element.remove();
      else element.replaceWith(...element.childNodes);
      continue;
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name;
      const permitted = ['alt','title'].includes(name) || (['TH','TD'].includes(element.tagName) && ['colspan','rowspan'].includes(name) && /^\d+$/.test(attribute.value))
        || ((element.tagName === 'A' && name === 'href' || element.tagName === 'IMG' && name === 'src') && /^https?:$/i.test((() => { try { return new URL(attribute.value,location.origin).protocol; } catch { return ''; } })()));
      if (!permitted) element.removeAttribute(name);
    }
    if (element.tagName === 'IMG') element.setAttribute('loading','lazy');
  }
  const heading = document.body.firstElementChild;
  if (title && heading && /^H[1-6]$/.test(heading.tagName) && normalize(heading.textContent) === normalize(title)) heading.remove();
  return document.body.innerHTML;
}
