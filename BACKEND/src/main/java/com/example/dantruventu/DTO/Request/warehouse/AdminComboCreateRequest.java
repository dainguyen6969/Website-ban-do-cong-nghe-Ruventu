package com.example.dantruventu.DTO.Request.warehouse;

import com.example.dantruventu.DTO.Request.product.ProductImageRequest;
import com.fasterxml.jackson.annotation.JsonAnySetter;
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
public class AdminComboCreateRequest {

  @JsonProperty("danh_muc_id")
  @NotNull(message = "Danh mục không được để trống")
  @Positive
  private Long danhMucId;

  @JsonProperty("thuong_hieu_id")
  @Positive
  private Long thuongHieuId;

  @JsonProperty("ten_san_pham")
  @NotBlank(message = "Tên combo không được để trống")
  @Size(max = 255)
  private String tenSanPham;

  @JsonProperty("ma_san_pham")
  @NotBlank(message = "Mã combo không được để trống")
  @Size(max = 50)
  private String maSanPham;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("thong_so_ky_thuat")
  private JsonNode thongSoKyThuat;

  @JsonProperty("gia_ban_le")
  @NotNull(message = "Giá bán không được để trống")
  @DecimalMin("0")
  @Digits(integer = 13, fraction = 2)
  private BigDecimal giaBanLe;

  @JsonProperty("gia_nhap")
  @DecimalMin("0")
  @Digits(integer = 13, fraction = 2)
  private BigDecimal giaNhap;

  @JsonProperty("ten_phien_ban")
  @Size(max = 255)
  private String tenPhienBan;

  @JsonProperty("ma_vach")
  @Size(max = 255)
  private String maVach;

  @JsonProperty("trang_thai_phien_ban")
  @Min(0)
  @Max(1)
  private Short trangThaiPhienBan;

  @JsonProperty("thue_vat")
  @DecimalMin("0")
  @DecimalMax("100")
  @Digits(integer = 3, fraction = 2)
  private BigDecimal thueVat;

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái không được để trống")
  @Min(0)
  @Max(1)
  private Short trangThai;

  @JsonProperty("anh_san_pham")
  @Size(max = 100)
  private List<@NotNull @Valid ProductImageRequest> anhSanPham;

  @JsonProperty("thanh_phan")
  @NotEmpty(message = "Combo phải có ít nhất một thành phần")
  @Size(max = 100)
  private List<@NotNull @Valid ComboComponentRequest> thanhPhan;

  @JsonAnySetter
  public void rejectUnknownField(String name, JsonNode value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
