package com.example.dantruventu.DTO.Request.product;

import com.example.dantruventu.DTO.catalog.CatalogFields.AttributeInput;
import com.example.dantruventu.Error.CatalogException;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
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
public class ProductVariantCreateRequest {

  @JsonProperty("ten_phien_ban")
  @NotBlank(message = "Tên phiên bản không được để trống")
  @Size(max = 150)
  private String tenPhienBan;

  @JsonProperty("ma_vach")
  @Size(max = 50)
  private String maVach;

  @JsonProperty("gia_ban_le")
  @NotNull(message = "Giá bán lẻ không được để trống")
  @DecimalMin(value = "0", inclusive = false)
  @Digits(integer = 13, fraction = 2)
  private BigDecimal giaBanLe;

  @JsonProperty("gia_nhap")
  @NotNull(message = "Giá nhập không được để trống")
  @DecimalMin("0")
  @Digits(integer = 13, fraction = 2)
  private BigDecimal giaNhap;

  @JsonProperty("khoi_luong")
  @DecimalMin("0")
  @Digits(integer = 8, fraction = 2)
  private BigDecimal khoiLuong;

  @JsonProperty("trang_thai")
  @NotNull
  @Min(0)
  @Max(1)
  private Short trangThai;

  @Setter(AccessLevel.NONE)
  @JsonProperty("co_quan_ly_serial")
  @NotNull(message = "Phải chọn chế độ quản lý serial")
  private Boolean coQuanLySerial;

  @Builder.Default
  @JsonProperty("thuoc_tinh_phien_ban")
  @NotNull(message = "thuoc_tinh_phien_ban không được null")
  @Size(max = 100)
  private List<@NotNull @Valid AttributeInput> thuocTinhPhienBan = List.of();

  @JsonSetter("co_quan_ly_serial")
  public void readSerialMode(JsonNode value) {
    if (value == null || !value.isBoolean()) {
      throw CatalogException.bad(
          "co_quan_ly_serial", "INVALID_SERIAL_MODE", "co_quan_ly_serial phải là true hoặc false");
    }
    coQuanLySerial = value.booleanValue();
  }
}
