// Admin category list/detail/forms backed by the IntelliJ catalog API.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineUpload,
  HiOutlineX,
} from 'react-icons/hi';

import DetailTablePagination from '../../../../../shared/components/ui/DetailTablePagination';
import FilterDropdown from '../../../../../shared/components/ui/FilterDropdown';
import ImageUploader from '../../../../../shared/components/ui/ImageUploader';
import useDetailTablePagination from '../../../../../hooks/useDetailTablePagination';

import {
  createCategory,
  deactivateCategory,
  getAllCategories,
  getCategoryDetail,
  reactivateCategory,
  updateCategory,
} from '../api/categoryApi';

import './DanhMucSanPham.css';

const ROOT_FILTER = 'root';

const DEFAULT_FORM = {
  name: '',
  parentId: '',
  image: '',
  status: 'active',
};

const STATUS_OPTIONS = [
  'TẤT CẢ TRẠNG THÁI',
  'HOẠT ĐỘNG',
  'NGỪNG HOẠT ĐỘNG',
];

const STATUS_VALUES = {
  'TẤT CẢ TRẠNG THÁI': 'all',
  'HOẠT ĐỘNG': 'active',
  'NGỪNG HOẠT ĐỘNG': 'inactive',
};

const ROOT_OPTION = 'KHÔNG CÓ — DANH MỤC GỐC';
const PARENT_ALL_OPTION = 'TẤT CẢ DANH MỤC CHA';
const PARENT_ROOT_OPTION = 'DANH MỤC GỐC';

// ========================================
// Category Helpers
// ========================================

const errorMessage = (error) =>
  error?.message ||
  'Không thể kết nối tới backend. Vui lòng thử lại.';

function isDescendant(targetParentId, categoryId, categories) {
  if (!targetParentId || !categoryId) return false;

  let currentId = Number(targetParentId);
  const targetId = Number(categoryId);

  const visited = new Set();

  while (currentId != null) {
    if (currentId === targetId) return true;

    if (visited.has(currentId)) break;

    visited.add(currentId);

    const parentCategory = categories.find(
      (item) => item.id === currentId
    );

    currentId =
      parentCategory?.parentId != null
        ? Number(parentCategory.parentId)
        : null;
  }

  return false;
}

function getDepth(category, categoriesById) {
  let depth = 0;
  let parentId = category?.parentId;

  const visited = new Set([Number(category?.id)]);

  while (
    parentId != null &&
    !visited.has(Number(parentId))
  ) {
    const id = Number(parentId);

    visited.add(id);

    const parent = categoriesById.get(id);

    if (!parent) break;

    depth += 1;
    parentId = parent.parentId;
  }

  return depth;
}

function buildNestedOptions(roots, childrenMap, exclude) {
  const result = [];

  const visit = (
    nodes,
    depth = 0,
    seen = new Set()
  ) => {
    for (const item of nodes) {
      if (
        seen.has(item.id) ||
        (exclude && exclude(item))
      ) {
        continue;
      }

      const nextSeen = new Set(seen);
      nextSeen.add(item.id);

      result.push({
        id: String(item.id),
        text: `${'— '.repeat(depth)}${item.name}`,
        depth,
      });

      visit(
        childrenMap.get(item.id) || [],
        depth + 1,
        nextSeen
      );
    }
  };

  visit(roots);

  return result;
}

// ========================================
// Common Components
// ========================================

function StatusBadge({ status }) {
  return (
    <span
      className={`category-status category-status--${status}`}
    >
      {status === 'active'
        ? 'HOẠT ĐỘNG'
        : 'NGỪNG HOẠT ĐỘNG'}
    </span>
  );
}

function StructureBadge({ isRoot, depth = 0 }) {
  return (
    <span
      className={`category-structure ${
        isRoot ? 'category-structure--root' : ''
      }`}
    >
      {isRoot
        ? 'GỐC'
        : depth > 1
          ? `CON CẤP ${depth}`
          : 'CON'}
    </span>
  );
}

function ImageWithFallback({
  src,
  alt,
  fallback = 'DM',
}) {
  const [failed, setFailed] = useState(false);

  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  ) : (
    <span>{fallback}</span>
  );
}

function CategoryImage({
  category,
  large = false,
}) {
  const src =
    category?.image ||
    category?.anhDaiDien ||
    category?.anh_dai_dien ||
    '';

  return (
    <div
      className={`category-image ${
        large ? 'category-image--large' : ''
      }`}
    >
      <ImageWithFallback
        key={src}
        src={src}
        alt={`Ảnh đại diện ${category?.name || ''}`}
      />
    </div>
  );
}

function SectionHeader({ children, meta }) {
  return (
    <div className="category-section-header">
      <span>{children}</span>
      {meta && <span>{meta}</span>}
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="category-network-state"
      role="status"
    >
      <span className="category-spinner" />

      Đang tải dữ liệu danh mục...
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div
      className="category-network-state category-network-state--error"
      role="alert"
    >
      <strong>Không thể tải dữ liệu</strong>

      <span>{message}</span>

      <button
        type="button"
        onClick={onRetry}
      >
        THỬ LẠI
      </button>
    </div>
  );
}

