package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComboComponentOptionResponse {

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

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

  @JsonProperty("gia_nhap")
  private BigDecimal giaNhap;

  @JsonProperty("ton_co_the_ban")
  private Long tonCoTheBan;
}
