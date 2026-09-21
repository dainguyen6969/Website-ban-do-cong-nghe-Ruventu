package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderReturnResponse {

  @JsonProperty("don_nhap_hang_id")
  private Long donNhapHangId;

  @JsonProperty("trang_thai_nhap")
  private TrangThaiNhapHang trangThaiNhap;

  @JsonProperty("gia_tri_hang_tra")
  private BigDecimal giaTriHangTra;

  @JsonProperty("so_tien_da_nhan_hoan")
  private BigDecimal soTienDaNhanHoan;

  @JsonProperty("phieu_thu")
  private CashVoucher phieuThu;

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
