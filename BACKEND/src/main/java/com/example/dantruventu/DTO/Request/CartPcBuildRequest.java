package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record CartPcBuildRequest(List<Item> items) {
  @JsonAnySetter
  public void rejectUnknown(String name, Object value) {
    throw new IllegalArgumentException("Trường không được phép: " + name);
  }

  public record Item(
      @JsonProperty("ma_hang_muc") String maHangMuc,
      @JsonProperty("phien_ban_id") Object phienBanId,
      @JsonProperty("so_luong") Object soLuong,
      @JsonProperty("don_gia_xac_nhan") Object donGiaXacNhan) {
    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
      throw new IllegalArgumentException("Trường không được phép: " + name);
    }
  }
}
