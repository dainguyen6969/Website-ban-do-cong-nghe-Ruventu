// Existing product add/edit form; image files resolve to Cloudinary URLs before local form save.
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
} from 'react-icons/hi';
import FormCard from '../../../../../shared/components/ui/FormCard';
import ImageUploader from '../../../../../shared/components/ui/ImageUploader';
import FilterDropdown from '../../../../../shared/components/ui/FilterDropdown';
import PriceInput from '../../../../../shared/components/ui/PriceInput';
import SerialModal from '../../../inventory/components/SerialModal';
import { getAllCategories } from '../../categories/api/categoryApi';
import { getAllBrands } from '../../brands/api/brandApi';
import { createProduct, getProductDetail, updateProduct } from '../api/productApi';
import './ThemSanPham.css';

// ── Dropdown options ──
const unitOptions = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cặp'];

// ── Variant combo generator ──
function generateVariants(attributes) {
  if (attributes.length === 0) {
    return [{ name: 'Mặc định', sku: '', giaBanLe: '', giaNhap: '', khoiLuong: '', tonDauKy: 0, serials: [], showSerial: false }];
  }
  const valueSets = attributes.map((a) => a.values);
  const combos = valueSets.reduce(
    (acc, vals) => {
      const result = [];
      for (const prefix of acc) {
        for (const v of vals) {
          result.push(prefix.length ? `${prefix} - ${v}` : v);
        }
      }
      return result;
    },
    ['']
  );
  return combos.map((name) => ({
    name,
    sku: '',
    giaBanLe: '',
    giaNhap: '',
    khoiLuong: '',
    tonDauKy: 0,
    serials: [],
    showSerial: false,
  }));
}

