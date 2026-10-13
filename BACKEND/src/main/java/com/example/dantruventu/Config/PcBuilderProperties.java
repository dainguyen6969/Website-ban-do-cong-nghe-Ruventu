package com.example.dantruventu.Config;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "ruventu.pc-builder")
public class PcBuilderProperties {
  // Có thể override bằng ruventu.pc-builder.category-slugs[CPU]=slug-danh-muc-thuc-te.
  private Map<String, String> categorySlugs = defaultMappings();

  private static Map<String, String> defaultMappings() {
    // Hạng mục chưa có danh mục riêng trong DB được để trống, không gán vào Phụ kiện chung.
    return new LinkedHashMap<>(
        Map.of(
            "CPU", "cpu",
            "MAIN", "mainboard",
            "RAM", "ram",
            "SSD_1", "ssd",
            "SSD_2", "ssd",
            "VGA", "vga",
            "PSU", "psu",
            "CASE", "case",
            "MONITOR_1", "man-hinh",
            "MONITOR_2", "man-hinh"));
  }
}
