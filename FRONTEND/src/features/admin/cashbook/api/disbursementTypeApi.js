import { adminRequest } from "../../catalog/products/api/versionApi.js";

import {
  basicStatusLabel,
  basicStatusValue,
  requireBasicStatus,
} from "../../../../shared/services/mutationUtils";

const PATH = "/api/v1/admin/disbursement-types";

export const DISBURSEMENT_TYPE_STATUS = {
  active: "HOẠT ĐỘNG",
  inactive: "NGỪNG HOẠT ĐỘNG",
};

export function normalizeDisbursementType(item = {}) {
  return {
    id: item.id || item.ma_loai || "",
    code: item.ma_loai || "",
    name: item.ten_loai || "",
    type: item.loai_phieu || "CHI",
    note: item.ghi_chu || "-",

    status: basicStatusLabel(
      item.trang_thai,
      DISBURSEMENT_TYPE_STATUS.active,
      DISBURSEMENT_TYPE_STATUS.inactive,
    ),
  };
}

export async function getDisbursementTypes(filters = {}, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
  });

  if (filters.keyword?.trim()) {
    params.set("keyword", filters.keyword.trim());
  }

  const status =
    filters.status === DISBURSEMENT_TYPE_STATUS.active
      ? 1
      : filters.status === DISBURSEMENT_TYPE_STATUS.inactive
        ? 0
        : basicStatusValue(filters.status);

  if (status !== null) {
    params.set("trang_thai", String(status));
  }

  const data = await adminRequest(`${PATH}?${params}`, { signal });

  return {
    items: (data?.items || []).map(normalizeDisbursementType),
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getDisbursementTypeDetail(id, signal) {
  const data = await adminRequest(`${PATH}/${encodeURIComponent(id)}`, {
    signal,
  });

  return normalizeDisbursementType(data);
}

export async function createDisbursementType(form) {
  const data = await adminRequest(PATH, {
    method: "POST",
    body: JSON.stringify({
      ma_loai: form.code.trim(),
      ten_loai: form.name.trim(),
      ghi_chu: form.note?.trim() || null,
    }),
  });

  return normalizeDisbursementType(data);
}

export async function updateDisbursementTypeStatus(id, isActive) {
  const status =
    typeof isActive === "boolean"
      ? Number(isActive)
      : requireBasicStatus(isActive);

  return adminRequest(`${PATH}/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      trang_thai: status,
    }),
  });
}