// ========================================
// Category Form Modal
// ========================================

function CategoryFormModal({
  category,
  categories,
  productCount = 0,
  saving,
  serverError,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() =>
    category
      ? {
          name: category.name,
          parentId:
            category.parentId == null
              ? ''
              : String(category.parentId),
          image: category.image || '',
          status: category.status,
        }
      : { ...DEFAULT_FORM }
  );

  const [imageMode, setImageMode] = useState('upload');

  const [images, setImages] = useState(() =>
    category?.image
      ? [{ id: 'current', url: category.image }]
      : []
  );

  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: '',
    }));
  };

  // ========================================
  // Image Upload
  // ========================================

  const handleImagesChange = (next) => {
    const list = Array.isArray(next)
      ? next
      : typeof next === 'function'
        ? next(images)
        : [];

    const latest = list.slice(-1);

    setImages(latest);

    if (
      latest[0]?.url &&
      !latest[0]?.uploading &&
      !latest[0]?.error
    ) {
      update('image', latest[0].url);
    } else if (!latest[0]) {
      update('image', '');
    }
  };

  // ========================================
  // Selectable Parent Categories
  // ========================================

  const selectableParents = useMemo(() => {
    const childrenMap = new Map();

    const ids = new Set(
      categories.map((item) => item.id)
    );

    categories.forEach((item) => {
      if (item.parentId == null) return;

      if (!childrenMap.has(item.parentId)) {
        childrenMap.set(item.parentId, []);
      }

      childrenMap.get(item.parentId).push(item);
    });

    const roots = categories.filter(
      (item) =>
        item.parentId == null ||
        !ids.has(item.parentId)
    );

    return buildNestedOptions(
      roots,
      childrenMap,
      (item) =>
        category &&
        isDescendant(
          item.id,
          category.id,
          categories
        )
    );
  }, [categories, category]);

  const parentValue =
    selectableParents.find(
      (item) => item.id === form.parentId
    )?.text || ROOT_OPTION;

  const parentOptions = [
    ROOT_OPTION,
    ...selectableParents.map((item) => item.text),
  ];

  // ========================================
  // Submit & Validation
  // ========================================

  const submit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    const name = form.name.trim();

    if (!name) {
      nextErrors.name = 'Vui lòng nhập tên danh mục.';
    } else if (name.length < 2) {
      nextErrors.name =
        'Tên danh mục phải có ít nhất 2 ký tự.';
    } else if (
      categories.some(
        (item) =>
          item.id !== category?.id &&
          item.name.toLocaleLowerCase('vi') ===
            name.toLocaleLowerCase('vi')
      )
    ) {
      nextErrors.name = 'Tên danh mục đã tồn tại.';
    }

    // Kiểm tra danh mục cha
    const parent = form.parentId
      ? categories.find(
          (item) =>
            item.id === Number(form.parentId)
        )
      : null;

    if (form.parentId && !parent) {
      nextErrors.parentId =
        'Danh mục cha không tồn tại.';
    } else if (
      category &&
      parent &&
      isDescendant(
        parent.id,
        category.id,
        categories
      )
    ) {
      nextErrors.parentId =
        'Không thể chọn chính danh mục hoặc danh mục con của nó làm danh mục cha.';
    }

    // Không ngừng hoạt động khi còn dữ liệu liên quan
    const hasChildren = Boolean(
      category &&
        categories.some(
          (item) => item.parentId === category.id
        )
    );

    if (
      category?.status === 'active' &&
      form.status === 'inactive' &&
      (hasChildren || productCount > 0)
    ) {
      nextErrors.status =
        'Không thể ngừng hoạt động khi danh mục còn sản phẩm hoặc danh mục con trực thuộc.';
    }

    // Kiểm tra ảnh
    const activeImage =
      imageMode === 'upload'
        ? images[0]?.url || ''
        : form.image.trim();

    if (
      imageMode === 'upload' &&
      images[0]?.uploading
    ) {
      nextErrors.image =
        'Ảnh đang được tải lên. Vui lòng chờ hoàn tất.';
    } else if (
      imageMode === 'upload' &&
      images[0]?.error
    ) {
      nextErrors.image = images[0].error;
    } else if (activeImage) {
      try {
        const parsed = new URL(activeImage);

        if (
          !['http:', 'https:'].includes(
            parsed.protocol
          )
        ) {
          throw new Error('invalid');
        }
      } catch {
        nextErrors.image =
          'URL ảnh phải bắt đầu bằng http:// hoặc https://.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      name,
      parentId: parent?.id ?? null,
      image: activeImage,
      status: form.status,
    });
  };

  // ========================================
  // Modal JSX
  // ========================================

  return (
    <div
      className="category-modal-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        !saving &&
        event.target === event.currentTarget &&
        onClose()
      }
    >
      <section
        className="category-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
      >
        <header className="category-modal__header">
          <h2 id="category-form-title">
            {category
              ? 'SỬA DANH MỤC'
              : 'THÊM DANH MỤC'}
          </h2>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Đóng"
          >
            <HiOutlineX size={24} />
          </button>
        </header>

        <form
          onSubmit={submit}
          noValidate
        >
          <div className="category-modal__body">
            {serverError && (
              <div
                className="category-inline-error"
                role="alert"
              >
                {serverError}
              </div>
            )}

            {/* Tên danh mục */}
            <label className="category-field">
              <span>
                TÊN DANH MỤC <b>*</b>
              </span>

              <input
                value={form.name}
                onChange={(event) =>
                  update(
                    'name',
                    event.target.value
                  )
                }
                placeholder="Ví dụ: Laptop Gaming"
                autoFocus
              />

              {errors.name && (
                <small>{errors.name}</small>
              )}
            </label>

            {/* Danh mục cha */}
            <div className="category-field">
              <span>DANH MỤC CHA</span>

              <FilterDropdown
                options={parentOptions}
                value={parentValue}
                defaultValue={ROOT_OPTION}
                selectedDark
                onSelect={(text) =>
                  update(
                    'parentId',
                    selectableParents.find(
                      (item) => item.text === text
                    )?.id || ''
                  )
                }
              />

              {errors.parentId && (
                <small>{errors.parentId}</small>
              )}
            </div>

            {/* Ảnh đại diện */}
            <fieldset className="category-image-field">
              <legend>ẢNH ĐẠI DIỆN</legend>

              <div className="category-mode-tabs">
                <button
                  type="button"
                  className={
                    imageMode === 'upload'
                      ? 'is-active'
                      : ''
                  }
                  onClick={() => {
                    setImageMode('upload');

                    setErrors((current) => ({
                      ...current,
                      image: '',
                    }));

                    const src = form.image.trim();

                    if (
                      src &&
                      (!images.length ||
                        images[0]?.url !== src)
                    ) {
                      setImages([
                        {
                          id: 'current',
                          url: src,
                        },
                      ]);
                    }
                  }}
                >
                  <HiOutlineUpload /> TẢI ẢNH LÊN
                </button>

                <button
                  type="button"
                  className={
                    imageMode === 'url'
                      ? 'is-active'
                      : ''
                  }
                  onClick={() => {
                    setImageMode('url');

                    setErrors((current) => ({
                      ...current,
                      image: '',
                    }));

                    if (
                      images[0]?.url &&
                      !images[0]?.uploading &&
                      !images[0]?.error
                    ) {
                      update(
                        'image',
                        images[0].url
                      );
                    }
                  }}
                >
                  NHẬP URL
                </button>
              </div>

              {imageMode === 'upload' ? (
                <ImageUploader
                  images={images}
                  onImagesChange={
                    handleImagesChange
                  }
                  maxSizeMB={5}
                  folder="categories"
                  multiple={false}
                />
              ) : (
                <>
                  <input
                    className="category-url-input"
                    value={form.image}
                    onChange={(event) =>
                      update(
                        'image',
                        event.target.value
                      )
                    }
                    placeholder="URL ảnh đại diện (tùy chọn)"
                  />

                  {form.image.trim() && (
                    <div className="category-image-preview">
                      <ImageWithFallback
                        key={form.image.trim()}
                        src={form.image.trim()}
                        alt="Xem trước ảnh"
                        fallback="Ảnh không hợp lệ"
                      />
                    </div>
                  )}
                </>
              )}

              {errors.image && (
                <small className="category-field-error">
                  {errors.image}
                </small>
              )}
            </fieldset>

            {/* Trạng thái */}
            <fieldset className="category-status-field">
              <legend>TRẠNG THÁI</legend>

              <div>
                <button
                  type="button"
                  className={
                    form.status === 'active'
                      ? 'is-active'
                      : ''
                  }
                  onClick={() =>
                    update('status', 'active')
                  }
                >
                  HOẠT ĐỘNG
                </button>

                <button
                  type="button"
                  className={
                    form.status === 'inactive'
                      ? 'is-active'
                      : ''
                  }
                  onClick={() =>
                    update('status', 'inactive')
                  }
                >
                  NGỪNG HOẠT ĐỘNG
                </button>
              </div>

              {errors.status && (
                <small className="category-field-error">
                  {errors.status}
                </small>
              )}
            </fieldset>
          </div>

          <footer className="category-modal__footer">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
            >
              HỦY
            </button>

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'ĐANG LƯU...'
                : category
                  ? 'LƯU THAY ĐỔI'
                  : 'THÊM DANH MỤC'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

