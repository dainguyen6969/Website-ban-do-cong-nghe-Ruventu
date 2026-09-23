package com.example.dantruventu.DTO.Request.product;

import com.example.dantruventu.Enum.LoaiSanPham;
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
public class AdminProductCreateRequest {

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

  @JsonProperty("loai_san_pham")
  @NotNull(message = "Loại sản phẩm không được để trống")
  private LoaiSanPham loaiSanPham;

  @JsonProperty("thue_vat")
  @DecimalMin(value = "0", message = "Thuế VAT không được âm")
  @DecimalMax(value = "100", message = "Thuế VAT không hợp lệ")
  private BigDecimal thueVat;

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái sản phẩm không được để trống")
  @Min(value = 0, message = "Trạng thái không hợp lệ")
  @Max(value = 1, message = "Trạng thái không hợp lệ")
  private Short trangThai;

  @Valid
  @JsonProperty("anh_san_pham")
  private List<ProductImageRequest> anhSanPham;

  @Valid
  @NotEmpty(message = "Sản phẩm phải có ít nhất một phiên bản")
  @JsonProperty("danh_sach_phien_ban")
  private List<ProductVariantCreateRequest> danhSachPhienBan;
}