// ──────────────────────────────────────────
// Main component
// ──────────────────────────────────────────
export default function ThemSanPham() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditing = Boolean(productId);
  const [existingProduct, setExistingProduct] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const richTextRef = useRef(null);
  const descriptionInitializedRef = useRef(false);

  // ── General info ──
  const [tenSanPham, setTenSanPham] = useState('');
  const [maSanPham, setMaSanPham] = useState('');
  const [donViTinh, setDonViTinh] = useState('Cái');

  // ── Images ──
  const [images, setImages] = useState([]);

  // ── Description (rich text stored as HTML) ──
  const [moTa, setMoTa] = useState('');

  // ── Specs (thông số kỹ thuật) ──
  const [specs, setSpecs] = useState(() => [
    { id: 1, name: 'CPU', value: 'Intel Core i9-14900K' },
    { id: 2, name: 'RAM', value: '32GB DDR5 6400MHz' },
    { id: 3, name: 'GPU', value: 'RTX 4070 SUPER 12GB' },
  ]);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  let specIdCounter = useRef(4);

  // ── Product type toggle ──
  const [productType, setProductType] = useState('single'); // 'single' | 'combo'

  // ── Classification ──
  const [selectedCategory, setSelectedCategory] = useState('Danh mục');
  const [selectedBrand, setSelectedBrand] = useState('Thương hiệu');

  // ── Status ──
  const [trangThai, setTrangThai] = useState('Đang kinh doanh');

  // ── VAT ──
  const [vat, setVat] = useState('10%');

  // ── Form validation errors ──
  const [formErrors, setFormErrors] = useState({});
  const [catalog, setCatalog] = useState({ categories: [], brands: [] });
  const [saving, setSaving] = useState(false);
  const categoryOptions = useMemo(() => ['Danh mục', ...catalog.categories.map((item) => item.name)], [catalog.categories]);
  const brandOptions = useMemo(() => ['Thương hiệu', ...catalog.brands.map((item) => item.name)], [catalog.brands]);

  // ── Serial modal state ──
  const [serialModalState, setSerialModalState] = useState({
    isOpen: false,
    variantName: '',
    tonDauKy: 0,
    initialSerials: [],
  });

  // Combo creation is handled by the real combo form; these values only keep the legacy branch inert.
  const [comboSearch, setComboSearch] = useState('');
  const [comboItems, setComboItems] = useState([]);
  const [comboPrice, setComboPrice] = useState('');
  const [comboSearchFocused, setComboSearchFocused] = useState(false);

  // ── Attributes (for single/variant) ──
  const [attributes, setAttributes] = useState([]);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValues, setNewAttrValues] = useState('');

  // ── Variants ──
  const variants = useMemo(
    () => isEditing && existingProduct
      ? existingProduct.variants.map((variant) => ({ name: variant.name }))
      : generateVariants(attributes),
    [attributes, existingProduct, isEditing]
  );
  const [variantData, setVariantData] = useState({});

  const getVariant = useCallback(
    (name) => variantData[name] || { sku: '', giaBanLe: '', giaNhap: '', khoiLuong: '', tonDauKy: 0, serials: [], showSerial: false, serialConfirmed: false },
    [variantData]
  );

  const updateVariant = useCallback((name, field, value) => {
    setVariantData((prev) => ({
      ...prev,
      [name]: { ...prev[name], sku: '', giaBanLe: '', giaNhap: '', khoiLuong: '', tonDauKy: 0, serials: [], showSerial: false, serialConfirmed: false, ...prev[name], [field]: value },
    }));
  }, []);

  useEffect(() => {
    if (!isEditing) return undefined;
    const controller = new AbortController();
    getProductDetail(decodeURIComponent(productId), controller.signal)
      .then((product) => {
        setExistingProduct(product);
        setTenSanPham(product.tenSanPham);
        setMaSanPham(product.maSanPham);
        setDonViTinh(product.donViTinh === '—' ? 'Cái' : product.donViTinh);
        setImages(product.images);
        setMoTa(product.moTa);
        setSpecs(product.specs);
        setProductType(product.phanLoai.includes('Combo') ? 'combo' : 'single');
        setSelectedCategory(product.danhMuc || 'Danh mục');
        setSelectedBrand(product.thuongHieu || 'Thương hiệu');
        setTrangThai(product.trangThaiBan);
        setVat(product.vat);
        setVariantData(Object.fromEntries(product.variants.map((variant) => [variant.name, variant])));
        specIdCounter.current = product.specs.length + 1;
        descriptionInitializedRef.current = false;
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          alert(error.message || 'Không thể tải sản phẩm.');
          navigate('/admin/san-pham/danh-sach-san-pham');
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [isEditing, navigate, productId]);

  useEffect(() => {
    if (!descriptionInitializedRef.current && richTextRef.current && moTa) {
      richTextRef.current.innerHTML = moTa;
      descriptionInitializedRef.current = true;
    }
  }, [moTa]);

  useEffect(() => {
    Promise.all([getAllCategories(), getAllBrands()])
      .then(([categories, brands]) => setCatalog({ categories, brands }))
      .catch(() => setCatalog({ categories: [], brands: [] }));
  }, []);

  // ── Summary computations ──
  const totalVariants = variants.length;
  const totalTonDauKy = variants.reduce((sum, v) => sum + (getVariant(v.name).tonDauKy || 0), 0);
  const totalSerialsDeclared = variants.reduce((sum, v) => {
    const d = getVariant(v.name);
    return sum + (d.serials ? d.serials.filter((s) => s && s.trim()).length : 0);
  }, 0);
  const totalSerialsRequired = totalTonDauKy;
  const comboSearchResults = [];

  // ── Handlers ──
  const handleAddSpec = () => {
    if (!newSpecName.trim() || !newSpecValue.trim()) return;
    specIdCounter.current += 1;
    setSpecs((prev) => [...prev, { id: specIdCounter.current, name: newSpecName.trim(), value: newSpecValue.trim() }]);
    setNewSpecName('');
    setNewSpecValue('');
  };

  const handleRemoveSpec = (id) => {
    setSpecs((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddAttribute = () => {
    if (!newAttrName.trim() || !newAttrValues.trim()) return;
    const vals = newAttrValues.split(',').map((v) => v.trim()).filter(Boolean);
    if (vals.length === 0) return;
    setAttributes((prev) => [...prev, { name: newAttrName.trim(), values: vals }]);
    setNewAttrName('');
    setNewAttrValues('');
  };

  const handleRemoveAttribute = (idx) => {
    setAttributes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddComboItem = (product) => {
    setComboItems((prev) => [...prev, { ...product, qty: 1 }]);
    setComboSearch('');
  };
  const updateComboQuantity = (id, change) => setComboItems((prev) => prev.map((item) => item.id === id
    ? { ...item, qty: Math.max(1, (item.qty || 1) + change) }
    : item));
  const handleRemoveComboItem = (id) => setComboItems((prev) => prev.filter((item) => item.id !== id));

  // ── Serial Modal Handlers ──
  const handleOpenSerialModal = (variantName, tonDauKy, currentSerials) => {
    if (tonDauKy <= 0) return;
    setSerialModalState({
      isOpen: true,
      variantName,
      tonDauKy,
      initialSerials: currentSerials || [],
    });
  };

  const handleCloseSerialModal = () => {
    setSerialModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmSerials = (confirmedSerials) => {
    const { variantName } = serialModalState;
    updateVariant(variantName, 'serials', confirmedSerials);
    updateVariant(variantName, 'serialConfirmed', true);
    setSerialModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // ── Rich text commands ──
  const execCmd = (cmd, value) => {
    document.execCommand(cmd, false, value || null);
    richTextRef.current?.focus();
  };

  const handleInsertTable = () => {
    const html = '<table border="1" style="border-collapse:collapse;width:100%"><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></table><br>';
    document.execCommand('insertHTML', false, html);
    richTextRef.current?.focus();
  };

  // ── Form Validation (Requirement 6) ──
  const validateForm = () => {
    const errors = {};
    if (!tenSanPham.trim()) {
      errors.tenSanPham = 'Vui lòng nhập tên sản phẩm';
    }
    if (!maSanPham.trim()) {
      errors.maSanPham = 'Vui lòng nhập mã sản phẩm (SKU Parent)';
    }
    if (!selectedCategory || selectedCategory === 'Danh mục') {
      errors.selectedCategory = 'Vui lòng chọn danh mục';
    }
    if (!selectedBrand || selectedBrand === 'Thương hiệu') {
      errors.selectedBrand = 'Vui lòng chọn thương hiệu';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ──
  const handleSave = async () => {
    if (images.some((image) => image.uploading)) {
      alert('Ảnh đang được tải lên Cloudinary. Vui lòng chờ hoàn tất.');
      return;
    }
    const failedImage = images.find((image) => image.error);
    if (failedImage) {
      alert(failedImage.error);
      return;
    }
    if (!validateForm()) {
      if (!tenSanPham.trim()) {
        document.getElementById('input-ten-san-pham')?.focus();
        document.getElementById('input-ten-san-pham')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (!maSanPham.trim()) {
        document.getElementById('input-ma-san-pham')?.focus();
        document.getElementById('input-ma-san-pham')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (!selectedCategory || selectedCategory === 'Danh mục') {
        document.getElementById('filter-add-danh-muc')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (!selectedBrand || selectedBrand === 'Thương hiệu') {
        document.getElementById('filter-add-thuong-hieu')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (productType === 'single') {
      const unconfirmedVariant = variants.find((v) => {
        const d = getVariant(v.name);
        const ton = d.tonDauKy || 0;
        if (ton <= 0) return false;
        const validCount = d.serials ? d.serials.filter((s) => s && s.trim()).length : 0;
        return validCount !== ton || !d.serialConfirmed;
      });
      if (unconfirmedVariant) {
        alert(
          `Phiên bản "${unconfirmedVariant.name}" có tồn đầu kỳ (${getVariant(unconfirmedVariant.name).tonDauKy}) nhưng chưa xác nhận đủ mã Serial! Vui lòng bấm "NHẬP SERIAL" để hoàn tất.`
        );
        return;
      }
    } else {
      if (comboItems.length === 0) {
        alert('Sản phẩm Combo cần có ít nhất 1 sản phẩm thành phần! Vui lòng chọn sản phẩm thành phần.');
        return;
      }
    }

    const isCombo = productType === 'combo';
    const cleanCategory = selectedCategory === 'Danh mục' ? '' : selectedCategory;
    const cleanBrand = selectedBrand === 'Thương hiệu' ? '' : selectedBrand;
    const code = maSanPham.trim().toUpperCase();

    let tonKho = 0;
    let soPhienBan = null;

    if (!isCombo) {
      tonKho = variants.reduce((sum, v) => sum + (getVariant(v.name).tonDauKy || 0), 0);
      if (attributes.length > 0 || variants.length > 1) {
        soPhienBan = variants.length;
      }
    } else {
      tonKho = existingProduct?.tonKho ?? (comboItems.length > 0 ? 5 : 0);
      soPhienBan = null;
    }

    const canhBao = tonKho > 0 && tonKho <= 10 ? 'Sắp hết' : null;
    const hinhAnh = images.length > 0 ? (images[0].url || images[0].preview) : null;

    const newProduct = {
      id: code,
      maSanPham: code,
      tenSanPham: tenSanPham.trim(),
      phanLoai: isCombo ? 'Theo bộ (Combo)' : 'Sản phẩm đơn',
      thuongHieu: cleanBrand,
      danhMuc: cleanCategory,
      soPhienBan,
      tonKho,
      trangThaiBan: trangThai,
      canhBao,
      hinhAnh,
      donViTinh,
      vat,
      moTa: moTa || richTextRef.current?.innerHTML || '',
      specs,
      giaBanLe: isCombo ? Number(String(comboPrice).replace(/[^0-9]/g, '')) : undefined,
      giaNhap: existingProduct?.giaNhap,
      giaBanBuon: existingProduct?.giaBanBuon,
      khoiLuong: existingProduct?.khoiLuong,
      tags: existingProduct?.tags || [],
      coTheBan: existingProduct?.coTheBan,
      ...(isCombo
        ? {
            comboItems: comboItems.map((c) => ({
              id: c.id,
              maSanPham: c.maSanPham,
              tenSanPham: c.tenSanPham,
              qty: c.qty || 1,
              giaNhap: c.giaNhap || c.donGia || 0,
            })),
            comboPrice,
          }
        : {
            attributes,
            variants: variants.map((v) => ({ name: v.name, ...getVariant(v.name) })),
          }),
    };

    if (!isCombo) {
      const category = catalog.categories.find((item) => item.name === cleanCategory);
      const brand = catalog.brands.find((item) => item.name === cleanBrand);
      if (!category) {
        alert('Không tìm thấy danh mục trên backend. Vui lòng tải lại trang.');
        return;
      }
      setSaving(true);
      try {
        const payload = {
          danh_muc_id: category.id,
          thuong_hieu_id: brand?.id ?? null,
          ten_san_pham: newProduct.tenSanPham,
          ma_san_pham: newProduct.maSanPham,
          mo_ta: newProduct.moTa,
          thong_so_ky_thuat: Object.fromEntries(specs.map((item) => [item.name, item.value])),
          thue_vat: Number.parseInt(vat, 10),
          trang_thai: trangThai === 'Đang kinh doanh' ? 1 : 0,
          anh_san_pham: images.map((image, index) => ({
            duong_dan_anh: image.url,
            la_anh_chinh: index === 0,
            thu_tu_hien_thi: index,
          })),
        };
        if (isEditing) {
          await updateProduct(existingProduct.id, payload);
        } else {
          await createProduct({
            ...payload,
            loai_san_pham: 'DON',
            danh_sach_phien_ban: variants.map((variant) => {
            const data = getVariant(variant.name);
            return {
              ten_phien_ban: variant.name,
              ma_vach: data.sku,
              gia_ban_le: Number(String(data.giaBanLe).replace(/[^0-9]/g, '')),
              gia_nhap: Number(String(data.giaNhap).replace(/[^0-9]/g, '')),
              khoi_luong: data.khoiLuong ? Number(data.khoiLuong) : null,
              trang_thai: 1,
            };
          }),
          });
        }
      } catch (error) {
        alert(error?.message || 'Không thể lưu sản phẩm.');
        return;
      } finally {
        setSaving(false);
      }
    } else {
      navigate('/kho-hang/combo-san-pham/them-moi');
      return;
    }

    navigate('/admin/san-pham/danh-sach-san-pham');
  };

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════
  if (loading) return <main className="add-product-page"><p>Đang tải sản phẩm...</p></main>;

  return (
    <main className="add-product-page" role="main">
      {/* ─── Top action bar ─── */}
      <div className="add-product-topbar">
        <div className="add-product-topbar__left">
          <nav className="add-product-breadcrumb" aria-label="Breadcrumb">
            <span className="add-product-breadcrumb__item add-product-breadcrumb__item--muted">SẢN PHẨM</span>
            <span className="add-product-breadcrumb__sep" aria-hidden="true">›</span>
            <span className="add-product-breadcrumb__item add-product-breadcrumb__item--muted">DANH SÁCH</span>
            <span className="add-product-breadcrumb__sep" aria-hidden="true">›</span>
            <span className="add-product-breadcrumb__item add-product-breadcrumb__item--current">{isEditing ? 'CHỈNH SỬA' : 'THÊM MỚI'}</span>
          </nav>
          <h1 className="add-product-title">{isEditing ? 'CHỈNH SỬA SẢN PHẨM' : 'THÊM SẢN PHẨM MỚI'}</h1>
        </div>
        <div className="add-product-topbar__right">
          <button type="button" className="btn-add-product btn-add-product--outline" onClick={() => navigate('/admin/san-pham/danh-sach-san-pham')} id="btn-cancel-add">
            HỦY
          </button>
          <button type="button" className="btn-add-product btn-add-product--red" onClick={handleSave} id="btn-save-product" disabled={saving}>
            {isEditing ? 'CẬP NHẬT SẢN PHẨM' : 'LƯU SẢN PHẨM'}
          </button>
        </div>
      </div>

      <div className="add-product-divider" aria-hidden="true" />

      {/* ─── Two-column layout ─── */}
      <div className="add-product-columns">
        {/* ═══ LEFT COLUMN ═══ */}
        <div className="add-product-col-left">
          {/* 1. Thông tin chung */}
          <FormCard title="Thông tin chung" id="card-thong-tin-chung">
            <div className="form-group">
              <label className="form-label">Tên sản phẩm <span className="form-required">*</span></label>
              <input
                type="text"
                className={`form-input ${formErrors.tenSanPham ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Bàn phím cơ Keychron Q1 Pro"
                value={tenSanPham}
                onChange={(e) => {
                  setTenSanPham(e.target.value);
                  if (formErrors.tenSanPham) setFormErrors((prev) => ({ ...prev, tenSanPham: '' }));
                }}
                id="input-ten-san-pham"
              />
              {formErrors.tenSanPham && <span className="form-error-text">{formErrors.tenSanPham}</span>}
            </div>
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Mã sản phẩm (SKU Parent) <span className="form-required">*</span></label>
                <input
                  type="text"
                  className={`form-input ${formErrors.maSanPham ? 'form-input--error' : ''}`}
                  placeholder="SP-KEY-Q1P"
                  value={maSanPham}
                  onChange={(e) => {
                    setMaSanPham(e.target.value);
                    if (formErrors.maSanPham) setFormErrors((prev) => ({ ...prev, maSanPham: '' }));
                  }}
                  id="input-ma-san-pham"
                />
                {formErrors.maSanPham && <span className="form-error-text">{formErrors.maSanPham}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Đơn vị tính</label>
                <FilterDropdown id="filter-don-vi-tinh" options={unitOptions} value={donViTinh} onSelect={setDonViTinh} className="form-dropdown-full" direction="down" />
              </div>
            </div>
          </FormCard>

          {/* 2. Hình ảnh sản phẩm */}
          <FormCard title="Hình ảnh sản phẩm" id="card-hinh-anh">
            <ImageUploader images={images} onImagesChange={setImages} folder="products" />
          </FormCard>

          {/* 3. Chi tiết sản phẩm */}
          <FormCard title="Chi tiết sản phẩm" id="card-chi-tiet">
            {/* Mô tả sản phẩm — rich text */}
            <div className="form-group">
              <label className="form-label">Mô tả sản phẩm</label>
              <div className="richtext-wrapper">
                <div className="richtext-toolbar">
                  <button type="button" className="richtext-btn" title="Bold" onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}><strong>B</strong></button>
                  <button type="button" className="richtext-btn" title="Italic" onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}><em>I</em></button>
                  <button type="button" className="richtext-btn" title="Underline" onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}><u>U</u></button>
                  <button type="button" className="richtext-btn" title="Block Quote" onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'blockquote'); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-1.76-2H3v11c0 .57.07 1.18.76 2a4.84 4.84 0 0 1-.76 3m14 0c3 0 7-1 7-8V5c0-1.25-.76-2-1.76-2H17v11c0 .57.07 1.18.76 2a4.84 4.84 0 0 1-.76 3" /></svg>
                  </button>
                  <button type="button" className="richtext-btn" title="Heading" onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'h3'); }}><strong>H</strong></button>
                  <button type="button" className="richtext-btn" title="Chèn bảng" onMouseDown={(e) => { e.preventDefault(); handleInsertTable(); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                  </button>
                </div>
                <div
                  ref={richTextRef}
                  className="richtext-editor"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Nhập mô tả chi tiết về sản phẩm — giới thiệu, đặc điểm nổi bật, công dụng, tư vấn bán hàng…"
                  onInput={() => setMoTa(richTextRef.current?.innerHTML || '')}
                  id="richtext-mo-ta"
                />
              </div>
            </div>

            {/* Inset divider */}
            <div className="card-inset-divider" />

            {/* Thông số kỹ thuật */}
            <div className="form-group">
              <div className="spec-header">
                <label className="form-label" style={{ marginBottom: 0 }}>Thông số kỹ thuật</label>
                <span className="spec-helper-text">Không dùng để sinh phiên bản</span>
              </div>
              <table className="spec-table">
                <thead>
                  <tr>
                    <th className="spec-table__th">TÊN THÔNG SỐ</th>
                    <th className="spec-table__th">GIÁ TRỊ</th>
                    <th className="spec-table__th spec-table__th--action" />
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.id} className="spec-table__tr">
                      <td className="spec-table__td">{spec.name}</td>
                      <td className="spec-table__td">{spec.value}</td>
                      <td className="spec-table__td spec-table__td--action">
                        <button type="button" className="spec-remove-btn" onClick={() => handleRemoveSpec(spec.id)} aria-label="Xóa thông số">
                          <HiOutlineX size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="spec-add-row">
                <input type="text" className="form-input form-input--sm" placeholder="Tên thông số kỹ thuật" value={newSpecName} onChange={(e) => setNewSpecName(e.target.value)} id="input-spec-name" />
                <input type="text" className="form-input form-input--sm" placeholder="Giá trị" value={newSpecValue} onChange={(e) => setNewSpecValue(e.target.value)} id="input-spec-value" />
                <button type="button" className="btn-add-spec" onClick={handleAddSpec} id="btn-add-spec">THÊM</button>
              </div>
            </div>
          </FormCard>

          {/* ─── Conditional bottom section ─── */}
          {productType === 'single' ? (
            <>
              {/* Thuộc tính sản phẩm */}
              <FormCard title="Thuộc tính sản phẩm" id="card-thuoc-tinh">
                {attributes.length === 0 && (
                  <p className="empty-hint">Chưa có thuộc tính — hệ thống sẽ tạo một phiên bản &lsquo;Mặc định&rsquo;.</p>
                )}

                {attributes.length > 0 && (
                  <div className="attr-list">
                    {attributes.map((attr, idx) => (
                      <div key={idx} className="attr-tag-row">
                        <span className="attr-tag-name">{attr.name}:</span>
                        <div className="attr-tag-values">
                          {attr.values.map((v, vi) => (
                            <span key={vi} className="attr-tag">{v}</span>
                          ))}
                        </div>
                        <button type="button" className="attr-remove-btn" onClick={() => handleRemoveAttribute(idx)} aria-label="Xóa thuộc tính">
                          <HiOutlineX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="attr-add-row">
                  <input type="text" className="form-input form-input--sm" placeholder="Tên thuộc tính" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} id="input-attr-name" />
                  <input type="text" className="form-input form-input--sm" placeholder="Giá trị (Cách nhau bởi dấu phẩy)" value={newAttrValues} onChange={(e) => setNewAttrValues(e.target.value)} id="input-attr-values" />
                  <button type="button" className="btn-add-spec" onClick={handleAddAttribute} id="btn-add-attr">THÊM</button>
                </div>
                <p className="attr-helper">Hệ thống tự động sinh phiên bản từ tổ hợp các giá trị thuộc tính bên dưới.</p>
              </FormCard>

              {/* Chi tiết phiên bản & khởi tạo kho */}
              <FormCard title={`Chi tiết phiên bản & khởi tạo kho (${totalVariants} phiên bản)`} id="card-phien-ban">
                <div className="variant-table-wrapper">
                  <table className="variant-table">
                    <thead>
                      <tr>
                        <th className="variant-table__th">TÊN PHIÊN BẢN</th>
                        <th className="variant-table__th">MÃ SKU</th>
                        <th className="variant-table__th">GIÁ BÁN LẺ</th>
                        <th className="variant-table__th">GIÁ NHẬP</th>
                        <th className="variant-table__th">KHỐI LƯỢNG</th>
                        <th className="variant-table__th">TỒN ĐẦU KỲ</th>
                        <th className="variant-table__th variant-table__th--serial">SERIAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => {
                        const d = getVariant(v.name);
                        return (
                          <tr key={v.name} className="variant-table__tr">
                            <td className="variant-table__td variant-table__td--name">{v.name}</td>
                            <td className="variant-table__td">
                              <input type="text" className="form-input form-input--xs" value={d.sku} onChange={(e) => updateVariant(v.name, 'sku', e.target.value)} placeholder="SKU" />
                            </td>
                            <td className="variant-table__td">
                              <div className="price-input-wrap">
                                <PriceInput
                                  className="form-input form-input--xs"
                                  value={d.giaBanLe}
                                  onChange={(val) => updateVariant(v.name, 'giaBanLe', val)}
                                  placeholder="0"
                                />
                                <span className="price-unit">đ</span>
                              </div>
                            </td>
                            <td className="variant-table__td">
                              <div className="price-input-wrap">
                                <PriceInput
                                  className="form-input form-input--xs"
                                  value={d.giaNhap}
                                  onChange={(val) => updateVariant(v.name, 'giaNhap', val)}
                                  placeholder="0"
                                />
                                <span className="price-unit">đ</span>
                              </div>
                            </td>
                            <td className="variant-table__td">
                              <div className="price-input-wrap">
                                <input type="text" className="form-input form-input--xs" value={d.khoiLuong} onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '');
                                  updateVariant(v.name, 'khoiLuong', val);
                                }} placeholder="0.00" />
                                <span className="price-unit">kg</span>
                              </div>
                            </td>
                            <td className="variant-table__td">
                              <div className="stepper-wrap">
                                <button
                                  type="button"
                                  className="stepper-btn"
                                  onClick={() => {
                                    const nextVal = Math.max(0, (d.tonDauKy || 0) - 1);
                                    updateVariant(v.name, 'tonDauKy', nextVal);
                                    if (nextVal !== (d.serials ? d.serials.length : 0)) {
                                      updateVariant(v.name, 'serialConfirmed', false);
                                    }
                                  }}
                                  aria-label="Giảm"
                                >
                                  <HiOutlineChevronDown size={12} />
                                </button>
                                <input
                                  type="text"
                                  className="form-input form-input--xs stepper-input"
                                  value={d.tonDauKy || 0}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    const nextVal = Number.isNaN(n) ? 0 : Math.max(0, n);
                                    updateVariant(v.name, 'tonDauKy', nextVal);
                                    if (nextVal !== (d.serials ? d.serials.length : 0)) {
                                      updateVariant(v.name, 'serialConfirmed', false);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="stepper-btn"
                                  onClick={() => {
                                    const nextVal = (d.tonDauKy || 0) + 1;
                                    updateVariant(v.name, 'tonDauKy', nextVal);
                                    if (nextVal !== (d.serials ? d.serials.length : 0)) {
                                      updateVariant(v.name, 'serialConfirmed', false);
                                    }
                                  }}
                                  aria-label="Tăng"
                                >
                                  <HiOutlineChevronUp size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="variant-table__td variant-table__td--serial">
                              {(() => {
                                const validCount = d.serials ? d.serials.filter((s) => s && s.trim()).length : 0;
                                const isConfirmed = Boolean(
                                  d.serialConfirmed &&
                                  validCount === (d.tonDauKy || 0) &&
                                  (d.tonDauKy || 0) > 0
                                );
                                return (
                                  <button
                                    type="button"
                                    className={`btn-serial-enable ${(d.tonDauKy || 0) === 0 ? 'btn-serial-enable--disabled' : ''} ${
                                      isConfirmed ? 'btn-serial-enable--confirmed' : ''
                                    }`}
                                    disabled={(d.tonDauKy || 0) === 0}
                                    onClick={() => handleOpenSerialModal(v.name, d.tonDauKy || 0, d.serials)}
                                    id={`btn-serial-${v.name.replace(/\s+/g, '-')}`}
                                  >
                                    {isConfirmed ? `✓ ${validCount} đã nhập` : 'NHẬP SERIAL'}
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="variant-serial-hint">Số lượng Serial phải khớp chính xác với tồn đầu kỳ. Hệ thống sẽ từ chối lưu nếu còn thiếu Serial.</p>
              </FormCard>
            </>
          ) : (
            <>
              {/* Sản phẩm thành phần (Combo) */}
              <FormCard title="Sản phẩm thành phần" id="card-combo-thanh-phan">
                <div className="combo-search-wrap">
                  <div className="combo-search-box">
                    <HiOutlineSearch size={16} className="combo-search-icon" />
                    <input
                      type="text"
                      className="form-input combo-search-input"
                      placeholder="Tìm sản phẩm để thêm vào combo..."
                      value={comboSearch}
                      onChange={(e) => setComboSearch(e.target.value)}
                      onFocus={() => setComboSearchFocused(true)}
                      onBlur={() => setTimeout(() => setComboSearchFocused(false), 200)}
                      id="input-combo-search"
                    />
                  </div>
                  {comboSearchFocused && comboSearchResults.length > 0 && (
                    <ul className="combo-search-results">
                      {comboSearchResults.map((p) => (
                        <li key={p.id} className="combo-search-result-item" onMouseDown={() => handleAddComboItem(p)}>
                          <span className="combo-result-name">{p.tenSanPham}</span>
                          <span className="combo-result-category">{p.danhMuc || 'Chưa phân loại'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {comboItems.length === 0 ? (
                  <p className="empty-hint" style={{ marginTop: 16 }}>Chưa có sản phẩm thành phần – tìm kiếm và thêm ở trên.</p>
                ) : (
                  <div className="combo-items-list">
                    <table className="combo-items-table">
                      <thead><tr><th>SẢN PHẨM</th><th>SKU</th><th>SỐ LƯỢNG</th></tr></thead>
                      <tbody>{comboItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.tenSanPham}</td><td>{item.maSanPham}</td>
                          <td><div className="combo-quantity-control">
                            <button type="button" onClick={() => updateComboQuantity(item.id, -1)} aria-label="Giảm số lượng">−</button>
                            <span>{item.qty || 1}</span>
                            <button type="button" onClick={() => updateComboQuantity(item.id, 1)} aria-label="Tăng số lượng">+</button>
                            <button type="button" className="combo-item-remove" onClick={() => handleRemoveComboItem(item.id)} aria-label="Xóa sản phẩm">×</button>
                          </div></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}

                {/* Giá bán combo */}
                <div className="form-group" style={{ marginTop: 20 }}>
                  <label className="form-label">Giá bán combo</label>
                  <div className="price-input-wrap price-input-wrap--lg">
                    <PriceInput
                      className="form-input"
                      value={comboPrice}
                      onChange={(val) => setComboPrice(val)}
                      placeholder="0"
                      style={{ color: !comboPrice ? 'var(--color-brand-red)' : undefined }}
                      id="input-combo-price"
                    />
                    <span className="price-unit">đ</span>
                  </div>
                </div>
              </FormCard>
            </>
          )}
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="add-product-col-right">
          {/* 1. Loại sản phẩm */}
          <FormCard title="Loại sản phẩm" id="card-loai-san-pham">
            <button
              type="button"
              className={`type-option ${productType === 'single' ? 'type-option--active' : ''}`}
              onClick={() => setProductType('single')}
              disabled={isEditing}
              id="opt-type-single"
            >
              <span className={`square-checkbox ${productType === 'single' ? 'square-checkbox--checked' : ''}`}>
                {productType === 'single' && <span className="square-checkbox__inner" />}
              </span>
              <div className="type-option__content">
                <span className="type-option__title">Sản phẩm đơn / Có phiên bản</span>
                <span className="type-option__sub">Quản lý biến thể (màu, dung lượng...)</span>
              </div>
            </button>
            <button
              type="button"
              className={`type-option ${productType === 'combo' ? 'type-option--active' : ''}`}
              onClick={() => navigate('/kho-hang/combo-san-pham/them-moi')}
              disabled={isEditing}
              id="opt-type-combo"
            >
              <span className={`square-checkbox ${productType === 'combo' ? 'square-checkbox--checked' : ''}`}>
                {productType === 'combo' && <span className="square-checkbox__inner" />}
              </span>
              <div className="type-option__content">
                <span className="type-option__title">Sản phẩm theo bộ (Combo)</span>
                <span className="type-option__sub">Tập hợp nhiều sản phẩm đơn lại</span>
              </div>
            </button>
          </FormCard>

          {/* 2. Phân loại */}
          <FormCard title="Phân loại" id="card-phan-loai">
            <div className="form-group">
              <label className="form-label">Danh mục <span className="form-required">*</span></label>
              <FilterDropdown
                id="filter-add-danh-muc"
                options={categoryOptions}
                value={selectedCategory}
                onSelect={(val) => {
                  setSelectedCategory(val);
                  if (val !== 'Danh mục' && formErrors.selectedCategory) {
                    setFormErrors((prev) => ({ ...prev, selectedCategory: '' }));
                  }
                }}
                className={`form-dropdown-full ${formErrors.selectedCategory ? 'filter-dropdown--error' : ''}`}
                direction="up"
              />
              {formErrors.selectedCategory && (
                <span className="form-error-text">{formErrors.selectedCategory}</span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Thương hiệu <span className="form-required">*</span></label>
              <FilterDropdown
                id="filter-add-thuong-hieu"
                options={brandOptions}
                value={selectedBrand}
                onSelect={(val) => {
                  setSelectedBrand(val);
                  if (val !== 'Thương hiệu' && formErrors.selectedBrand) {
                    setFormErrors((prev) => ({ ...prev, selectedBrand: '' }));
                  }
                }}
                className={`form-dropdown-full ${formErrors.selectedBrand ? 'filter-dropdown--error' : ''}`}
                direction="up"
              />
              {formErrors.selectedBrand && (
                <span className="form-error-text">{formErrors.selectedBrand}</span>
              )}
            </div>
          </FormCard>

          {/* 3. Trạng thái */}
          <FormCard title="Trạng thái" id="card-trang-thai">
            <div className="status-options-group">
              <div
                className={`status-option-row ${trangThai === 'Đang kinh doanh' ? 'status-option-row--selected' : ''}`}
                onClick={() => setTrangThai('Đang kinh doanh')}
                role="radio"
                aria-checked={trangThai === 'Đang kinh doanh'}
                tabIndex={0}
                id="opt-status-active"
              >
                <span className="square-radio">
                  {trangThai === 'Đang kinh doanh' && <span className="square-radio__inner" />}
                </span>
                <span className="status-indicator status-indicator--green" />
                <span className="status-label">Đang kinh doanh</span>
              </div>

              <div
                className={`status-option-row ${trangThai === 'Ngừng kinh doanh' ? 'status-option-row--selected' : ''}`}
                onClick={() => setTrangThai('Ngừng kinh doanh')}
                role="radio"
                aria-checked={trangThai === 'Ngừng kinh doanh'}
                tabIndex={0}
                id="opt-status-inactive"
              >
                <span className="square-radio">
                  {trangThai === 'Ngừng kinh doanh' && <span className="square-radio__inner" />}
                </span>
                <span className="status-indicator status-indicator--red" />
                <span className="status-label">Ngừng kinh doanh</span>
              </div>
            </div>
          </FormCard>

          {/* 4. Thuế VAT */}
          <FormCard title="Thuế VAT" id="card-thue-vat">
            <div className="vat-segment">
              {['0%', '5%', '10%'].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`vat-btn ${vat === v ? 'vat-btn--active' : ''}`}
                  onClick={() => setVat(v)}
                  id={`opt-vat-${v.replace('%', '')}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </FormCard>

          {/* 5. Tóm tắt phiên bản (single/variant only) */}
          {productType === 'single' && (
            <FormCard title="Tóm tắt phiên bản" id="card-tom-tat">
              <div className="summary-rows">
                <div className="summary-row">
                  <span className="summary-label">Số phiên bản:</span>
                  <span className="summary-value">{totalVariants}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Tổng tồn đầu kỳ:</span>
                  <span className="summary-value summary-value--red">{totalTonDauKy}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Serial khai báo:</span>
                  <span className="summary-value summary-value--green">{totalSerialsDeclared} / {totalSerialsRequired}</span>
                </div>
              </div>
            </FormCard>
          )}
        </div>
      </div>

      {/* Serial Entry Modal */}
      <SerialModal
        isOpen={serialModalState.isOpen}
        onClose={handleCloseSerialModal}
        variantName={serialModalState.variantName}
        tonDauKy={serialModalState.tonDauKy}
        initialSerials={serialModalState.initialSerials}
        onConfirm={handleConfirmSerials}
      />
    </main>
  );
}
