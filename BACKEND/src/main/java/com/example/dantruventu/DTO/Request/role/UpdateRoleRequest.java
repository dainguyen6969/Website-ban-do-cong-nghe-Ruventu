package com.example.dantruventu.DTO.Request.role;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRoleRequest {

  @JsonProperty("ten_vai_tro")
  @NotBlank(message = "Tên vai trò để trống hoặc dữ liệu không hợp lệ.")
  @Size(max = 255, message = "Tên vai trò tối đa 255 ký tự")
  private String tenVaiTro;

  @JsonProperty("mo_ta")
  @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
  private String moTa;
}
