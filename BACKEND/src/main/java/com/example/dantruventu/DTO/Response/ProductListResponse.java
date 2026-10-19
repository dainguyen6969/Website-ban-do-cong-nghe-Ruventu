package com.example.dantruventu.DTO.Response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
public class ProductListResponse {

  private List<ProductItemResponse> danhSachSanPham;

  private Integer trang;

  private Integer gioiHan;

  private Long tongSoSanPham;

  private Integer tongSoTrang;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ProductItemResponse {

    private Long id;

    private String tenSanPham;

    private String maSanPham;

    private String loaiSanPham;

    private Long danhMucId;

    private String tenDanhMuc;

    private Long thuongHieuId;

    private String tenThuongHieu;

    private String anhChinh;

    private BigDecimal giaThapNhat;

    private BigDecimal giaCaoNhat;

    private Long tonKhoKhaDung;

    private Boolean conHang;

    private LocalDateTime ngayTao;
  }
}
