package com.example.dantruventu.DTO.Response.role;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
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

  @JsonProperty("ma_vai_tro")
  private String maVaiTro;

  @JsonProperty("quyen")
  private Map<String, List<String>> quyen;

  @JsonProperty("phien_ban")
  private long phienBan;

  @JsonProperty("so_luong_nhan_vien")
  private long soLuongNhanVien;
}
