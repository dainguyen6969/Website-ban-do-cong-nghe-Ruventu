package com.example.dantruventu.DTO.Response.promotion;

import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPromotionDetailLineResponse {

  private Long id;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("ten_phien_ban")
  private String tenPhienBan;

  @JsonProperty("loai_ap_dung")
  private LoaiApDungKhuyenMai loaiApDung;

  @JsonProperty("so_luong")
  private Integer soLuong;
}
