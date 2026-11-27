package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductUpdateResponse extends CatalogFields.Metadata {

  private Long id;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("loai_san_pham")
  private LoaiSanPham loaiSanPham;
}