// ========================================
// Deactivate Modal
// ========================================

function DeactivateModal({
  category,
  categories,
  productCount,
  saving,
  serverError,
  onClose,
  onConfirm,
}) {
  const parent = categories.find(
    (item) => item.id === category.parentId
  );

  const children = categories.filter(
    (item) => item.parentId === category.id
  );

  const blocked =
    children.length > 0 ||
    productCount > 0;

  return (
    <div
      className="category-modal-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        !saving &&
        event.target === event.currentTarget &&
        onClose()
      }
    >
      <section
        className="category-modal category-modal--confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-deactivate-title"
      >
        <header className="category-modal__header">
          <h2 id="category-deactivate-title">
            NGỪNG HOẠT ĐỘNG DANH MỤC?
          </h2>
        </header>

        <div className="category-modal__body">
          {serverError && (
            <div
              className="category-inline-error"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <dl className="category-confirm-info">
            <dt>TÊN DANH MỤC</dt>
            <dd>{category.name}</dd>

            <dt>DANH MỤC CHA</dt>
            <dd>
              {parent?.name || 'DANH MỤC GỐC'}
            </dd>

            <dt>SỐ SẢN PHẨM</dt>
            <dd>{productCount} SP</dd>

            <dt>TRẠNG THÁI HIỆN TẠI</dt>
            <dd>HOẠT ĐỘNG</dd>
          </dl>

          <div className="category-warning">
            Danh mục ngừng hoạt động sẽ không còn hiển thị
            trong điều hướng khách hàng.
          </div>

          {blocked && (
            <div
              className="category-blocked"
              role="alert"
            >
              <strong>
                KHÔNG THỂ NGỪNG HOẠT ĐỘNG DANH MỤC
              </strong>

              <p>
                Backend không cho phép ngừng danh mục
                đang có sản phẩm hoặc bất kỳ danh mục
                con trực thuộc nào.
              </p>

              <p>
                Vui lòng chuyển dữ liệu liên quan
                trước khi tiếp tục.
              </p>
            </div>
          )}
        </div>

        <footer className="category-modal__footer">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
          >
            HỦY
          </button>

          <button
            type="button"
            className="category-danger-button"
            disabled={blocked || saving}
            onClick={onConfirm}
          >
            {saving
              ? 'ĐANG XỬ LÝ...'
              : 'XÁC NHẬN NGỪNG HOẠT ĐỘNG'}
          </button>
        </footer>
      </section>
    </div>
  );
}

// ========================================
// Data Hook
// ========================================

function useCategoryData() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setCategories(await getAllCategories());
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    reload();
  }, [reload]);

  return {
    categories,
    loading,
    error,
    reload,
  };
}

