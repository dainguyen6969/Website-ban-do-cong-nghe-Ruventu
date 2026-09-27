package com.example.dantruventu.DTO.Response.employee;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeListItemResponse {

  private Long id;

  @JsonProperty("ho_ten")
  private String hoTen;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  private String email;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("vai_tro")
  private EmployeeRoleResponse vaiTro;
}
