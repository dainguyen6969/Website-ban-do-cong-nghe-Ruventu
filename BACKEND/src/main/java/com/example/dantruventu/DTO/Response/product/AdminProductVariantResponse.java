package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductVariantResponse {

  private Long id;

  @JsonProperty("san_pham_id")
  private Long sanPhamId;

  @JsonProperty("ten_phien_ban")
  private String tenPhienBan;

  @JsonProperty("gia_ban_le")
  private BigDecimal giaBanLe;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
