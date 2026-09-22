package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResendOtpResponse {

    @JsonProperty("tai_khoan")
    private String taiKhoan;

    @JsonProperty("thoi_han_otp_giay")
    private Integer thoiHanOtpGiay;
}