// ========================================
// Category Modals
// ========================================

function CategoryModals({
  modal,
  setModal,
  categories,
  reload,
}) {
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!modal) return null;

  const runMutation = async (mutation) => {
    setSaving(true);
    setServerError('');

    try {
      await mutation();
      await reload();
      setModal(null);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (modal.type === 'form') {
    const editing = categories.find(
      (item) => item.id === modal.id
    );

    return (
      <CategoryFormModal
        category={editing}
        categories={categories}
        productCount={
          editing?.productCount || 0
        }
        saving={saving}
        serverError={serverError}
        onClose={() => setModal(null)}
        onSave={(payload) =>
          runMutation(() =>
            editing
              ? updateCategory(
                  editing.id,
                  payload
                )
              : createCategory(payload)
          )
        }
      />
    );
  }

  const category = categories.find(
    (item) => item.id === modal.id
  );

  if (!category) return null;

  return (
    <DeactivateModal
      category={category}
      categories={categories}
      productCount={
        category.productCount || 0
      }
      saving={saving}
      serverError={serverError}
      onClose={() => setModal(null)}
      onConfirm={() =>
        runMutation(() =>
          deactivateCategory(category.id)
        )
      }
    />
  );
}

// ========================================
// Category List
// ========================================

export default function DanhMucSanPham() {
  const navigate = useNavigate();

  const {
    categories,
    loading,
    error,
    reload,
  } = useCategoryData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  // ========================================
  // Category Tree
  // ========================================

  const childrenMap = useMemo(() => {
    const map = new Map();

    categories.forEach((category) => {
      const parentId = category.parentId;

      if (parentId != null) {
        if (!map.has(parentId)) {
          map.set(parentId, []);
        }

        map.get(parentId).push(category);
      }
    });

    return map;
  }, [categories]);

  const roots = useMemo(() => {
    const allIds = new Set(
      categories.map((category) => category.id)
    );

    return categories.filter(
      (category) =>
        category.parentId == null ||
        !allIds.has(category.parentId)
    );
  }, [categories]);

  const parentFilterOptions = useMemo(
    () =>
      buildNestedOptions(
        roots,
        childrenMap
      ),
    [childrenMap, roots]
  );

  const defaultExpanded = useMemo(() => {
    return new Set(
      categories
        .filter(
          (category) =>
            (childrenMap.get(category.id)?.length || 0) > 0
        )
        .map((category) => category.id)
    );
  }, [categories, childrenMap]);

  const visibleExpanded = useMemo(
    () => expanded || defaultExpanded,
    [expanded, defaultExpanded]
  );

  // ========================================
  // Filters
  // ========================================

  const clearVisible =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    parentFilter !== 'all';

  const rows = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase('vi');

    const isFiltering =
      Boolean(query) ||
      statusFilter !== 'all';

    const byId = new Map(
      categories.map((item) => [
        item.id,
        item,
      ])
    );

    const matches = (item) =>
      (
        statusFilter === 'all' ||
        item.status === statusFilter
      ) &&
      (
        !query ||
        item.name
          .toLocaleLowerCase('vi')
          .includes(query) ||
        `/${item.slug || ''}`
          .toLocaleLowerCase('vi')
          .includes(query) ||
        String(item.id).includes(query)
      );

    const makeRow = (
      item,
      depth,
      autoExpanded = false
    ) => ({
      ...item,
      depth,
      hasChildren:
        (childrenMap.get(item.id)?.length || 0) > 0,
      autoExpanded,
    });

    if (parentFilter !== 'all') {
      if (parentFilter === ROOT_FILTER) {
        return roots
          .filter(matches)
          .map((item) =>
            makeRow(item, 0)
          );
      }

      return categories
        .filter(
          (item) =>
            item.parentId ===
              Number(parentFilter) &&
            matches(item)
        )
        .map((item) =>
          makeRow(
            item,
            getDepth(item, byId)
          )
        );
    }

    const descendantMatches = (
      id,
      visited = new Set()
    ) => {
      if (visited.has(id)) return false;

      const seen = new Set(visited);
      seen.add(id);

      return (
        childrenMap.get(id) || []
      ).some(
        (child) =>
          matches(child) ||
          descendantMatches(
            child.id,
            seen
          )
      );
    };

    const result = [];

    const visit = (
      nodes,
      depth = 0,
      visited = new Set()
    ) => {
      for (const item of nodes) {
        if (visited.has(item.id)) continue;

        const seen = new Set(visited);
        seen.add(item.id);

        const hasMatchBelow =
          isFiltering &&
          descendantMatches(item.id);

        if (
          isFiltering &&
          !matches(item) &&
          !hasMatchBelow
        ) {
          continue;
        }

        const autoExpanded =
          expanded === null &&
          hasMatchBelow;

        result.push(
          makeRow(
            item,
            depth,
            autoExpanded
          )
        );

        if (
          visibleExpanded.has(item.id) ||
          autoExpanded
        ) {
          visit(
            childrenMap.get(item.id) || [],
            depth + 1,
            seen
          );
        }
      }
    };

    visit(roots);

    return result;
  }, [
    categories,
    childrenMap,
    expanded,
    parentFilter,
    roots,
    search,
    statusFilter,
    visibleExpanded,
  ]);

  const stats = {
    total: categories.length,
    roots: roots.length,
    children: categories.length - roots.length,
    inactive: categories.filter(
      (item) =>
        item.status === 'inactive'
    ).length,
  };

  // ========================================
  // Actions
  // ========================================

  const restore = async (category) => {
    setRestoringId(category.id);
    setActionError('');

    try {
      await reactivateCategory(category);
      await reload();
    } catch (requestError) {
      setActionError(
        errorMessage(requestError)
      );
    } finally {
      setRestoringId(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setParentFilter('all');
  };

  const toggleExpanded = (id) => {
    setExpanded((current) => {
      const next = new Set(
        current || visibleExpanded
      );

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  // ========================================
  // List JSX
  // ========================================

  return (
    <main className="category-page admin-list-page">
      <div className="category-heading">
        <div>
          <h1>DANH MỤC SẢN PHẨM</h1>

          <p>
            Quản lý cấu trúc phân cấp danh mục và
            sản phẩm thuộc danh mục
          </p>
        </div>

        <button
          type="button"
          className="category-primary-button"
          disabled={
            loading ||
            Boolean(error)
          }
          onClick={() =>
            setModal({
              type: 'form',
            })
          }
        >
          + THÊM DANH MỤC
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : (
        <>
          {actionError && (
            <div
              className="category-inline-error category-page-error"
              role="alert"
            >
              {actionError}

              <button
                type="button"
                onClick={() =>
                  setActionError('')
                }
              >
                ×
              </button>
            </div>
          )}

          {/* Thống kê */}
          <section
            className="category-stats"
            aria-label="Thống kê danh mục"
          >
            <div>
              <strong>{stats.total}</strong>
              <span>TỔNG DANH MỤC</span>
            </div>

            <div>
              <strong>{stats.roots}</strong>
              <span>DANH MỤC GỐC</span>
            </div>

            <div>
              <strong>{stats.children}</strong>
              <span>DANH MỤC CON</span>
            </div>

            <div>
              <strong className="is-red">
                {stats.inactive}
              </strong>
              <span>NGỪNG HOẠT ĐỘNG</span>
            </div>
          </section>

          {/* Bộ lọc */}
          <div className="category-toolbar">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Tìm tên danh mục / đường dẫn..."
              aria-label="Tìm danh mục"
            />

            <FilterDropdown
              options={STATUS_OPTIONS}
              value={
                STATUS_OPTIONS.find(
                  (label) =>
                    STATUS_VALUES[label] ===
                    statusFilter
                ) || STATUS_OPTIONS[0]
              }
              defaultValue={
                STATUS_OPTIONS[0]
              }
              selectedDark
              onSelect={(label) =>
                setStatusFilter(
                  STATUS_VALUES[label] || 'all'
                )
              }
            />

            <FilterDropdown
              options={[
                PARENT_ALL_OPTION,
                PARENT_ROOT_OPTION,
                ...parentFilterOptions.map(
                  (item) => item.text
                ),
              ]}
              value={
                parentFilter === 'all'
                  ? PARENT_ALL_OPTION
                  : parentFilter === ROOT_FILTER
                    ? PARENT_ROOT_OPTION
                    : parentFilterOptions.find(
                        (item) =>
                          item.id === parentFilter
                      )?.text || PARENT_ALL_OPTION
              }
              defaultValue={
                PARENT_ALL_OPTION
              }
              selectedDark
              onSelect={(label) => {
                if (
                  label ===
                  PARENT_ALL_OPTION
                ) {
                  setParentFilter('all');
                } else if (
                  label ===
                  PARENT_ROOT_OPTION
                ) {
                  setParentFilter(ROOT_FILTER);
                } else {
                  setParentFilter(
                    parentFilterOptions.find(
                      (item) =>
                        item.text === label
                    )?.id || 'all'
                  );
                }
              }}
            />

            {clearVisible && (
              <button
                type="button"
                className="category-clear-button"
                onClick={clearFilters}
              >
                XÓA BỘ LỌC
              </button>
            )}
          </div>

          {/* Bảng danh mục */}
          <div className="category-table-wrap admin-table-scroll" tabIndex={0} role="region" aria-label="Bảng danh sách">
            <table className="category-table admin-data-table">
              <thead>
                <tr>
                  <th>MÃ</th>
                  <th>DANH MỤC</th>
                  <th>CẤU TRÚC</th>
                  <th>SẢN PHẨM</th>
                  <th>ĐƯỜNG DẪN</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((item) => {
                  const isRoot =
                    item.depth === 0;

                  const parent = categories.find(
                    (candidate) =>
                      candidate.id ===
                      item.parentId
                  );

                  const isExpanded =
                    visibleExpanded.has(item.id) ||
                    item.autoExpanded;

                  return (
                    <tr
                      key={item.id}
                      className={`${
                        isRoot
                          ? 'category-root-row'
                          : ''
                      } ${
                        item.hasChildren
                          ? 'category-has-children'
                          : ''
                      }`}
                      onClick={(event) => {
                        if (
                          !item.hasChildren ||
                          event.target.closest?.(
                            '.category-actions'
                          )
                        ) {
                          return;
                        }

                        toggleExpanded(item.id);
                      }}
                    >
                      <td>#{item.id}</td>

                      <td>
                        <div
                          className={`category-name-cell ${
                            isRoot
                              ? ''
                              : 'category-name-cell--child'
                          }`}
                          style={{
                            paddingLeft: `${
                              item.depth * 24
                            }px`,
                          }}
                        >
                          <span className="category-name-cell__indent-wrapper">
                            {item.hasChildren ? (
                              <button
                                type="button"
                                className="category-toggle-expand"
                                aria-label={
                                  isExpanded
                                    ? 'Thu gọn'
                                    : 'Mở rộng'
                                }
                                aria-expanded={
                                  isExpanded
                                }
                                onClick={(event) => {
                                  event.stopPropagation();

                                  toggleExpanded(
                                    item.id
                                  );
                                }}
                              >
                                {isExpanded ? (
                                  <HiOutlineChevronDown />
                                ) : (
                                  <HiOutlineChevronRight />
                                )}
                              </button>
                            ) : (
                              !isRoot && (
                                <span className="category-tree-indent">
                                  ↳
                                </span>
                              )
                            )}
                          </span>

                          <CategoryImage
                            category={item}
                          />

                          <span className="category-name-copy">
                            <strong>
                              {item.name}
                            </strong>

                            {!isRoot && (
                              <small>
                                Trực thuộc:{' '}
                                {parent?.name ||
                                  item.parentName ||
                                  'GỐC'}
                              </small>
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <StructureBadge
                          isRoot={isRoot}
                          depth={item.depth}
                        />
                      </td>

                      <td>
                        <strong>
                          {item.productCount}
                        </strong>

                        <small>sản phẩm</small>
                      </td>

                      <td>
                        <code>
                          /{item.slug}
                        </code>
                      </td>

                      <td>
                        <StatusBadge
                          status={item.status}
                        />
                      </td>

                      <td>
                        <div className="category-actions">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/admin/danh-muc/danh-muc-san-pham/${item.id}`
                              )
                            }
                          >
                            CHI TIẾT
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                type: 'form',
                                id: item.id,
                              })
                            }
                          >
                            SỬA
                          </button>

                          {item.status === 'active' ? (
                            <button
                              type="button"
                              className="is-danger"
                              onClick={() =>
                                setModal({
                                  type: 'deactivate',
                                  id: item.id,
                                })
                              }
                            >
                              NGỪNG
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="is-success"
                              disabled={
                                restoringId ===
                                item.id
                              }
                              onClick={() =>
                                restore(item)
                              }
                            >
                              {restoringId === item.id
                                ? 'ĐANG KHÔI PHỤC...'
                                : 'KHÔI PHỤC'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td
                      colSpan="7"
                      className="category-empty"
                    >
                      {categories.length
                        ? 'Không tìm thấy danh mục phù hợp.'
                        : 'Chưa có danh mục nào.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <CategoryModals
            key={`${
              modal?.type || 'none'
            }-${
              modal?.id || 'new'
            }`}
            modal={modal}
            setModal={setModal}
            categories={categories}
            reload={reload}
          />
        </>
      )}
    </main>
  );
}

// ========================================
// Category Detail
// ========================================

export function ChiTietDanhMuc() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const {
    categories,
    loading: listLoading,
    error: listError,
    reload,
  } = useCategoryData();

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState('');
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [restoring, setRestoring] = useState(false);

  const loadDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError('');

    try {
      setDetail(
        await getCategoryDetail(categoryId)
      );
    } catch (error) {
      setDetailError(
        errorMessage(error)
      );
    } finally {
      setDetailLoading(false);
    }
  }, [categoryId]);

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const retry = () => {
    reload();
    loadDetail();
  };

  const childCategories = categories.filter(
    (item) =>
      item.parentId === Number(categoryId)
  );

  const childPagination =
    useDetailTablePagination(
      childCategories
    );

  const productPagination =
    useDetailTablePagination(
      detail?.products
    );

  if (listLoading || detailLoading) {
    return (
      <main className="category-page">
        <LoadingState />
      </main>
    );
  }

  if (listError || detailError) {
    return (
      <main className="category-page">
        <ErrorState
          message={
            listError || detailError
          }
          onRetry={retry}
        />
      </main>
    );
  }

  const listCategory = categories.find(
    (item) =>
      item.id === Number(categoryId)
  );

  if (!detail || !listCategory) {
    return (
      <main className="category-page">
        <div className="category-not-found">
          <h1>
            KHÔNG TÌM THẤY DANH MỤC
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/admin/danh-muc/danh-muc-san-pham'
              )
            }
          >
            QUAY LẠI DANH SÁCH
          </button>
        </div>
      </main>
    );
  }

  const category = {
    ...listCategory,
    ...detail,
    productCount: detail.products.length,
  };

  const parent = categories.find(
    (item) =>
      item.id === category.parentId
  );

  const children = childCategories;
  const products = detail.products;

  const categoriesById = new Map(
    categories.map((item) => [
      item.id,
      item,
    ])
  );

  const depth = getDepth(
    category,
    categoriesById
  );

  const restore = async () => {
    setRestoring(true);
    setActionError('');

    try {
      await reactivateCategory(category);

      await Promise.all([
        reload(),
        loadDetail(),
      ]);
    } catch (error) {
      setActionError(
        errorMessage(error)
      );
    } finally {
      setRestoring(false);
    }
  };

  const reloadAll = async () => {
    await Promise.all([
      reload(),
      loadDetail(),
    ]);
  };

  return (
    <main className="category-page category-detail-page">
      <button
        type="button"
        className="category-back"
        onClick={() =>
          navigate(
            '/admin/danh-muc/danh-muc-san-pham'
          )
        }
      >
        ← QUAY LẠI DANH SÁCH
      </button>

      {actionError && (
        <div
          className="category-inline-error category-page-error"
          role="alert"
        >
          {actionError}

          <button
            type="button"
            onClick={() =>
              setActionError('')
            }
          >
            ×
          </button>
        </div>
      )}

      {/* Header chi tiết */}
      <section className="category-detail-hero">
        <div className="category-detail-identity">
          <CategoryImage
            category={category}
            large
          />

          <div>
            <h1>{category.name}</h1>

            <p>
              <StructureBadge
                isRoot={
                  category.parentId == null
                }
                depth={depth}
              />

              {' '}

              <code>
                /{category.slug}
              </code>
            </p>
          </div>
        </div>

        <div className="category-detail-actions">
          <StatusBadge
            status={category.status}
          />

          <div>
            <button
              type="button"
              onClick={() =>
                setModal({
                  type: 'form',
                  id: category.id,
                })
              }
            >
              CHỈNH SỬA
            </button>

            {category.status === 'active' ? (
              <button
                type="button"
                className="is-danger"
                onClick={() =>
                  setModal({
                    type: 'deactivate',
                    id: category.id,
                  })
                }
              >
                NGỪNG HOẠT ĐỘNG
              </button>
            ) : (
              <button
                type="button"
                className="is-success"
                disabled={restoring}
                onClick={restore}
              >
                {restoring
                  ? 'ĐANG KHÔI PHỤC...'
                  : 'KHÔI PHỤC'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Thống kê */}
      <section className="category-detail-stats">
        <div>
          <strong>
            #{category.id}
          </strong>

          <span>MÃ DANH MỤC</span>
        </div>

        <div>
          <strong>
            {parent?.name || 'GỐC'}
          </strong>

          <span>DANH MỤC CHA</span>
        </div>

        <div>
          <strong>
            {products.length}
          </strong>

          <span>SỐ SẢN PHẨM</span>
        </div>

        <div>
          <strong>
            {category.status === 'active'
              ? 'HOẠT ĐỘNG'
              : 'NGỪNG HOẠT ĐỘNG'}
          </strong>

          <span>TRẠNG THÁI</span>
        </div>
      </section>

      {/* Thông tin danh mục */}
      <section className="category-detail-card">
        <SectionHeader>
          THÔNG TIN DANH MỤC
        </SectionHeader>

        <div className="category-information">
          <dl>
            <dt>TÊN DANH MỤC</dt>
            <dd>{category.name}</dd>

            <dt>DANH MỤC CHA</dt>
            <dd>
              {parent?.name ||
                'DANH MỤC GỐC'}
            </dd>

            <dt>ĐƯỜNG DẪN</dt>
            <dd>
              /{category.slug}
            </dd>

            <dt>TRẠNG THÁI</dt>
            <dd>
              {category.status === 'active'
                ? 'HOẠT ĐỘNG'
                : 'NGỪNG HOẠT ĐỘNG'}
            </dd>
          </dl>

          <div className="category-information-image">
            <span>ẢNH ĐẠI DIỆN</span>

            <CategoryImage
              category={category}
              large
            />
          </div>
        </div>
      </section>

      {/* Danh mục con */}
      {children.length > 0 && (
        <section className="category-detail-card">
          <SectionHeader
            meta={`${children.length} MỤC`}
          >
            DANH MỤC CON
          </SectionHeader>

          <div className="category-detail-table-wrap">
            <div className="admin-table-scroll admin-table-scroll--embedded" tabIndex={0} role="region" aria-label="Bảng dữ liệu liên quan"><table className="admin-data-table admin-data-table--records">
              <thead>
                <tr>
                  <th>MÃ</th>
                  <th>DANH MỤC</th>
                  <th>SỐ SP</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>

              <tbody>
                {childPagination.visibleItems.map(
                  (child) => (
                    <tr key={child.id}>
                      <td>
                        #{child.id}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/danh-muc/danh-muc-san-pham/${child.id}`
                            )
                          }
                        >
                          {child.name}
                        </button>
                      </td>

                      <td>
                        {child.productCount}
                      </td>

                      <td>
                        <StatusBadge
                          status={child.status}
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table></div>
          </div>

          <DetailTablePagination
            totalItems={children.length}
            currentPage={
              childPagination.currentPage
            }
            onPageChange={
              childPagination.onPageChange
            }
            idPrefix="category-children"
          />
        </section>
      )}

      {/* Sản phẩm thuộc danh mục */}
      <section className="category-detail-card">
        <SectionHeader
          meta={`${products.length} SẢN PHẨM`}
        >
          SẢN PHẨM THUỘC DANH MỤC
        </SectionHeader>

        {products.length ? (
          <>
            <div className="category-detail-table-wrap">
              <div className="admin-table-scroll admin-table-scroll--embedded" tabIndex={0} role="region" aria-label="Bảng dữ liệu liên quan"><table className="admin-data-table admin-data-table--records">
                <thead>
                  <tr>
                    <th>MÃ SẢN PHẨM</th>
                    <th>TÊN SẢN PHẨM</th>
                    <th>THƯƠNG HIỆU</th>
                    <th>TRẠNG THÁI</th>
                  </tr>
                </thead>

                <tbody>
                  {productPagination.visibleItems.map(
                    (product) => (
                      <tr key={product.id}>
                        <td>
                          {product.maSanPham}
                        </td>

                        <td>
                          {product.tenSanPham}
                        </td>

                        <td>—</td>

                        <td>
                          <StatusBadge
                            status={
                              product.trangThai
                            }
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table></div>
            </div>

            <DetailTablePagination
              totalItems={products.length}
              currentPage={
                productPagination.currentPage
              }
              onPageChange={
                productPagination.onPageChange
              }
              idPrefix="category-products"
            />
          </>
        ) : (
          <div className="category-products-empty">
            <strong>
              Chưa có sản phẩm thuộc danh mục này.
            </strong>

            <span>
              Backend chưa trả về sản phẩm nào
              được gán trực tiếp cho danh mục.
            </span>
          </div>
        )}
      </section>

      <CategoryModals
        key={`${modal?.type || 'none'}-${modal?.id || 'new'}`}
        modal={modal}
        setModal={setModal}
        categories={categories}
        reload={reloadAll}
      />
    </main>
  );
}