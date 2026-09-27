package com.example.dantruventu.DTO.Response.role;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleListItemResponse {

  private Long id;

  @JsonProperty("ten_vai_tro")
  private String tenVaiTro;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("so_luong_nhan_vien")
  private long soLuongNhanVien;
}
