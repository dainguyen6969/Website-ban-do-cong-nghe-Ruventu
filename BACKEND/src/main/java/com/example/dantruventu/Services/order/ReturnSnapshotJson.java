package com.example.dantruventu.Services.order;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

/** Keeps the shared String entity mapping while returning JSON objects in the return API. */
final class ReturnSnapshotJson {

  private static final ObjectMapper JSON = new ObjectMapper();

  private ReturnSnapshotJson() {}

  @SuppressWarnings("unchecked")
  static Map<String, Object> decode(String saved) {
    if (saved == null || saved.isBlank()) {
      return null;
    }
    try {
      return JSON.readValue(saved, Map.class);
    } catch (RuntimeException exception) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Không đọc được bản chụp lịch sử của giao dịch");
    }
  }

  static String encode(Map<String, Object> value) {
    return value == null ? null : JSON.writeValueAsString(value);
  }
}
