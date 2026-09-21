package com.example.dantruventu.DTO.Request.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBrandRequest {

  @JsonProperty("ten_thuong_hieu")
  @NotBlank(message = "Tên thương hiệu không được để trống")
  @Size(max = 100, message = "Tên thương hiệu tối đa 100 ký tự")
  private String tenThuongHieu;

  @Size(max = 255, message = "Đường dẫn logo tối đa 255 ký tự")
  private String logo;

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái không được để trống")
  @Min(value = 0, message = "Trạng thái chỉ nhận 0 hoặc 1")
  @Max(value = 1, message = "Trạng thái chỉ nhận 0 hoặc 1")
  private Short trangThai;
}
