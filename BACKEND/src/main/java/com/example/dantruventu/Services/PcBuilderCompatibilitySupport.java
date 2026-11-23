package com.example.dantruventu.Services;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Đối chiếu hãng trong tên CPU với dòng CPU hỗ trợ của MAIN; chỉ dùng cảnh báo/lọc. */
@Component
@RequiredArgsConstructor
public class PcBuilderCompatibilitySupport {
  private final ObjectMapper objectMapper;
  public static final String SCOPE = "CPU_HO_TRO_MAIN";
  public static final String MATCH = "KHOP_CPU_HO_TRO";
  public static final String MISMATCH = "KHONG_KHOP_CPU_HO_TRO";
  public static final String UNKNOWN = "CHUA_DU_DU_LIEU";

  public String cpuBrand(String productName) {
    if (productName == null) return null;
    String name = productName.toLowerCase(Locale.ROOT);
    boolean amd = name.contains("amd"), intel = name.contains("intel");
    if (amd == intel) return null;
    return amd ? "AMD" : "INTEL";
  }

  public String supportedCpuText(String specifications) {
    var values = new LinkedHashSet<String>();
    mainSpecifications(specifications)
        .forEach(
            (key, value) -> {
              // Chấp nhận cùng tên thuộc tính ở dạng có dấu, không dấu hoặc dùng dấu gạch dưới.
              String normalized =
                  Normalizer.normalize(key, Normalizer.Form.NFD)
                      .replaceAll("\\p{M}+", "")
                      .toLowerCase(Locale.ROOT)
                      .replaceAll("[\\s\\p{Z}_-]", "");
              if (normalized.equals("cpuhotro") && value instanceof String text && !text.isBlank())
                values.add(text.strip());
            });
    return values.isEmpty() ? null : String.join("; ", values);
  }

  public Set<String> supportedBrands(String specifications) {
    String text = supportedCpuText(specifications);
    var brands = new LinkedHashSet<String>();
    if (text != null) {
      String lower = text.toLowerCase(Locale.ROOT);
      if (lower.contains("amd")) brands.add("AMD");
      if (lower.contains("intel")) brands.add("INTEL");
    }
    return brands;
  }

  public String cpuNamePattern(String mainSpecifications) {
    var brands = supportedBrands(mainSpecifications);
    return brands.isEmpty() ? null : String.join("|", brands);
  }

  public String compare(String cpuProductName, String mainSpecifications) {
    String brand = cpuBrand(cpuProductName);
    var supported = supportedBrands(mainSpecifications);
    if (brand == null || supported.isEmpty()) return UNKNOWN;
    return supported.contains(brand) ? MATCH : MISMATCH;
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
      // Giữ thông số công khai đã lưu, kể cả các thuộc tính không liên quan đến socket.
      result.putAll(parsed);
      return result;
    } catch (Exception exception) {
      return result;
    }
  }
}
