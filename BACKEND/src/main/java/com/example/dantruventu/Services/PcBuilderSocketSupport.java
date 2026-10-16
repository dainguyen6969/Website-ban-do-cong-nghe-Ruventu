package com.example.dantruventu.Services;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Đọc socket từ JSON backend; dùng chung cho products, preview và thao tác giỏ sau này. */
@Component
@RequiredArgsConstructor
public class PcBuilderSocketSupport {
  private final ObjectMapper objectMapper;
  private static final Set<String> DISPLAY_KEYS =
      Set.of(
          "socket",
          "loai_ram",
          "dung_luong",
          "toc_do_bus",
          "bus_ram",
          "chipset",
          "so_nhan",
          "so_luong_nhan",
          "so_luong_luong",
          "tan_so",
          "cong_suat",
          "kich_thuoc",
          "do_phan_giai",
          "tan_so_quet",
          "vram",
          "chuan_ket_noi");

  public String extractSocket(String specifications) {
    if (specifications == null || specifications.isBlank()) {
      return null;
    }
    try {
      var root = objectMapper.readTree(specifications);
      if (root == null || !root.isObject()) {
        return null;
      }
      var socket = root.get("socket");
      if (socket == null || !socket.isString()) {
        return null;
      }
      String value = socket.asString();
      return value.isBlank() ? null : value;
    } catch (Exception exception) {
      return null;
    }
  }

  public String compare(String referenceSocket, String candidateSpecifications) {
    String candidateSocket = extractSocket(candidateSpecifications);
    if (referenceSocket == null || candidateSocket == null) {
      return "CHUA_DU_DU_LIEU";
    }
    return referenceSocket.equals(candidateSocket) ? "KHOP_SOCKET" : "KHONG_KHOP_SOCKET";
  }

  public Map<String, Object> mainSpecifications(String specifications) {
    Map<String, Object> result = new LinkedHashMap<>();
    if (specifications == null || specifications.isBlank()) {
      return result;
    }
    try {
      var root = objectMapper.readTree(specifications);
      if (root == null || !root.isObject()) {
        return result;
      }
      Map<String, Object> parsed = objectMapper.convertValue(root, new TypeReference<>() {});
      parsed.forEach(
          (key, value) -> {
            if (DISPLAY_KEYS.contains(key)) {
              result.put(key, value);
            }
          });
      return result;
    } catch (Exception exception) {
      return result;
    }
  }
}
