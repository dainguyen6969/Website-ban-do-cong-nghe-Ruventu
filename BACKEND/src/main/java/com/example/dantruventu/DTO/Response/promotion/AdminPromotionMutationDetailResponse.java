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
public class AdminPromotionMutationDetailResponse {

  private Long id;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("loai_ap_dung")
  private LoaiApDungKhuyenMai loaiApDung;

  @JsonProperty("so_luong")
  private Integer soLuong;
}
