import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiOutlinePlus,
  HiOutlineSave,
  HiOutlineSearch,
  HiOutlineX,
} from "react-icons/hi";

import FormCard from "../../../../../shared/components/ui/FormCard";
import ImageUploader from "../../../../../shared/components/ui/ImageUploader";
import FilterDropdown from "../../../../../shared/components/ui/FilterDropdown";
import { apiRequest } from "../../../../../auth/backendAuth";
import { getAllCategories } from "../../categories/api/categoryApi";
import { getAllBrands } from "../../brands/api/brandApi";
import { createProduct, updateProduct } from "../api/productApi";
import { defaultVariantName } from "./variantNames";
import "./ThemSanPham.css";

const PRODUCTS = "/api/v1/admin/products";
const COMBOS = "/api/v1/admin/combos";
const MAX_VARIANTS = 100;
const MAX_QUANTITY = 2147483647;

let localSequence = 0;

function localId() {
  localSequence += 1;
  return `product-local-${localSequence}`;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ");
}

function comparisonKey(value) {
  return normalizeText(value).toLocaleLowerCase("vi");
}

function uniqueValues(values) {
  const found = new Set();

  return values.map(normalizeText).filter((value) => {
    if (!value) return false;

    const key = comparisonKey(value);
    if (found.has(key)) return false;

    found.add(key);
    return true;
  });
}

function rowValues(row) {
  return uniqueValues([
    ...row.values,
    ...String(row.draft || "").split(/[,;\n]+/u),
  ]);
}

function newAttributeRow() {
  return {
    key: localId(),
    name: "",
    values: [],
    draft: "",
  };
}

function newManualVariant(label = "") {
  return {
    key: localId(),
    id: null,
    label,
    autoName: true,
    sku: "",
    retail: "",
    cost: "",
    weight: "",
    status: 1,
    serialMode: "",
    serialModeLocked: false,
    attributes: [],
  };
}

function makeVariantPlan(attributeRows, manualRows) {
  const problems = [];
  const names = new Set();

  const groups = attributeRows
    .map((row) => ({
      key: row.key,
      name: normalizeText(row.name),
      values: rowValues(row),
    }))
    .filter((row) => row.name || row.values.length);

  for (const group of groups) {
    if (!group.name || group.name.length > 100) {
      problems.push("Tên thuộc tính phải có từ 1 đến 100 ký tự.");
    }

    if (!group.values.length) {
      problems.push(`Hãy thêm giá trị cho thuộc tính "${group.name}".`);
    }

    if (group.values.some((value) => value.length > 255)) {
      problems.push(`Giá trị của "${group.name}" không được quá 255 ký tự.`);
    }

    if (group.name) {
      const key = comparisonKey(group.name);

      if (names.has(key)) {
        problems.push(`Tên thuộc tính "${group.name}" bị trùng.`);
      }

      names.add(key);
    }
  }

  const completeGroups = groups.filter(
    (group) => group.name && group.values.length,
  );
  const count = completeGroups.reduce(
    (total, group) => total * group.values.length,
    1,
  );

  if (count > MAX_VARIANTS) {
    return {
      rows: [],
      groups: completeGroups,
      problems: [
        ...problems,
        `Chỉ tạo tối đa ${MAX_VARIANTS} phiên bản một lần.`,
      ],
      count,
    };
  }

  if (!completeGroups.length) {
    return {
      rows: manualRows,
      groups: [],
      problems,
      count: manualRows.length,
    };
  }

  const combinations = completeGroups.reduce(
    (rows, group) =>
      rows.flatMap((row) =>
        group.values.map((value) => [
          ...row,
          {
            groupKey: group.key,
            ten_thuoc_tinh: group.name,
            gia_tri: value,
          },
        ]),
      ),
    [[]],
  );

  return {
    rows: combinations.map((items) => ({
      key: `generated:${JSON.stringify(
        items.map((item) => [item.groupKey, comparisonKey(item.gia_tri)]),
      )}`,
      id: null,
      generated: true,
      autoName: true,
      label: items.map((item) => item.gia_tri).join(" - "),
      attributes: items.map(({ ten_thuoc_tinh, gia_tri }) => ({
        ten_thuoc_tinh,
        gia_tri,
      })),
    })),
    groups: completeGroups,
    problems,
    count: combinations.length,
  };
}

function cleanAttributes(items) {
  const names = new Set();

  return items.map((item, index) => {
    const name = normalizeText(item.ten_thuoc_tinh);
    const value = String(item.gia_tri ?? "").trim();

    if (!name || name.length > 100 || !value || value.length > 255) {
      throw new Error(
        `Thuộc tính ${index + 1}: tên dài 1–100 và giá trị dài 1–255 ký tự.`,
      );
    }

    const key = comparisonKey(name);

    if (names.has(key)) {
      throw new Error(`Tên thuộc tính "${name}" bị trùng.`);
    }

    names.add(key);

    return {
      ten_thuoc_tinh: name,
      gia_tri: value,
    };
  });
}

function moneyValue(value, label, positive = false) {
  const text = String(value ?? "").trim();

  if (!/^\d{1,13}(?:\.\d{1,2})?$/u.test(text)) {
    throw new Error(
      `${label} phải là số tiền hợp lệ, tối đa hai chữ số thập phân.`,
    );
  }

  const number = Number(text);

  if (!Number.isFinite(number) || number < 0 || (positive && number <= 0)) {
    throw new Error(
      `${label} ${positive ? "phải lớn hơn 0" : "không được âm"}.`,
    );
  }

  return number;
}

function showValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function warrantyText(months) {
  if (months == null) return "Chưa có thông tin";
  return Number(months) === 0 ? "Không bảo hành" : `${months} tháng`;
}

function normalizePart(item) {
  return {
    id: Number(item.phien_ban_id ?? item.phien_ban_thanh_phan_id),
    name: item.ten_san_pham || "",
    variant: item.ten_phien_ban || "",
    code: item.ma_san_pham || "",
    barcode: item.ma_vach || "",
    image: item.anh_chinh || "",
    stock: item.ton_co_the_ban,
    warrantyMonths: item.thoi_han_bao_hanh_thang,
    qty: String(item.so_luong ?? 1),
  };
}

