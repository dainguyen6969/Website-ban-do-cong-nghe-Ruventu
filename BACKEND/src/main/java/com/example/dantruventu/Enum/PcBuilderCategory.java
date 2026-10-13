package com.example.dantruventu.Enum;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Hạng mục là ô chọn nghiệp vụ; tên enum không phải ID danh mục trong database. */
@Getter
@RequiredArgsConstructor
public enum PcBuilderCategory {
  CPU(Group.LINH_KIEN, "CPU - Bộ vi xử lý"),
  MAIN(Group.LINH_KIEN, "MAIN - Bo mạch chủ"),
  RAM(Group.LINH_KIEN, "RAM - Bộ nhớ trong"),
  SSD_1(Group.LINH_KIEN, "Ổ cứng SSD 1"),
  SSD_2(Group.LINH_KIEN, "Ổ cứng SSD 2"),
  HDD(Group.LINH_KIEN, "Ổ cứng HDD"),
  VGA(Group.LINH_KIEN, "VGA - Card màn hình"),
  PSU(Group.LINH_KIEN, "PSU - Nguồn máy tính"),
  CASE(Group.LINH_KIEN, "CASE - Vỏ máy tính"),
  TAN_KHI(Group.LINH_KIEN, "Tản nhiệt khí"),
  TAN_AIO(Group.LINH_KIEN, "Tản nhiệt nước AIO"),
  FAN(Group.LINH_KIEN, "Fan tản nhiệt"),
  MONITOR_1(Group.MAN_HINH_GEAR, "Màn hình 1"),
  MONITOR_2(Group.MAN_HINH_GEAR, "Màn hình 2"),
  BAN_PHIM(Group.MAN_HINH_GEAR, "Bàn phím"),
  CHUOT(Group.MAN_HINH_GEAR, "Chuột"),
  PAD(Group.MAN_HINH_GEAR, "Bàn di chuột"),
  TAI_NGHE(Group.MAN_HINH_GEAR, "Tai nghe"),
  LOA(Group.MAN_HINH_GEAR, "Loa"),
  GHE_GAMING(Group.SETUP_PHU_KIEN, "Ghế Gaming"),
  BAN_GAMING(Group.SETUP_PHU_KIEN, "Bàn Gaming"),
  WEBCAM(Group.SETUP_PHU_KIEN, "Webcam"),
  MICROPHONE(Group.SETUP_PHU_KIEN, "Microphone"),
  THIET_BI_STREAM(Group.SETUP_PHU_KIEN, "Thiết bị Studio và Stream"),
  THIET_BI_MANG(Group.SETUP_PHU_KIEN, "Thiết bị mạng"),
  GIA_TREO_MAN_HINH(Group.SETUP_PHU_KIEN, "Giá treo màn hình");

  private final Group group;
  private final String displayName;

  @Getter
  @RequiredArgsConstructor
  public enum Group {
    LINH_KIEN("Linh kiện máy tính"),
    MAN_HINH_GEAR("Màn hình và Gaming Gear"),
    SETUP_PHU_KIEN("Setup, Stream và Phụ kiện");

    private final String displayName;
  }
}
