package com.example.dantruventu.DTO.Request.product;

import com.example.dantruventu.DTO.catalog.CatalogFields.AttributeInput;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Error.CatalogException;
import com.fasterxml.jackson.annotation.JsonIgnore;
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

  @Setter(AccessLevel.NONE)
  @JsonProperty("kich_thuoc_dong_goi")
  private PhienBanSanPham.KichThuocDongGoi kichThuocDongGoi;

  @JsonIgnore
  @Setter(AccessLevel.NONE)
  private boolean daGuiKichThuocDongGoi;

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

  @JsonSetter("kich_thuoc_dong_goi")
  public void readPackageDimensions(JsonNode value) {
    kichThuocDongGoi =
        value == null || value.isNull()
            ? null
            : new PhienBanSanPham.KichThuocDongGoi(
                packageCm(value.get("dai_cm")),
                packageCm(value.get("rong_cm")),
                packageCm(value.get("cao_cm")));
    daGuiKichThuocDongGoi = true;
  }

  private int packageCm(JsonNode value) {
    if (value == null
        || !value.isIntegralNumber()
        || !value.canConvertToInt()
        || value.intValue() <= 0) {
      throw CatalogException.bad(
          "kich_thuoc_dong_goi",
          "INVALID_PACKAGE_DIMENSIONS",
          "Nhập đủ dài, rộng, cao bằng số nguyên dương (cm)");
    }
    return value.intValue();
  }

  @JsonSetter("co_quan_ly_serial")
  public void readSerialMode(JsonNode value) {
    if (value == null || !value.isBoolean()) {
      throw CatalogException.bad(
          "co_quan_ly_serial", "INVALID_SERIAL_MODE", "co_quan_ly_serial phải là true hoặc false");
    }
    coQuanLySerial = value.booleanValue();
  }
}
