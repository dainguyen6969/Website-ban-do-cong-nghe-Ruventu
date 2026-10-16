import {
  adminRequest,
} from "../../catalog/products/api/versionApi.js";

import {
  basicStatusLabel,
  basicStatusValue,
  requireBasicStatus,
} from "../../../../shared/services/mutationUtils";

const PATH = "/api/v1/admin/receipt-types";

export const RECEIPT_TYPE_STATUS = {
  active: "HOẠT ĐỘNG",
  inactive: "NGỪNG HOẠT ĐỘNG",
};

export function normalizeReceiptType(item = {}) {
  return {
    id: item.id || item.ma_loai || "",
    code: item.ma_loai || "",
    name: item.ten_loai || "",
    type: item.loai_phieu || "THU",
    note: item.ghi_chu || "-",

    status: basicStatusLabel(
      item.trang_thai,
      RECEIPT_TYPE_STATUS.active,
      RECEIPT_TYPE_STATUS.inactive,
    ),
  };
}

export async function getReceiptTypes(filters = {}, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
  });

  if (filters.keyword?.trim()) {
    params.set("keyword", filters.keyword.trim());
  }

  const status =
    filters.status === RECEIPT_TYPE_STATUS.active
      ? 1
      : filters.status === RECEIPT_TYPE_STATUS.inactive
        ? 0
        : basicStatusValue(filters.status);

  if (status !== null) {
    params.set("trang_thai", String(status));
  }

  const data = await adminRequest(`${PATH}?${params}`, { signal });

  return {
    items: (data?.items || []).map(normalizeReceiptType),
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getReceiptTypeDetail(id, signal) {
  const data = await adminRequest(
    `${PATH}/${encodeURIComponent(id)}`,
    { signal },
  );

  return normalizeReceiptType(data);
}

export async function createReceiptType(form) {
  const data = await adminRequest(PATH, {
    method: "POST",
    body: JSON.stringify({
      ma_loai: form.code.trim(),
      ten_loai: form.name.trim(),
      ghi_chu: form.note?.trim() || null,
    }),
  });

  return normalizeReceiptType(data);
}

export async function updateReceiptTypeStatus(id, isActive) {
  const status =
    typeof isActive === "boolean"
      ? Number(isActive)
      : requireBasicStatus(isActive);

  return adminRequest(
    `${PATH}/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        trang_thai: status,
      }),
    },
  );
}