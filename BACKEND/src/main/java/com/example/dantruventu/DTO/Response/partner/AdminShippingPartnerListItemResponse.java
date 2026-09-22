package com.example.dantruventu.DTO.Response.partner;

import com.example.dantruventu.Enum.LoaiDoiTacVanChuyenEnum;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class AdminShippingPartnerListItemResponse {

  private Long id;

  @JsonProperty("ma_doi_tac")
  private String maDoiTac;

  @JsonProperty("ten_doi_tac")
  private String tenDoiTac;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  private String email;

  @JsonProperty("loai_doi_tac")
  private LoaiDoiTacVanChuyenEnum loaiDoiTac;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
