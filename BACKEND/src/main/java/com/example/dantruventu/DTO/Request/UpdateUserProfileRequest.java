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
public class UpdateUserProfileRequest {

    @JsonProperty("ho_ten")
    @NotBlank(message = "Họ tên không được để trống")
    private String hoTen;

    @JsonProperty("anh_dai_dien")
    private String anhDaiDien;
}