package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterResponse {

    @JsonProperty("thoi_han_otp")
    private Integer thoiHanOtp;
}