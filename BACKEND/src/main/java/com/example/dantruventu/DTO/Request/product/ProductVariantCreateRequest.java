package com.example.dantruventu.DTO.Request.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantCreateRequest {

  @JsonProperty("ten_phien_ban")
  @NotBlank(message = "Tên phiên bản không được để trống")
  private String tenPhienBan;

  @JsonProperty("ma_vach")
  @NotBlank(message = "Mã vạch không được để trống")
  private String maVach;

  @JsonProperty("gia_ban_le")
  @NotNull(message = "Giá bán lẻ không được để trống")
  @DecimalMin(value = "0", inclusive = false, message = "Giá bán lẻ phải lớn hơn 0")
  private BigDecimal giaBanLe;

  @JsonProperty("gia_nhap")
  @NotNull(message = "Giá nhập không được để trống")
  @DecimalMin(value = "0", message = "Giá nhập không được âm")
  private BigDecimal giaNhap;

  @JsonProperty("khoi_luong")
  @DecimalMin(value = "0", message = "Khối lượng không được âm")
  private BigDecimal khoiLuong;

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái phiên bản không được để trống")
  @Min(value = 0, message = "Trạng thái không hợp lệ")
  @Max(value = 1, message = "Trạng thái không hợp lệ")
  private Short trangThai;
}
