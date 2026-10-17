const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[_\s]+/g, ' ').trim();
const metadata = new Set(['nguon du lieu','nguon tham khao','source','sources','source url','url','phien ban','schema version','mo ta','phuong phap','ten phien ban','thong so co ban','thong so chinh']);
const labels = {socket:'Socket',loai_ram:'Loại RAM',dung_luong:'Dung lượng',toc_do_bus:'Tốc độ bus',bus_ram:'Bus RAM',chipset:'Chipset',so_nhan:'Số nhân',so_luong_nhan:'Số nhân',so_luong_luong:'Số luồng',tan_so:'Tần số',cong_suat:'Công suất',kich_thuoc:'Kích thước',do_phan_giai:'Độ phân giải',tan_so_quet:'Tần số quét',vram:'VRAM',chuan_ket_noi:'Chuẩn kết nối'};
labels.bao_hanh = 'Bảo hành';
export function parseSpecifications(value) {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
export function toSpecRows(value) {
  const rows = [], seen = new Set();
  function add(label, entry) {
    const key = normalize(label.split(' / ').at(-1));
    const sourceLink = typeof entry === 'string' && /^https?:\/\//i.test(entry.trim()) || entry && typeof entry === 'object' && ('url' in entry || Array.isArray(entry) && entry.every(item => item && typeof item === 'object' && 'url' in item));
    if (metadata.has(key) || key === 'nguon' && sourceLink) return;
    if (entry == null || entry === '') return;
    if (Array.isArray(entry)) {
      if (entry.every(item => ['string','number','boolean'].includes(typeof item))) add(label,entry.join(', '));
      else entry.forEach(item => { if (item && typeof item === 'object') Object.entries(item).forEach(([k,v]) => add(`${label} / ${k}`,v)); });
      return;
    }
    if (typeof entry === 'object') { Object.entries(entry).forEach(([k,v]) => add(label ? `${label} / ${k}` : k,v)); return; }
    const displayLabel = labels[label] || label, identity = normalize(displayLabel);
    if (seen.has(identity) || !['string','number','boolean'].includes(typeof entry)) return;
    seen.add(identity);
    rows.push({label:displayLabel,value:typeof entry === 'boolean' ? (entry ? 'Có' : 'Không') : String(entry)});
  }
  Object.entries(parseSpecifications(value)).forEach(([label,entry]) => add(label,entry));
  return rows;
}
export function selectHighlights(rows, category = '') {
  const kind = normalize(category);
  const patterns = /pc build|bo pc/.test(kind) ? [/^cpu$/,/card do hoa|^gpu$|^vga$/,/^ram$/,/ssd|o cung/,/mainboard/,/nguon|psu/]
    : /laptop/.test(kind) ? [/^cpu$|bo xu ly/,/^ram$/,/ssd|o cung/,/man hinh/,/gpu|do hoa/,/he dieu han/]
    : /man hinh/.test(kind) ? [/kich thuoc/,/tam nen/,/do phan giai/,/tan so quet/,/phan hoi|dap ung/,/do sang/]
    : /psu|nguon/.test(kind) ? [/cong suat/,/chung nhan|hieu suat/,/chuan nguon|atx/,/modular/,/dien ap/,/bao ve/]
    : /cpu/.test(kind) ? [/socket/,/nhan/,/luong/,/xung|tan so/,/cache/,/tdp|cong suat/]
    : /mainboard/.test(kind) ? [/socket/,/chipset/,/ram/,/m\.2|luu tru/,/lan|wifi/,/kich thuoc/]
    : /ram/.test(kind) ? [/dung luong/,/loai ram/,/bus|toc do/,/cas|do tre/,/dien ap/,/so thanh/]
    : /ssd|hdd/.test(kind) ? [/dung luong/,/giao tiep/,/doc/,/ghi/,/kich thuoc/,/tbw/]
    : /vga|do hoa/.test(kind) ? [/^gpu$|do hoa/,/vram|bo nho/,/xung/,/giao tiep|pci/,/cong ket noi/,/cong suat/] : [];
  const score = row => { const index = patterns.findIndex(pattern => pattern.test(normalize(row.label))); return index < 0 ? 100 : index; };
  return rows.filter(row => !/^(thuong hieu|hang san xuat|model|ma san pham|bao hanh)$/.test(normalize(row.label)))
    .map((row,index) => ({row,index})).sort((a,b) => score(a.row)-score(b.row) || a.index-b.index).slice(0,6).map(item => item.row);
}
export function resolveProductContent(specifications, description, category, variantId) {
  const root = parseSpecifications(specifications), selected = root.phien_ban?.[variantId];
  const fullSpecs = toSpecRows(selected?.thong_so_ky_thuat ?? root), explicitMain = toSpecRows(selected?.thong_so_chinh);
  const mainSpecs = explicitMain.length ? explicitMain.slice(0,6) : selectHighlights(fullSpecs,category);
  const basic = toSpecRows(selected?.thong_so_co_ban), text = selected?.mo_ta ?? description ?? '';
  const placeholder = /^(Dữ liệu kiểm thử local|Bộ PC mẫu kiểm thử|Dữ liệu mẫu kiểm thử)/i.test(String(text).trim());
  return {fullSpecs,mainSpecs,specsSummary:basic.length ? basic.slice(0,8) : mainSpecs,description:placeholder ? '' : String(text),descriptionTitle:selected?.ten_phien_ban || ''};
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