function VariantAttributes({ items, change }) {
  return (
    <div className="product-editor__variant-attributes">
      {items.map((item, index) => (
        <div
          className="product-editor__attribute-pair"
          key={item.key ?? item.id ?? index}
        >
          <input
            aria-label={`Tên thuộc tính ${index + 1}`}
            placeholder="Tên thuộc tính"
            maxLength={100}
            value={item.ten_thuoc_tinh}
            onChange={(event) =>
              change(
                items.map((entry, itemIndex) =>
                  itemIndex === index
                    ? { ...entry, ten_thuoc_tinh: event.target.value }
                    : entry,
                ),
              )
            }
          />

          <input
            aria-label={`Giá trị thuộc tính ${index + 1}`}
            placeholder="Giá trị"
            maxLength={255}
            value={item.gia_tri}
            onChange={(event) =>
              change(
                items.map((entry, itemIndex) =>
                  itemIndex === index
                    ? { ...entry, gia_tri: event.target.value }
                    : entry,
                ),
              )
            }
          />

          <button
            type="button"
            className="product-editor__icon-button"
            aria-label="Xóa thuộc tính"
            onClick={() =>
              change(items.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            <HiOutlineX />
          </button>
        </div>
      ))}

      <button
        type="button"
        className="product-editor__button"
        onClick={() =>
          change([
            ...items,
            {
              key: localId(),
              ten_thuoc_tinh: "",
              gia_tri: "",
            },
          ])
        }
      >
        <HiOutlinePlus /> THÊM THUỘC TÍNH
      </button>
    </div>
  );
}

export default function ThemSanPham() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(productId);

  const busyRef = useRef(false);
  const descriptionRef = useRef(null);
  const specNameRef = useRef(null);
  const attributeRefs = useRef({});
  const createdVariantIds = useRef(new Map());

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [images, setImages] = useState([]);
  const [initialDescription, setInitialDescription] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "DON",
    categoryId: "",
    brandId: "",
    status: 1,
    vat: "10",
    warrantyMonths: "",
  });

  const [specs, setSpecs] = useState([]);
  const [specDraft, setSpecDraft] = useState({ name: "", value: "" });
  const [specError, setSpecError] = useState("");

  const [attributeRows, setAttributeRows] = useState(() => [newAttributeRow()]);
  const [manualRows, setManualRows] = useState(() => [newManualVariant()]);
  const [variantDrafts, setVariantDrafts] = useState({});
  const [attributeEditor, setAttributeEditor] = useState("");

  const [parts, setParts] = useState([]);
  const [comboPrice, setComboPrice] = useState("");
  const [originalCombo, setOriginalCombo] = useState(null);
  const [configurationLocked, setConfigurationLocked] = useState(false);
  const [comboSearch, setComboSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const isCombo = form.type === "BO_PC";

  useEffect(() => {
    const controller = new AbortController();
    let current = true;

    setLoading(true);
    setLoadError("");
    createdVariantIds.current.clear();

    const productTask = isEditing
      ? (async () => {
          const product = await apiRequest(
            `${PRODUCTS}/${encodeURIComponent(productId)}`,
            { signal: controller.signal },
          );

          const combo =
            product.loai_san_pham === "BO_PC"
              ? await apiRequest(`${COMBOS}/${encodeURIComponent(productId)}`, {
                  signal: controller.signal,
                })
              : null;

          return { product, combo };
        })()
      : Promise.resolve(null);

    Promise.all([getAllCategories(), getAllBrands(), productTask])
      .then(([categoryItems, brandItems, data]) => {
        if (!current) return;

        setCategories(categoryItems);
        setBrands(brandItems);
        setVariantDrafts({});
        setAttributeRows([newAttributeRow()]);
        setSpecDraft({ name: "", value: "" });
        setSpecError("");

        if (!data) {
          setForm({
            name: "",
            code: "",
            type: "DON",
            categoryId: "",
            brandId: "",
            status: 1,
            vat: "10",
            warrantyMonths: "",
          });
          setManualRows([newManualVariant()]);
          setSpecs([]);
          setImages([]);
          setInitialDescription("");
          setParts([]);
          setComboPrice("");
          setOriginalCombo(null);
          setConfigurationLocked(false);
          return;
        }

        const { product, combo } = data;
        const sourceVariants = product.danh_sach_phien_ban || [];

        setForm({
          name: product.ten_san_pham || "",
          code: product.ma_san_pham || "",
          type: product.loai_san_pham,
          categoryId: String(product.danh_muc?.id ?? combo?.danh_muc_id ?? ""),
          brandId: String(
            product.thuong_hieu?.id ?? combo?.thuong_hieu_id ?? "",
          ),
          status: Number(product.trang_thai),
          vat: String(product.thue_vat ?? 0),
          warrantyMonths:
            product.thoi_han_bao_hanh_thang == null
              ? ""
              : String(product.thoi_han_bao_hanh_thang),
        });

        setInitialDescription(product.mo_ta || "");

        setImages(
          (product.anh_san_pham || []).map((item) => ({
            id: item.id,
            url: item.duong_dan_anh,
          })),
        );

        setSpecs(
          Object.entries(product.thong_so_ky_thuat || {}).map(
            ([name, value]) => ({ key: localId(), name, value }),
          ),
        );

        setManualRows(
          sourceVariants.map((item) => {
            const attributes = item.thuoc_tinh_phien_ban || [];
            const automaticName =
              sourceVariants.length === 1 &&
              (item.ten_phien_ban === product.ten_san_pham ||
                item.ten_phien_ban === "Mặc định");

            return {
              key: `saved-${item.id}`,
              id: Number(item.id),
              label: attributes
                .map((attribute) => attribute.gia_tri)
                .join(" - "),
              name: automaticName ? undefined : item.ten_phien_ban,
              autoName: automaticName,
              sku: item.ma_vach || "",
              retail: String(item.gia_ban_le ?? ""),
              cost: String(item.gia_nhap ?? ""),
              weight: String(item.khoi_luong ?? ""),
              status: Number(item.trang_thai),
              serialMode:
                typeof item.co_quan_ly_serial === "boolean"
                  ? String(item.co_quan_ly_serial)
                  : "",
              serialModeLocked: Boolean(item.che_do_serial_bi_khoa),
              attributes,
            };
          }),
        );

        setOriginalCombo(combo);
        setConfigurationLocked(Boolean(combo?.cau_hinh_bi_khoa));
        setParts((combo?.thanh_phan || []).map(normalizePart));
        setComboPrice(
          String(combo?.gia_ban_le ?? sourceVariants[0]?.gia_ban_le ?? ""),
        );
      })
      .catch((cause) => {
        if (current && cause.name !== "AbortError") {
          setLoadError(cause.message || "Không thể tải dữ liệu biểu mẫu.");
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [isEditing, productId, reload]);

  useEffect(() => {
    if (!loading && descriptionRef.current) {
      descriptionRef.current.innerHTML = initialDescription;
    }
  }, [loading, initialDescription]);

  useEffect(() => {
    if (!isCombo || !searchOpen || configurationLocked) return undefined;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const params = new URLSearchParams({
          keyword: comboSearch.trim(),
          page: "0",
          limit: "20",
        });

        const data = await apiRequest(`${COMBOS}/component-options?${params}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setSearchResults(data?.items || []);
        }
      } catch (cause) {
        if (cause.name !== "AbortError") setSearchError(cause.message);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isCombo, searchOpen, comboSearch, configurationLocked]);

  const plan = useMemo(
    () =>
      isEditing
        ? {
            rows: manualRows,
            groups: [],
            problems: [],
            count: manualRows.length,
          }
        : makeVariantPlan(attributeRows, manualRows),
    [attributeRows, manualRows, isEditing],
  );

  const variants = useMemo(
    () =>
      plan.rows.map((row) => {
        const draft = variantDrafts[row.key] || {};

        const defaultName = row.autoName
          ? defaultVariantName(form.name, row.label, plan.rows.length)
          : row.name;

        return {
          sku: "",
          retail: "",
          cost: "",
          weight: "",
          status: 1,
          serialMode: "",
          serialModeLocked: false,
          ...row,
          ...draft,
          name: draft.name ?? defaultName ?? "",
          attributes: row.generated
            ? row.attributes
            : (draft.attributes ?? row.attributes ?? []),
        };
      }),
    [plan, variantDrafts, form.name],
  );

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateVariant = (key, patch) => {
    setVariantDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  const updateAttribute = (key, patch) => {
    setAttributeRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const commitAttributeValues = (key) => {
    setAttributeRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, values: rowValues(row), draft: "" } : row,
      ),
    );
  };

  const addAttributeRow = () => {
    if (attributeRows.length >= 100) return;

    const row = newAttributeRow();
    setAttributeRows((current) => [...current, row]);

    requestAnimationFrame(() => attributeRefs.current[row.key]?.focus());
  };

  const addSpec = () => {
    const name = normalizeText(specDraft.name);
    const value = specDraft.value.trim();

    if (!name || !value) {
      setSpecError("Nhập đủ tên thông số và giá trị trước khi thêm.");
      return;
    }

    if (
      specs.some((item) => comparisonKey(item.name) === comparisonKey(name))
    ) {
      setSpecError(`Thông số "${name}" đã tồn tại.`);
      return;
    }

    const item = { key: localId(), name, value };

    setSpecs((current) => [...current, item]);
    setSpecDraft({ name: "", value: "" });
    setSpecError("");

    requestAnimationFrame(() => specNameRef.current?.focus());
  };

  const descriptionCommand = (command, value) => {
    descriptionRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const addPart = (item) => {
    const id = Number(item.phien_ban_id);

    if (configurationLocked || parts.some((part) => part.id === id)) return;

    setParts((current) => [
      ...current,
      normalizePart({ ...item, so_luong: 1 }),
    ]);
    setComboSearch("");
    setSearchOpen(false);
  };

  const updatePart = (id, patch) => {
    if (configurationLocked) return;

    setParts((current) =>
      current.map((part) => (part.id === id ? { ...part, ...patch } : part)),
    );
  };

  const stepQuantity = (part, step) => {
    const current = Number(part.qty);
    const quantity = Number.isSafeInteger(current) ? current : 1;

    updatePart(part.id, {
      qty: String(Math.min(MAX_QUANTITY, Math.max(1, quantity + step))),
    });
  };

  const save = async () => {
    if (busyRef.current || loading || loadError) return;
    setError("");

    try {
      const name = form.name.trim();
      const code = form.code.trim();

      if (!name || name.length > 255 || !code || code.length > 50) {
        throw new Error(
          "Nhập tên sản phẩm tối đa 255 và mã sản phẩm tối đa 50 ký tự.",
        );
      }

      if (!form.categoryId) throw new Error("Vui lòng chọn danh mục.");

      if (images.some((item) => item.uploading)) {
        throw new Error("Ảnh đang tải lên. Vui lòng chờ hoàn tất.");
      }

      if (images.some((item) => item.error)) {
        throw new Error(images.find((item) => item.error).error);
      }

      const vat = Number(form.vat);

      if (!Number.isFinite(vat) || vat < 0 || vat > 100) {
        throw new Error("VAT phải nằm trong khoảng 0–100.");
      }

      if (
        !isCombo &&
        (!/^\d+$/u.test(form.warrantyMonths) ||
          Number(form.warrantyMonths) > MAX_QUANTITY)
      ) {
        throw new Error(
          "Nhập số tháng bảo hành nguyên không âm; nhập 0 nếu không bảo hành.",
        );
      }

      const specifications = [...specs];

      // Giữ cả thông số đã nhập đủ nhưng chưa nhấn THÊM.
      if (specDraft.name.trim() || specDraft.value.trim()) {
        if (!specDraft.name.trim() || !specDraft.value.trim()) {
          throw new Error("Thông số đang nhập còn thiếu tên hoặc giá trị.");
        }

        specifications.push({
          name: normalizeText(specDraft.name),
          value: specDraft.value.trim(),
        });
      }

      const specificationNames = specifications.map((item) =>
        comparisonKey(item.name),
      );

      if (new Set(specificationNames).size !== specificationNames.length) {
        throw new Error("Tên thông số kỹ thuật bị trùng.");
      }

      const body = {
        danh_muc_id: Number(form.categoryId),
        thuong_hieu_id: form.brandId ? Number(form.brandId) : null,
        ten_san_pham: name,
        ma_san_pham: code,
        mo_ta: descriptionRef.current?.innerHTML ?? initialDescription,
        thong_so_ky_thuat: Object.fromEntries(
          specifications.map((item) => [normalizeText(item.name), item.value]),
        ),
        thue_vat: vat,
        trang_thai: Number(form.status),
        anh_san_pham: images.map((item, index) => ({
          duong_dan_anh: item.url,
          la_anh_chinh: index === 0,
          thu_tu_hien_thi: index,
        })),
        ...(!isCombo
          ? { thoi_han_bao_hanh_thang: Number(form.warrantyMonths) }
          : {}),
      };

      let preparedVariants = [];
      let preparedParts = [];
      let price = null;

      if (isCombo) {
        price = moneyValue(comboPrice, "Giá bán combo", true);

        preparedParts = parts.map((part) => {
          const quantity = Number(part.qty);

          if (
            !/^\d+$/u.test(part.qty) ||
            !Number.isSafeInteger(quantity) ||
            quantity <= 0 ||
            quantity > MAX_QUANTITY
          ) {
            throw new Error(
              `Số lượng của "${part.name}" phải là số nguyên dương.`,
            );
          }

          return {
            phien_ban_thanh_phan_id: part.id,
            so_luong: quantity,
          };
        });

        if (isEditing && !preparedParts.length) {
          if ((originalCombo?.thanh_phan || []).length) {
            throw new Error("Combo phải giữ ít nhất một linh kiện.");
          }

          if (price !== Number(originalCombo?.gia_ban_le)) {
            throw new Error(
              "Chọn linh kiện để cấu hình bộ PC trước khi đổi giá bán.",
            );
          }
        }
      } else {
        if (plan.problems.length) {
          throw new Error([...new Set(plan.problems)].join("\n"));
        }

        if (!variants.length || variants.length > MAX_VARIANTS) {
          throw new Error(`Cần từ 1 đến ${MAX_VARIANTS} phiên bản.`);
        }

        const variantNames = new Set();

        preparedVariants = variants.map((variant) => {
          const variantName = variant.name.trim();
          const key = comparisonKey(variantName);
          const weight = variant.weight === "" ? 0 : Number(variant.weight);

          if (
            !variantName ||
            variantName.length > 150 ||
            variantNames.has(key)
          ) {
            throw new Error(
              "Tên phiên bản phải có 1–150 ký tự và không được trùng.",
            );
          }
          variantNames.add(key);

          if (!["true", "false"].includes(variant.serialMode)) {
            throw new Error(`Chọn chế độ quản lý serial cho "${variantName}".`);
          }

          if (!Number.isFinite(weight) || weight < 0) {
            throw new Error(`Khối lượng của "${variantName}" không hợp lệ.`);
          }

          return {
            key: variant.key,
            id: variant.id,
            body: {
              ten_phien_ban: variantName,
              ma_vach: variant.sku.trim() || null,
              gia_ban_le: moneyValue(
                variant.retail,
                `Giá bán "${variantName}"`,
                true,
              ),
              gia_nhap: moneyValue(variant.cost, `Giá nhập "${variantName}"`),
              khoi_luong: weight,
              trang_thai: Number(variant.status),
              co_quan_ly_serial: variant.serialMode === "true",
            },
            attributes: cleanAttributes(variant.attributes),
          };
        });
      }

      busyRef.current = true;
      setSaving(true);

      if (isCombo && preparedParts.length) {
        const comboBody = {
          ...body,
          ten_phien_ban: name,
          gia_ban_le: price,
          khoi_luong: originalCombo?.khoi_luong ?? 0,
          ...(isEditing ? { ma_vach: originalCombo?.ma_vach ?? null } : {}),
          thanh_phan: preparedParts,
        };

        console.debug("COMBO_REQUEST:", JSON.stringify(comboBody, null, 2));

        await apiRequest(
          isEditing ? `${COMBOS}/${encodeURIComponent(productId)}` : COMBOS,
          {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(comboBody),
          },
        );
      } else if (!isEditing) {
        await createProduct({
          ...body,
          loai_san_pham: form.type,
          danh_sach_phien_ban: isCombo
            ? [
                {
                  ten_phien_ban: name,
                  ma_vach: null,
                  gia_ban_le: price,
                  gia_nhap: 0,
                  khoi_luong: 0,
                  trang_thai: Number(form.status),
                  co_quan_ly_serial: false,
                  thuoc_tinh_phien_ban: [],
                },
              ]
            : preparedVariants.map((item) => ({
                ...item.body,
                thuoc_tinh_phien_ban: item.attributes,
              })),
        });
      } else {
        await updateProduct(productId, body);

        if (!isCombo) {
          const productPath = `${PRODUCTS}/${encodeURIComponent(productId)}`;

          for (const item of preparedVariants) {
            const variantId =
              item.id || createdVariantIds.current.get(item.key);

            // DTO hiện tại yêu cầu mảng thuộc tính cho cả POST và PUT.
            const variantPayload = {
              ...item.body,
              thuoc_tinh_phien_ban: item.attributes,
            };

            if (variantId) {
              const variantPath =
                `${productPath}/variants/` + encodeURIComponent(variantId);

              // Cập nhật thông tin phiên bản.
              await apiRequest(variantPath, {
                method: "PUT",
                body: JSON.stringify(variantPayload),
              });

              // Service cập nhật phiên bản chưa lưu thuộc tính,
              // nên tiếp tục lưu bằng API thuộc tính riêng.
              await apiRequest(`${variantPath}/attributes`, {
                method: "PUT",
                body: JSON.stringify({
                  thuoc_tinh_phien_ban: item.attributes,
                }),
              });
            } else {
              // Thêm phiên bản mới kèm thuộc tính.
              const created = await apiRequest(`${productPath}/variants`, {
                method: "POST",
                body: JSON.stringify(variantPayload),
              });

              // Ghi nhớ ID để tránh tạo trùng nếu lần lưu sau bị lỗi.
              createdVariantIds.current.set(item.key, created.id);

              setManualRows((current) =>
                current.map((row) =>
                  row.key === item.key ? { ...row, id: created.id } : row,
                ),
              );
            }
          }
        }
      }

      navigate("/admin/san-pham/danh-sach-san-pham");
    } catch (cause) {
      const details = cause.data?.errors
        ?.map((item) => `${item.field}: ${item.message}`)
        .join("\n");

      setError(details || cause.message || "Không thể lưu sản phẩm.");
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="product-editor">Đang tải biểu mẫu...</main>;
  }

  if (loadError) {
    return (
      <main className="product-editor">
        <div className="product-editor__error" role="alert">
          {loadError}
        </div>
        <button
          type="button"
          className="product-editor__button"
          onClick={() => setReload((value) => value + 1)}
        >
          TẢI LẠI
        </button>
      </main>
    );
  }

  return (
    <main className="product-editor">
      <header className="product-editor__topbar">
        <div>
          <nav className="product-editor__breadcrumb" aria-label="Breadcrumb">
            SẢN PHẨM <span>›</span> DANH SÁCH <span>›</span>
            <strong>{isEditing ? "CHỈNH SỬA" : "THÊM MỚI"}</strong>
          </nav>

          <h1>{isEditing ? "CHỈNH SỬA SẢN PHẨM" : "THÊM SẢN PHẨM MỚI"}</h1>
        </div>

        <div className="product-editor__actions">
          <button
            type="button"
            className="product-editor__button"
            disabled={saving}
            onClick={() => navigate("/admin/san-pham/danh-sach-san-pham")}
          >
            HỦY
          </button>

          <button
            type="button"
            className="product-editor__button product-editor__button--red"
            disabled={saving}
            onClick={save}
          >
            <HiOutlineSave />
            {saving ? "ĐANG LƯU..." : "LƯU SẢN PHẨM"}
          </button>
        </div>
      </header>

      {error && (
        <div className="product-editor__error" role="alert">
          {error}
        </div>
      )}

      <fieldset className="product-editor__fieldset" disabled={saving}>
        <div className="product-editor__layout">
          <div className="product-editor__main">
            <FormCard title="Thông tin chung">
              <label className="product-editor__field">
                <span>
                  TÊN SẢN PHẨM <i>*</i>
                </span>
                <input
                  maxLength={255}
                  placeholder="Ví dụ: Bàn phím cơ Keychron Q1 Pro"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                />
              </label>

              <div className="product-editor__two-columns">
                <label className="product-editor__field">
                  <span>
                    MÃ SẢN PHẨM (SKU PARENT) <i>*</i>
                  </span>
                  <input
                    maxLength={50}
                    placeholder="SP-KEY-Q1P"
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value)}
                  />
                </label>

                <label className="product-editor__field">
                  <span>ĐƠN VỊ TÍNH</span>
                  <input readOnly value={isCombo ? "Bộ" : "Cái"} />
                </label>
              </div>
            </FormCard>

            <FormCard title="Hình ảnh sản phẩm">
              <div className="product-editor__uploader" aria-disabled={saving}>
                <ImageUploader
                  images={images}
                  onImagesChange={setImages}
                  folder="products"
                />
              </div>
            </FormCard>

            <FormCard title="Chi tiết sản phẩm">
              <label
                className="product-editor__label"
                htmlFor="product-description"
              >
                MÔ TẢ SẢN PHẨM
              </label>

              <div className="product-editor__richtext">
                <div className="product-editor__toolbar">
                  {[
                    ["bold", <b key="b">B</b>, "In đậm"],
                    ["italic", <i key="i">I</i>, "In nghiêng"],
                    ["underline", <u key="u">U</u>, "Gạch chân"],
                    ["insertUnorderedList", "≡", "Danh sách"],
                  ].map(([command, content, title]) => (
                    <button
                      key={command}
                      type="button"
                      title={title}
                      aria-label={title}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => descriptionCommand(command)}
                    >
                      {content}
                    </button>
                  ))}

                  <button
                    type="button"
                    title="Tiêu đề"
                    aria-label="Tiêu đề"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => descriptionCommand("formatBlock", "h3")}
                  >
                    H
                  </button>

                  <button
                    type="button"
                    title="Chèn bảng"
                    aria-label="Chèn bảng"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      descriptionCommand(
                        "insertHTML",
                        "<table><tbody><tr><td><br></td><td><br></td></tr>" +
                          "<tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>",
                      )
                    }
                  >
                    ▦
                  </button>
                </div>

                <div
                  id="product-description"
                  ref={descriptionRef}
                  className="product-editor__description"
                  contentEditable={!saving}
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Mô tả sản phẩm"
                  data-placeholder="Nhập mô tả chi tiết về sản phẩm..."
                />
              </div>

              <div className="product-editor__divider" />

              <div className="product-editor__section-heading">
                <strong>THÔNG SỐ KỸ THUẬT</strong>
                <small>Không dùng để sinh phiên bản</small>
              </div>

              <table className="product-editor__table product-editor__spec-table">
                <thead>
                  <tr>
                    <th>TÊN THÔNG SỐ</th>
                    <th>GIÁ TRỊ</th>
                    <th aria-label="Thao tác" />
                  </tr>
                </thead>

                <tbody>
                  {specs.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>{showValue(item.value)}</td>
                      <td>
                        <button
                          type="button"
                          className="product-editor__icon-button"
                          aria-label={`Xóa thông số ${item.name}`}
                          onClick={() =>
                            setSpecs((current) =>
                              current.filter((row) => row.key !== item.key),
                            )
                          }
                        >
                          <HiOutlineX />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!specs.length && (
                    <tr>
                      <td colSpan={3} className="product-editor__empty">
                        Chưa có thông số kỹ thuật.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="product-editor__spec-add">
                <input
                  ref={specNameRef}
                  aria-label="Tên thông số mới"
                  placeholder="Tên thông số kỹ thuật"
                  value={specDraft.name}
                  onChange={(event) => {
                    setSpecDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                    setSpecError("");
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      addSpec();
                    }
                  }}
                />

                <input
                  aria-label="Giá trị thông số mới"
                  placeholder="Giá trị"
                  value={specDraft.value}
                  onChange={(event) => {
                    setSpecDraft((current) => ({
                      ...current,
                      value: event.target.value,
                    }));
                    setSpecError("");
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      addSpec();
                    }
                  }}
                />

                <button
                  type="button"
                  className="product-editor__button product-editor__button--black"
                  onClick={addSpec}
                >
                  THÊM
                </button>
              </div>

              {specError && (
                <p className="product-editor__field-error" role="alert">
                  {specError}
                </p>
              )}
            </FormCard>

            {!isCombo ? (
              <>
                <FormCard title="Thuộc tính sản phẩm">
                  {isEditing ? (
                    <p className="product-editor__hint">
                      Nhấn “Thuộc tính” tại từng phiên bản để chỉnh tên và giá
                      trị.
                    </p>
                  ) : (
                    <>
                      <div className="product-editor__table-wrap">
                        <table className="product-editor__table product-editor__attribute-table">
                          <thead>
                            <tr>
                              <th>TÊN THUỘC TÍNH</th>
                              <th>GIÁ TRỊ</th>
                              <th aria-label="Thao tác" />
                            </tr>
                          </thead>

                          <tbody>
                            {attributeRows.map((row, index) => (
                              <tr key={row.key}>
                                <td>
                                  <input
                                    ref={(element) => {
                                      attributeRefs.current[row.key] = element;
                                    }}
                                    maxLength={100}
                                    aria-label={`Tên thuộc tính ${index + 1}`}
                                    placeholder="Ví dụ: Màu sắc"
                                    value={row.name}
                                    onChange={(event) =>
                                      updateAttribute(row.key, {
                                        name: event.target.value,
                                      })
                                    }
                                  />
                                </td>

                                <td>
                                  <div className="product-editor__tokens">
                                    {row.values.map((value) => (
                                      <span
                                        className="product-editor__token"
                                        key={comparisonKey(value)}
                                      >
                                        {value}
                                        <button
                                          type="button"
                                          aria-label={`Xóa giá trị ${value}`}
                                          onClick={() =>
                                            setAttributeRows((current) =>
                                              current.map((item) =>
                                                item.key === row.key
                                                  ? {
                                                      ...item,
                                                      values:
                                                        item.values.filter(
                                                          (entry) =>
                                                            comparisonKey(
                                                              entry,
                                                            ) !==
                                                            comparisonKey(
                                                              value,
                                                            ),
                                                        ),
                                                    }
                                                  : item,
                                              ),
                                            )
                                          }
                                        >
                                          <HiOutlineX />
                                        </button>
                                      </span>
                                    ))}

                                    <input
                                      aria-label={`Giá trị thuộc tính ${index + 1}`}
                                      placeholder="Nhập giá trị..."
                                      value={row.draft}
                                      onChange={(event) =>
                                        updateAttribute(row.key, {
                                          draft: event.target.value,
                                        })
                                      }
                                      onBlur={() =>
                                        commitAttributeValues(row.key)
                                      }
                                      onKeyDown={(event) => {
                                        if (event.nativeEvent.isComposing)
                                          return;

                                        if (
                                          ["Enter", ",", ";"].includes(
                                            event.key,
                                          )
                                        ) {
                                          event.preventDefault();
                                          commitAttributeValues(row.key);
                                        }
                                      }}
                                    />
                                  </div>
                                </td>

                                <td>
                                  <button
                                    type="button"
                                    className="product-editor__button product-editor__button--small"
                                    onClick={() =>
                                      setAttributeRows((current) =>
                                        current.filter(
                                          (item) => item.key !== row.key,
                                        ),
                                      )
                                    }
                                  >
                                    XÓA
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        className="product-editor__button"
                        disabled={attributeRows.length >= 100}
                        onClick={addAttributeRow}
                      >
                        <HiOutlinePlus /> THÊM THUỘC TÍNH KHÁC
                      </button>

                      <p className="product-editor__hint">
                        Nhấn Enter hoặc dấu phẩy để thêm giá trị. Thuộc tính
                        dùng để sinh phiên bản.
                      </p>
                    </>
                  )}
                </FormCard>

                <FormCard
                  title={`Chi tiết phiên bản (${variants.length} phiên bản)`}
                >
                  <div className="product-editor__generation">
                    <strong>{isEditing ? "PHIÊN BẢN" : "SẼ TẠO"}</strong>

                    {plan.groups.map((group) => (
                      <span key={group.key}>
                        {group.name} · {group.values.length} giá trị
                      </span>
                    ))}

                    <strong className="product-editor__red">
                      = {plan.count} PHIÊN BẢN
                    </strong>
                  </div>

                  <div className="product-editor__table-wrap">
                    <table className="product-editor__table product-editor__variant-table">
                      <thead>
                        <tr>
                          <th>TÊN PHIÊN BẢN</th>
                          <th>MÃ VẠCH / SKU</th>
                          <th>GIÁ BÁN LẺ (Đ)</th>
                          <th>GIÁ NHẬP (Đ)</th>
                          <th>KHỐI LƯỢNG (KG)</th>
                          <th>QUẢN LÝ SERIAL</th>
                          <th>BÁN</th>
                          <th aria-label="Thao tác" />
                        </tr>
                      </thead>

                      <tbody>
                        {variants.map((variant) => (
                          <Fragment key={variant.key}>
                            <tr>
                              <td>
                                <input
                                  aria-label="Tên phiên bản"
                                  maxLength={150}
                                  placeholder="Tên sản phẩm"
                                  value={variant.name}
                                  onChange={(event) =>
                                    updateVariant(variant.key, {
                                      name: event.target.value,
                                    })
                                  }
                                />

                                {variant.generated && (
                                  <small className="product-editor__variant-meta">
                                    {variant.attributes
                                      .map(
                                        (item) =>
                                          `${item.ten_thuoc_tinh}: ${item.gia_tri}`,
                                      )
                                      .join(" · ")}
                                  </small>
                                )}

                                {!variant.generated && (
                                  <button
                                    type="button"
                                    className="product-editor__text-button"
                                    aria-expanded={
                                      attributeEditor === variant.key
                                    }
                                    onClick={() =>
                                      setAttributeEditor((current) =>
                                        current === variant.key
                                          ? ""
                                          : variant.key,
                                      )
                                    }
                                  >
                                    THUỘC TÍNH ({variant.attributes.length})
                                  </button>
                                )}
                              </td>

                              <td>
                                <input
                                  aria-label={`Mã vạch ${variant.name}`}
                                  maxLength={50}
                                  placeholder="SKU"
                                  value={variant.sku}
                                  onChange={(event) =>
                                    updateVariant(variant.key, {
                                      sku: event.target.value,
                                    })
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  aria-label={`Giá bán ${variant.name}`}
                                  placeholder="0"
                                  value={variant.retail}
                                  onChange={(event) =>
                                    updateVariant(variant.key, {
                                      retail: event.target.value,
                                    })
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  aria-label={`Giá nhập ${variant.name}`}
                                  placeholder="0"
                                  value={variant.cost}
                                  onChange={(event) =>
                                    updateVariant(variant.key, {
                                      cost: event.target.value,
                                    })
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  aria-label={`Khối lượng ${variant.name}`}
                                  placeholder="0.00"
                                  value={variant.weight}
                                  onChange={(event) =>
                                    updateVariant(variant.key, {
                                      weight: event.target.value,
                                    })
                                  }
                                />
                              </td>

                              <td>
                                <select
                                  aria-label={`Quản lý serial ${variant.name}`}
                                  disabled={variant.serialModeLocked}
                                  title={
                                    variant.serialModeLocked
                                      ? "Chế độ serial đã bị khóa"
                                      : ""
                                  }
                                  value={variant.serialMode}
                                  onChange={(event) =>
                                    updateVariant(variant.key, {
                                      serialMode: event.target.value,
                                    })
                                  }
                                >
                                  <option value="">Chọn chế độ</option>
                                  <option value="true">Có serial</option>
                                  <option value="false">Không serial</option>
                                </select>
                              </td>

                              <td>
                                <input
                                  type="checkbox"
                                  aria-label={`Kinh doanh ${variant.name}`}
                                  checked={Number(variant.status) === 1}
                                  onChange={(event) =>
                                    updateVariant(variant.key, {
                                      status: event.target.checked ? 1 : 0,
                                    })
                                  }
                                />
                              </td>

                              <td>
                                {!variant.id &&
                                  !variant.generated &&
                                  variants.length > 1 && (
                                    <button
                                      type="button"
                                      className="product-editor__icon-button"
                                      aria-label={`Xóa phiên bản ${variant.name}`}
                                      onClick={() =>
                                        setManualRows((current) =>
                                          current.filter(
                                            (row) => row.key !== variant.key,
                                          ),
                                        )
                                      }
                                    >
                                      <HiOutlineX />
                                    </button>
                                  )}
                              </td>
                            </tr>

                            {!variant.generated &&
                              attributeEditor === variant.key && (
                                <tr>
                                  <td colSpan={8}>
                                    <VariantAttributes
                                      items={variant.attributes}
                                      change={(attributes) =>
                                        updateVariant(variant.key, {
                                          attributes,
                                        })
                                      }
                                    />
                                  </td>
                                </tr>
                              )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(isEditing || !plan.groups.length) && (
                    <button
                      type="button"
                      className="product-editor__button product-editor__add-variant"
                      disabled={variants.length >= MAX_VARIANTS}
                      onClick={() => {
                        const row = newManualVariant(
                          `Phiên bản ${manualRows.length + 1}`,
                        );
                        setManualRows((current) => [...current, row]);
                      }}
                    >
                      <HiOutlinePlus /> THÊM PHIÊN BẢN
                    </button>
                  )}
                </FormCard>
              </>
            ) : (
              <FormCard title="Sản phẩm thành phần">
                {configurationLocked && (
                  <p className="product-editor__hint">
                    Cấu hình đã được sử dụng. Thành phần và số lượng được giữ cố
                    định.
                  </p>
                )}

                <div className="product-editor__search">
                  <HiOutlineSearch aria-hidden="true" />

                  <input
                    aria-label="Tìm linh kiện combo"
                    placeholder="Tìm sản phẩm / phiên bản / mã vạch để thêm vào combo..."
                    disabled={configurationLocked}
                    value={comboSearch}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(event) => {
                      setComboSearch(event.target.value);
                      setSearchOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setSearchOpen(false);
                    }}
                  />

                  {searchOpen && !configurationLocked && (
                    <div className="product-editor__search-results">
                      {searchLoading ? (
                        <p>Đang tìm linh kiện...</p>
                      ) : searchError ? (
                        <p role="alert">{searchError}</p>
                      ) : (
                        <>
                          {searchResults.map((item) => {
                            const selected = parts.some(
                              (part) => part.id === Number(item.phien_ban_id),
                            );

                            return (
                              <button
                                type="button"
                                key={item.phien_ban_id}
                                disabled={selected}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => addPart(item)}
                              >
                                <span>
                                  <strong>{item.ten_san_pham}</strong>
                                  <small>
                                    {item.ten_phien_ban} ·{" "}
                                    {item.ma_vach || item.ma_san_pham}
                                  </small>
                                </span>

                                <span>
                                  {selected
                                    ? "ĐÃ CHỌN"
                                    : `Tồn: ${item.ton_co_the_ban ?? "—"}`}
                                </span>
                              </button>
                            );
                          })}

                          {!searchResults.length && (
                            <p>Không tìm thấy linh kiện phù hợp.</p>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        className="product-editor__close-search"
                        onClick={() => setSearchOpen(false)}
                      >
                        ĐÓNG
                      </button>
                    </div>
                  )}
                </div>

                {!parts.length ? (
                  <div className="product-editor__empty product-editor__combo-empty">
                    Chưa có sản phẩm thành phần — tìm kiếm và thêm ở trên.
                  </div>
                ) : (
                  <div className="product-editor__table-wrap">
                    <table className="product-editor__table product-editor__parts-table">
                      <thead>
                        <tr>
                          <th>SẢN PHẨM / PHIÊN BẢN</th>
                          <th>MÃ SẢN PHẨM</th>
                          <th>TỒN KHẢ BÁN</th>
                          <th>BẢO HÀNH</th>
                          <th>SỐ LƯỢNG / BỘ</th>
                          <th aria-label="Thao tác" />
                        </tr>
                      </thead>

                      <tbody>
                        {parts.map((part) => (
                          <tr key={part.id}>
                            <td>
                              <strong>{part.name}</strong>
                              <small className="product-editor__variant-meta">
                                {part.variant}
                              </small>
                            </td>
                            <td>{part.code}</td>
                            <td>{part.stock ?? "—"}</td>
                            <td>{warrantyText(part.warrantyMonths)}</td>
                            <td>
                              <div className="product-editor__stepper">
                                <button
                                  type="button"
                                  disabled={configurationLocked}
                                  aria-label={`Giảm số lượng ${part.name}`}
                                  onClick={() => stepQuantity(part, -1)}
                                >
                                  −
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  max={MAX_QUANTITY}
                                  step="1"
                                  disabled={configurationLocked}
                                  aria-label={`Số lượng ${part.name}`}
                                  value={part.qty}
                                  onChange={(event) =>
                                    updatePart(part.id, {
                                      qty: event.target.value,
                                    })
                                  }
                                />

                                <button
                                  type="button"
                                  disabled={configurationLocked}
                                  aria-label={`Tăng số lượng ${part.name}`}
                                  onClick={() => stepQuantity(part, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="product-editor__icon-button"
                                disabled={configurationLocked}
                                aria-label={`Xóa linh kiện ${part.name}`}
                                onClick={() =>
                                  setParts((current) =>
                                    current.filter(
                                      (item) => item.id !== part.id,
                                    ),
                                  )
                                }
                              >
                                <HiOutlineX />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <label className="product-editor__field product-editor__combo-price">
                  <span>
                    GIÁ BÁN COMBO (Đ) <i>*</i>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={comboPrice}
                    onChange={(event) => setComboPrice(event.target.value)}
                  />
                </label>
              </FormCard>
            )}
          </div>

          <aside className="product-editor__side">
            <FormCard title="Loại sản phẩm">
              {[
                [
                  "DON",
                  "Sản phẩm đơn / Có phiên bản",
                  "Quản lý biến thể màu, dung lượng...",
                ],
                [
                  "BO_PC",
                  "Sản phẩm theo bộ (Combo)",
                  "Tập hợp nhiều sản phẩm đơn",
                ],
              ].map(([value, title, hint]) => (
                <label
                  key={value}
                  className={`product-editor__type ${
                    form.type === value ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="product-kind"
                    value={value}
                    disabled={isEditing}
                    checked={form.type === value}
                    onChange={() => updateForm("type", value)}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{hint}</small>
                  </span>
                </label>
              ))}
            </FormCard>

            <FormCard title="Phân loại">
              <label className="product-editor__field">
                <span>
                  DANH MỤC <i>*</i>
                </span>
                <FilterDropdown
                  value={form.categoryId}
                  onChange={(event) =>
                    updateForm("categoryId", event.target.value)
                  }
                  selectedDark
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </FilterDropdown>
              </label>

              <label className="product-editor__field">
                <span>THƯƠNG HIỆU</span>
                <FilterDropdown
                  value={form.brandId}
                  onChange={(event) =>
                    updateForm("brandId", event.target.value)
                  }
                  selectedDark
                >
                  <option value="">Không chọn</option>
                  {brands.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </FilterDropdown>
              </label>
            </FormCard>

            <FormCard title="Trạng thái">
              {[
                [1, "Đang kinh doanh"],
                [0, "Ngừng kinh doanh"],
              ].map(([value, title]) => (
                <label
                  key={value}
                  className={`product-editor__status ${
                    form.status === value ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="product-status"
                    checked={form.status === value}
                    onChange={() => updateForm("status", value)}
                  />
                  <span
                    className={`product-editor__status-dot status-${value}`}
                  />
                  <strong>{title}</strong>
                </label>
              ))}
            </FormCard>

            <FormCard title="Thuế VAT">
              <div className="product-editor__vat">
                {[...new Set(["0", "5", "10", form.vat])].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={form.vat === value ? "is-selected" : ""}
                    aria-pressed={form.vat === value}
                    onClick={() => updateForm("vat", value)}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </FormCard>

            <FormCard title="Chính sách bảo hành">
              {isCombo ? (
                <>
                  <strong>Bảo hành theo từng linh kiện.</strong>
                  <p className="product-editor__hint">
                    Thời hạn được hiển thị tại từng linh kiện trong bảng thành
                    phần.
                  </p>
                </>
              ) : (
                <label className="product-editor__field">
                  <span>
                    THỜI HẠN BẢO HÀNH (THÁNG) <i>*</i>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={MAX_QUANTITY}
                    step="1"
                    placeholder="Nhập số tháng"
                    value={form.warrantyMonths}
                    onChange={(event) =>
                      updateForm("warrantyMonths", event.target.value)
                    }
                  />
                  <small>Nhập 0 nếu không bảo hành.</small>
                </label>
              )}
            </FormCard>

            {!isCombo && (
              <FormCard title="Tóm tắt phiên bản">
                <div className="product-editor__summary">
                  <span>Số phiên bản</span>
                  <strong>{variants.length}</strong>
                </div>

                {!isEditing && (
                  <>
                    <div className="product-editor__summary">
                      <span>Tồn khởi tạo</span>
                      <strong className="product-editor__red">0</strong>
                    </div>
                    <p className="product-editor__hint">
                      Nhập hàng sau khi tạo sản phẩm.
                    </p>
                  </>
                )}
              </FormCard>
            )}
          </aside>
        </div>
      </fieldset>
    </main>
  );
}
