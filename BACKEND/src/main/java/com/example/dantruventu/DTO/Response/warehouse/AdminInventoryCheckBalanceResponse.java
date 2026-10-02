package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import com.fasterxml.jackson.annotation.JsonProperty;
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
public class AdminInventoryCheckBalanceResponse {

  private Long id;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("trang_thai")
  private TrangThaiPhieuKiemKho trangThai;

  @JsonProperty("ton_cu")
  private Integer tonCu;

  @JsonProperty("ton_moi")
  private Integer tonMoi;

  @JsonProperty("so_luong_thay_doi")
  private Integer soLuongThayDoi;
}
