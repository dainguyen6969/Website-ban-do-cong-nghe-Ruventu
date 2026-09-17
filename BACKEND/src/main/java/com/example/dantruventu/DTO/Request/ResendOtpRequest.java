package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResendOtpRequest {

  @JsonProperty("tai_khoan")
  @NotBlank(message = "Tài khoản không được để trống")
  private String taiKhoan;
}
