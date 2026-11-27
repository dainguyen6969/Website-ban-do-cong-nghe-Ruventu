package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductCreateResponse extends CatalogFields.Metadata {

  private Long id;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("danh_sach_phien_ban")
  private List<AdminProductVariantResponse> danhSachPhienBan;

  @JsonProperty("loai_san_pham")
  private com.example.dantruventu.Enum.LoaiSanPham loaiSanPham;
}
