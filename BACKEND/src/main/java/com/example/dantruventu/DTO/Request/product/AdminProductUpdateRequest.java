package com.example.dantruventu.DTO.Request.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;
import tools.jackson.databind.JsonNode;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductUpdateRequest {

  @JsonProperty("danh_muc_id")
  @NotNull(message = "Danh mục không được để trống")
  private Long danhMucId;

  @JsonProperty("thuong_hieu_id")
  private Long thuongHieuId;

  @JsonProperty("ten_san_pham")
  @NotBlank(message = "Tên sản phẩm không được để trống")
  private String tenSanPham;

  @JsonProperty("ma_san_pham")
  @NotBlank(message = "Mã sản phẩm không được để trống")
  private String maSanPham;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("thong_so_ky_thuat")
  private JsonNode thongSoKyThuat;

  @JsonProperty("thue_vat")
  @DecimalMin(value = "0", message = "Thuế VAT không được âm")
  @DecimalMax(value = "100", message = "Thuế VAT không hợp lệ")
  private BigDecimal thueVat;

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái không được để trống")
  @Min(0)
  @Max(1)
  private Short trangThai;

  @JsonProperty("anh_san_pham")
  private List<@Valid ProductImageRequest> anhSanPham;
}
