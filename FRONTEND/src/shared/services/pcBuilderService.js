import axios from "axios";
import { cartService } from "./cartService";

export function pcBuilderError(error) {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.data?.message) {
    return error.data.message;
  }

  if (error.isAxiosError || error instanceof TypeError) {
    return "Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.";
  }

  return error.message || "Không thể thực hiện thao tác.";
}

const api = axios.create({
  baseURL:
    (import.meta.env.VITE_RUVENTU_API_URL || "").replace(/\/$/, "") +
    "/api/v1/pc-builder",
  withCredentials: true,
});

async function exportBuild(body) {
  try {
    const response = await api.post("/export", body, {
      responseType: "blob",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

    const contentType = String(
      response.headers["content-type"] || "",
    ).toLowerCase();

    if (
      !contentType.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
    ) {
      throw new Error("Máy chủ không trả về tệp Excel hợp lệ.");
    }

    const disposition = response.headers["content-disposition"] || "";

    const match = /filename="?([^";]+)"?/i.exec(disposition);

    return {
      blob: response.data,
      filename: match?.[1] || "Ruventu_CauHinhPC.xlsx",
    };
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        error.data = JSON.parse(await error.response.data.text());
      } catch {
        error.data = null;
      }
    }

    throw error;
  }
}

export const pcBuilderService = {
  options: (signal) =>
    api.get("/options", { signal }).then((response) => response.data.data),

  products: (params, signal) =>
    api
      .get("/products", { params, signal })
      .then((response) => response.data.data),

  preview: (body, signal) =>
    api
      .post("/preview", body, { signal })
      .then((response) => response.data.data),

  addToCart: (key, body) =>
    cartService.addPcBuild(key, body).then((response) => response.data.data),

  export: exportBuild,
};
