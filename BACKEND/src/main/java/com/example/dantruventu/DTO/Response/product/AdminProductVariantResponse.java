package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductVariantResponse {

  private Long id;

  @JsonProperty("san_pham_id")
  private Long sanPhamId;

  @JsonProperty("ten_phien_ban")
  private String tenPhienBan;

  @JsonProperty("gia_ban_le")
  private BigDecimal giaBanLe;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("ma_vach")
  private String maVach;

  @JsonProperty("gia_nhap")
  private BigDecimal giaNhap;

  @JsonProperty("khoi_luong")
  private BigDecimal khoiLuong;

  @JsonProperty("co_quan_ly_serial")
  private Boolean coQuanLySerial;

  @JsonProperty("thuoc_tinh_phien_ban")
  private List<CatalogFields.AttributeData> thuocTinhPhienBan;
}
