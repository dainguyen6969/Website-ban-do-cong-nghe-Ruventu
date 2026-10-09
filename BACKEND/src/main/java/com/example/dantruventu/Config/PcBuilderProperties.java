package com.example.dantruventu.Config;

import com.example.dantruventu.Enum.PcBuilderCategory;
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
    Map<String, String> mappings = new LinkedHashMap<>();
    for (PcBuilderCategory item : PcBuilderCategory.values()) {
      mappings.put(item.name(), item.getDefaultCategorySlug());
    }
    return mappings;
  }
}
