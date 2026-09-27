package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class ApplyCartPromotionRequest {

    @JsonProperty("ma_chuong_trinh")
    @NotBlank(message = "Mã chương trình không được để trống")
    @Size(
            max = 50,
            message = "Mã chương trình không được vượt quá 50 ký tự"
    )
    private String maChuongTrinh;
}