package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record CartPcBuildResponse(
    @JsonProperty("so_hang_muc_da_them") int soHangMucDaThem,
    @JsonProperty("so_phien_ban_da_cap_nhat") int soPhienBanDaCapNhat,
    @JsonProperty("tong_so_luong_da_them") long tongSoLuongDaThem,
    List<Item> items) {
  public record Item(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong_truoc") int soLuongTruoc,
      @JsonProperty("so_luong_them") int soLuongThem,
      @JsonProperty("so_luong_sau") int soLuongSau) {}
}
