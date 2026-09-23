package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderStatusResponse {

  private Long id;

  @JsonProperty("ma_don_nhap")
  private String maDonNhap;

  @JsonProperty("tong_tien")
  private BigDecimal tongTien;

  @JsonProperty("trang_thai_nhap")
  private TrangThaiNhapHang trangThaiNhap;

  @JsonProperty("trang_thai_thanh_toan")
  private TrangThaiThanhToanNhap trangThaiThanhToan;
}
