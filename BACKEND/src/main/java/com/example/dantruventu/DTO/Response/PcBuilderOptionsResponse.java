package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record PcBuilderOptionsResponse(
    @JsonProperty("tong_hang_muc") int tongHangMuc,
    @JsonProperty("bat_buoc_chon_du") boolean batBuocChonDu,
    @JsonProperty("so_phien_ban_toi_da_moi_hang_muc") int soPhienBanToiDaMoiHangMuc,
    @JsonProperty("nhom_hang_muc") List<Group> nhomHangMuc,
    @JsonProperty("tinh_trang_hang") List<String> tinhTrangHang,
    @JsonProperty("sap_xep") List<String> sapXep,
    @JsonProperty("pham_vi_kiem_tra") String phamViKiemTra) {

  public record Group(
      @JsonProperty("ma_nhom") String maNhom,
      @JsonProperty("ten_nhom") String tenNhom,
      @JsonProperty("hang_muc") List<Item> hangMuc) {}

  public record Item(
      @JsonProperty("ma_hang_muc") String maHangMuc,
      @JsonProperty("ten_hang_muc") String tenHangMuc) {}
}
