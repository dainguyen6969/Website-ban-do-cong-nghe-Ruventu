package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderPaymentResponse {

  @JsonProperty("don_nhap_hang_id")
  private Long donNhapHangId;

  @JsonProperty("so_tien_thanh_toan")
  private BigDecimal soTienThanhToan;

  @JsonProperty("so_tien_da_thanh_toan")
  private BigDecimal soTienDaThanhToan;

  @JsonProperty("so_tien_con_no")
  private BigDecimal soTienConNo;

  @JsonProperty("trang_thai_thanh_toan")
  private TrangThaiThanhToanNhap trangThaiThanhToan;

  @JsonProperty("phieu_chi")
  private CashVoucher phieuChi;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class CashVoucher {

    private Long id;

    @JsonProperty("ma_phieu")
    private String maPhieu;

    @JsonProperty("so_tien")
    private BigDecimal soTien;
  }
}
