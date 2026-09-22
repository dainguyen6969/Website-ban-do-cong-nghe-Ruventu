package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {

    @NotBlank(message = "Tài khoản không được để trống")
    @JsonProperty("tai_khoan")
    private String taiKhoan;

    @NotBlank(message = "Mật khẩu không được để trống")
    @JsonProperty("mat_khau")
    private String matKhau;

    @JsonProperty("ghi_nho_dang_nhap")
    private Boolean ghiNhoDangNhap;
}