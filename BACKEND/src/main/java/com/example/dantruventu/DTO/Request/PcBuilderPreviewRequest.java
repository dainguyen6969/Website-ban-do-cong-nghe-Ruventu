package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PcBuilderPreviewRequest(List<Item> items) {
  // Nhận Object để kiểm tra token số nguyên, tránh Jackson tự đổi 1.5 thành 1.
  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Item(
      @JsonProperty("ma_hang_muc") String maHangMuc,
      @JsonProperty("phien_ban_id") Object phienBanId,
      @JsonProperty("so_luong") Object soLuong) {}
}
