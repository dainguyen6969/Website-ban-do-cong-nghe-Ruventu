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
  // Ánh xạ hạng mục sang slug danh mục hiện có trong cơ sở dữ liệu.
  private Map<String, String> categorySlugs = defaultMappings();

  private static Map<String, String> defaultMappings() {
    return new LinkedHashMap<>(
        Map.ofEntries(
            Map.entry("CPU", "pcb-demo-cpu"),
            Map.entry("MAIN", "pcb-demo-main"),
            Map.entry("RAM", "pcb-demo-ram"),
            Map.entry("SSD_1", "pcb-demo-ssd"),
            Map.entry("SSD_2", "pcb-demo-ssd"),
            Map.entry("HDD", "pcb-demo-hdd"),
            Map.entry("VGA", "pcb-demo-gpu"),
            Map.entry("PSU", "pcb-demo-psu"),
            Map.entry("CASE", "pcb-demo-case"),
            Map.entry("TAN_KHI", "pcb-demo-tan-khi"),
            Map.entry("TAN_AIO", "pcb-demo-tan-aio"),
            Map.entry("FAN", "pcb-demo-fan"),
            Map.entry("MONITOR_1", "pcb-demo-monitor"),
            Map.entry("MONITOR_2", "pcb-demo-monitor"),
            Map.entry("BAN_PHIM", "pcb-demo-ban-phim"),
            Map.entry("CHUOT", "pcb-demo-chuot"),
            Map.entry("PAD", "pcb-demo-pad"),
            Map.entry("TAI_NGHE", "pcb-demo-tai-nghe"),
            Map.entry("LOA", "pcb-demo-loa"),
            Map.entry("GHE_GAMING", "pcb-demo-ghe-gaming"),
            Map.entry("BAN_GAMING", "pcb-demo-ban-gaming"),
            Map.entry("WEBCAM", "pcb-demo-webcam"),
            Map.entry("MICROPHONE", "pcb-demo-microphone"),
            Map.entry("THIET_BI_STREAM", "pcb-demo-thiet-bi-stream"),
            Map.entry("THIET_BI_MANG", "pcb-demo-thiet-bi-mang"),
            Map.entry("GIA_TREO_MAN_HINH", "pcb-demo-gia-treo-man-hinh")));
  }
}
