package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminInventoryWarehouseStockResponse {

  @JsonProperty("kho_hang_id")
  private Long khoHangId;

  @JsonProperty("ten_kho")
  private String tenKho;

  @JsonProperty("ton_thuc_te")
  private Long tonThucTe;

  @JsonProperty("ton_co_the_ban")
  private Long tonCoTheBan;

  @JsonProperty("vi_tri_luu_kho")
  @JsonInclude(JsonInclude.Include.ALWAYS)
  private String viTriLuuKho;

  @JsonProperty("muc_ton_toi_thieu")
  private Long mucTonToiThieu;

  @JsonProperty("canh_bao")
  private Boolean canhBao;

  @JsonProperty("co_ton_am")
  private Boolean coTonAm;
}
