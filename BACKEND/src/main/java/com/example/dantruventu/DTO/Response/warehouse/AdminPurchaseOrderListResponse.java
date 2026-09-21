package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderListResponse {

  private List<Item> items;

  private PaginationResponse pagination;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Item {

    private Long id;

    @JsonProperty("ma_don_nhap")
    private String maDonNhap;

    @JsonProperty("nha_cung_cap")
    private Supplier nhaCungCap;

    @JsonProperty("trang_thai_nhap")
    private TrangThaiNhapHang trangThaiNhap;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanNhap trangThaiThanhToan;

    @JsonProperty("tong_tien")
    private BigDecimal tongTien;

    @JsonProperty("ngay_tao")
    private LocalDateTime ngayTao;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Supplier {

    private Long id;

    @JsonProperty("ma_nha_cung_cap")
    private String maNhaCungCap;

    @JsonProperty("ten_nha_cung_cap")
    private String tenNhaCungCap;
  }
}
