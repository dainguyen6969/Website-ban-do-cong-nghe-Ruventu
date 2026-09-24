// Complete row contract for the paginated admin product-list table.
package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.Enum.LoaiSanPham;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductListItemResponse {

  private Long id;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("loai_san_pham")
  private LoaiSanPham loaiSanPham;

  @JsonProperty("danh_muc_id")
  private Long danhMucId;

  @JsonProperty("ten_danh_muc")
  private String tenDanhMuc;

  @JsonProperty("thuong_hieu_id")
  private Long thuongHieuId;

  @JsonProperty("ten_thuong_hieu")
  private String tenThuongHieu;

  @JsonProperty("anh_chinh")
  private String anhChinh;

  @JsonProperty("so_phien_ban")
  private Integer soPhienBan;

  @JsonProperty("gia_ban_thap_nhat")
  private BigDecimal giaBanThapNhat;

  @JsonProperty("ton_co_the_ban")
  private Long tonCoTheBan;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
