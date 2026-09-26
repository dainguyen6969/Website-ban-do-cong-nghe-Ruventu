package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CartPromotionResponse {

    private int status;
    private String message;
    private PromotionData data;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PromotionData {

        @JsonProperty("ma_chuong_trinh")
        private String maChuongTrinh;

        @JsonProperty("giam_gia")
        private BigDecimal giamGia;

        @JsonProperty("tam_tinh")
        private BigDecimal tamTinh;

        @JsonProperty("tong_tien_moi")
        private BigDecimal tongTienMoi;
    }
}