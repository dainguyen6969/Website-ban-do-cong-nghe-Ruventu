package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.LoaiSanPham;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComboMutationResponse {

  private Long id;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("loai_san_pham")
  private LoaiSanPham loaiSanPham;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("thanh_phan")
  private List<ThanhPhanData> thanhPhan;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ThanhPhanData {

    @JsonProperty("phien_ban_thanh_phan_id")
    private Long phienBanThanhPhanId;

    @JsonProperty("so_luong")
    private Integer soLuong;
  }
}
