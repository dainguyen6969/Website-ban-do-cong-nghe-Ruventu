package com.example.dantruventu.Enum;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Hạng mục là ô chọn nghiệp vụ; tên enum không phải ID danh mục trong database. */
@Getter
@RequiredArgsConstructor
public enum PcBuilderCategory {
  CPU(Group.LINH_KIEN, "CPU - Bộ vi xử lý", "pcb-demo-cpu"),
  MAIN(Group.LINH_KIEN, "MAIN - Bo mạch chủ", "pcb-demo-main"),
  RAM(Group.LINH_KIEN, "RAM - Bộ nhớ trong", "pcb-demo-ram"),
  SSD_1(Group.LINH_KIEN, "Ổ cứng SSD 1", "pcb-demo-ssd"),
  SSD_2(Group.LINH_KIEN, "Ổ cứng SSD 2", "pcb-demo-ssd"),
  HDD(Group.LINH_KIEN, "Ổ cứng HDD", "pcb-demo-hdd"),
  VGA(Group.LINH_KIEN, "VGA - Card màn hình", "pcb-demo-gpu"),
  PSU(Group.LINH_KIEN, "PSU - Nguồn máy tính", "pcb-demo-psu"),
  CASE(Group.LINH_KIEN, "CASE - Vỏ máy tính", "pcb-demo-case"),
  TAN_KHI(Group.LINH_KIEN, "Tản nhiệt khí", "pcb-demo-tan-khi"),
  TAN_AIO(Group.LINH_KIEN, "Tản nhiệt nước AIO", "pcb-demo-tan-aio"),
  FAN(Group.LINH_KIEN, "Fan tản nhiệt", "pcb-demo-fan"),
  MONITOR_1(Group.MAN_HINH_GEAR, "Màn hình 1", "pcb-demo-monitor"),
  MONITOR_2(Group.MAN_HINH_GEAR, "Màn hình 2", "pcb-demo-monitor"),
  BAN_PHIM(Group.MAN_HINH_GEAR, "Bàn phím", "pcb-demo-ban-phim"),
  CHUOT(Group.MAN_HINH_GEAR, "Chuột", "pcb-demo-chuot"),
  PAD(Group.MAN_HINH_GEAR, "Bàn di chuột", "pcb-demo-pad"),
  TAI_NGHE(Group.MAN_HINH_GEAR, "Tai nghe", "pcb-demo-tai-nghe"),
  LOA(Group.MAN_HINH_GEAR, "Loa", "pcb-demo-loa"),
  GHE_GAMING(Group.SETUP_PHU_KIEN, "Ghế Gaming", "pcb-demo-ghe-gaming"),
  BAN_GAMING(Group.SETUP_PHU_KIEN, "Bàn Gaming", "pcb-demo-ban-gaming"),
  WEBCAM(Group.SETUP_PHU_KIEN, "Webcam", "pcb-demo-webcam"),
  MICROPHONE(Group.SETUP_PHU_KIEN, "Microphone", "pcb-demo-microphone"),
  THIET_BI_STREAM(Group.SETUP_PHU_KIEN, "Thiết bị Studio và Stream", "pcb-demo-thiet-bi-stream"),
  THIET_BI_MANG(Group.SETUP_PHU_KIEN, "Thiết bị mạng", "pcb-demo-thiet-bi-mang"),
  GIA_TREO_MAN_HINH(Group.SETUP_PHU_KIEN, "Giá treo màn hình", "pcb-demo-gia-treo-man-hinh");

  private final Group group;
  private final String displayName;
  private final String defaultCategorySlug;

  @Getter
  @RequiredArgsConstructor
  public enum Group {
    LINH_KIEN("Linh kiện máy tính"),
    MAN_HINH_GEAR("Màn hình và Gaming Gear"),
    SETUP_PHU_KIEN("Setup, Stream và Phụ kiện");

    private final String displayName;
  }
}
