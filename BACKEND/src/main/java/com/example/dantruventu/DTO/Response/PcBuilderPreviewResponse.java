package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PcBuilderPreviewResponse(
    @JsonProperty("thoi_diem_tinh") OffsetDateTime thoiDiemTinh,
    @JsonProperty("so_hang_muc_da_chon") int soHangMucDaChon,
    @JsonProperty("tong_hang_muc") int tongHangMuc,
    @JsonProperty("tong_so_luong") long tongSoLuong,
    List<Item> items,
    @JsonProperty("tong_tam_tinh") BigDecimal tongTamTinh,
    @JsonProperty("kiem_tra_cpu_main") CpuMainCheck kiemTraCpuMain,
    @JsonProperty("kiem_tra_ton_kho") StockCheck kiemTraTonKho,
    @JsonProperty("co_the_gui_yeu_cau_them_gio") boolean coTheGuiYeuCauThemGio,
    @JsonProperty("co_the_xuat_excel") boolean coTheXuatExcel,
    List<String> loi) {

  public record Item(
      @JsonProperty("ma_hang_muc") String maHangMuc,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("ten_phien_ban") String tenPhienBan,
      @JsonProperty("so_luong") int soLuong,
      @JsonProperty("don_gia") BigDecimal donGia,
      @JsonProperty("thanh_tien") BigDecimal thanhTien,
      @JsonProperty("ton_co_the_ban") long tonCoTheBan) {}

  public record CpuMainCheck(
      @JsonProperty("trang_thai") String trangThai,
      @JsonProperty("cpu_phien_ban_id") Long cpuPhienBanId,
      @JsonProperty("main_phien_ban_id") Long mainPhienBanId,
      @JsonProperty("socket_cpu") String socketCpu,
      @JsonProperty("socket_main") String socketMain,
      @JsonProperty("pham_vi") String phamVi) {}

  public record StockCheck(
      @JsonProperty("hop_le") boolean hopLe, @JsonProperty("nhu_cau") List<StockDemand> nhuCau) {}

  public record StockDemand(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong_yeu_cau") long soLuongYeuCau,
      @JsonProperty("ton_co_the_ban") long tonCoTheBan) {}
}
