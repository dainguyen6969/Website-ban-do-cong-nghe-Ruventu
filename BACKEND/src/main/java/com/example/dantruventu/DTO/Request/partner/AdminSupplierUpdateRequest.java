package com.example.dantruventu.DTO.Request.partner;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.*;
import tools.jackson.databind.JsonNode;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSupplierUpdateRequest {

  @JsonProperty("ten_nha_cung_cap")
  @NotBlank(message = "Tên nhà cung cấp không được để trống")
  @Size(max = 255, message = "Tên nhà cung cấp tối đa 255 ký tự")
  private String tenNhaCungCap;

  @JsonProperty("so_dien_thoai")
  @NotBlank(message = "Số điện thoại không được để trống")
  @Pattern(
      regexp = "\\+?[0-9]{9,15}",
      message = "Số điện thoại gồm 9–15 chữ số, có thể bắt đầu bằng dấu +")
  private String soDienThoai;

  @Email(message = "Email không hợp lệ")
  @Size(max = 255, message = "Email tối đa 255 ký tự")
  private String email;

  @JsonProperty("dia_chi")
  @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
  private String diaChi;

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái không được để trống")
  @Min(value = 0, message = "Trạng thái chỉ nhận 0 hoặc 1")
  @Max(value = 1, message = "Trạng thái chỉ nhận 0 hoặc 1")
  private Short trangThai;

  @JsonAnySetter
  public void rejectUnknownField(String name, JsonNode value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
