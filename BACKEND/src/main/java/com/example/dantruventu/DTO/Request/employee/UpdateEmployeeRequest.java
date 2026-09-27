package com.example.dantruventu.DTO.Request.employee;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateEmployeeRequest {

  @JsonProperty("ho_ten")
  @NotBlank(message = "Họ tên không được để trống")
  @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
  private String hoTen;

  @JsonProperty("so_dien_thoai")
  @NotBlank(message = "Số điện thoại không được để trống")
  @Pattern(
      regexp = "^(0|\\+84)(3|5|7|8|9)[0-9]{8}$",
      message = "Số điện thoại không đúng định dạng Việt Nam")
  private String soDienThoai;

  @JsonProperty("vai_tro_id")
  @NotNull(message = "Vai trò ID không được để trống")
  private Long vaiTroId;

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái không được để trống")
  @Min(value = 0, message = "Trạng thái chỉ nhận 0 hoặc 1")
  @Max(value = 1, message = "Trạng thái chỉ nhận 0 hoặc 1")
  private Short trangThai;

  @JsonProperty("mat_khau")
  private String matKhau;

  @JsonProperty("xac_nhan_mat_khau")
  private String xacNhanMatKhau;
}
