package com.example.dantruventu.DTO.Request.employee;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
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
public class CreateEmployeeRequest {

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

  @JsonProperty("email")
  @NotBlank(message = "Email không được để trống")
  @Email(message = "Email không hợp lệ")
  @Size(max = 255, message = "Email tối đa 255 ký tự")
  private String email;

  @JsonProperty("vai_tro_id")
  @NotNull(message = "Vai trò ID không được để trống")
  private Long vaiTroId;

  @JsonProperty("mat_khau")
  @NotBlank(message = "Mật khẩu không được để trống")
  @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
  private String matKhau;

  @JsonProperty("xac_nhan_mat_khau")
  @NotBlank(message = "Xác nhận mật khẩu không được để trống")
  private String xacNhanMatKhau;
}
