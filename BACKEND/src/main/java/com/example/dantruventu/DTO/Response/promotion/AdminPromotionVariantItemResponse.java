package com.example.dantruventu.DTO.Response.promotion;

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
public class AdminPromotionVariantItemResponse {

  private Long id;

  @JsonProperty("san_pham_id")
  private Long sanPhamId;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("ten_phien_ban")
  private String tenPhienBan;

  @JsonProperty("ma_vach")
  private String maVach;

  @JsonProperty("gia_ban_le")
  private BigDecimal giaBanLe;
}
