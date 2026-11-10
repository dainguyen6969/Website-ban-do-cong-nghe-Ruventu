package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComboListItemResponse extends CatalogFields.Metadata {

  private Long id;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("thanh_phan")
  private List<ComboComponentResponse> thanhPhan;

  @JsonProperty("gia_ban")
  private BigDecimal giaBan;

  @JsonProperty("ton_co_the_ban")
  private Long tonCoTheBan;

  @JsonProperty("ton_thuc_te")
  private Long tonThucTe;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("loai_san_pham")
  private LoaiSanPham loaiSanPham;

  @JsonProperty("anh_chinh")
  private String anhChinh;
}
