package com.example.dantruventu.DTO.Request.warehouse;

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
public class AdminComboUpdateRequest {

  @JsonProperty("ten_san_pham")
  @NotBlank(message = "Tên combo không được để trống")
  @Size(max = 255)
  private String tenSanPham;

  @JsonProperty("ma_san_pham")
  @NotBlank(message = "Mã combo không được để trống")
  @Size(max = 50)
  private String maSanPham;

  @JsonProperty("khoi_luong")
  @NotNull
  @DecimalMin("0")
  @Digits(integer = 8, fraction = 2)
  private BigDecimal khoiLuong;

  @JsonProperty("gia_ban_le")
  @NotNull
  @DecimalMin("0")
  @Digits(integer = 13, fraction = 2)
  private BigDecimal giaBanLe;

  @JsonProperty("gia_nhap")
  @DecimalMin("0")
  @Digits(integer = 13, fraction = 2)
  private BigDecimal giaNhap;

  @JsonProperty("trang_thai")
  @NotNull
  @Min(0)
  @Max(1)
  private Short trangThai;

  @JsonProperty("thanh_phan")
  @NotEmpty(message = "Combo phải có ít nhất một thành phần")
  @Size(max = 100)
  private List<@NotNull @Valid ComboComponentRequest> thanhPhan;

  @JsonAnySetter
  public void rejectUnknownField(String name, JsonNode value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
