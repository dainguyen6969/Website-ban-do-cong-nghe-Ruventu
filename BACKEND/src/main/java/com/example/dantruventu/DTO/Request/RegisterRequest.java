package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @JsonProperty("ho_ten")
    @NotBlank(message = "Họ tên không được để trống")
    private String hoTen;

    @JsonProperty("email")
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @JsonProperty("so_dien_thoai")
    @NotBlank(message = "Số điện thoại không được để trống")
    private String soDienThoai;

    @JsonProperty("mat_khau")
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    private String matKhau;

    @JsonProperty("xac_nhan_mat_khau")
    @NotBlank(message = "Xác nhận mật khẩu không được để trống")
    private String xacNhanMatKhau;
}