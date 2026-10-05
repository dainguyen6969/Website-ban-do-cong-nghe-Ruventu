package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderPaymentRequest {

  @JsonProperty("so_tien_thanh_toan")
  @NotNull(message = "Số tiền thanh toán không được để trống")
  @DecimalMin(value = "0.01", message = "Số tiền thanh toán phải lớn hơn 0")
  @Digits(integer = 13, fraction = 2)
  private BigDecimal soTienThanhToan;

  @JsonProperty("phuong_thuc_thanh_toan")
  @NotBlank(message = "Phương thức thanh toán không được để trống")
  @Pattern(regexp = "TIEN_MAT|CHUYEN_KHOAN|THE", message = "Phương thức thanh toán không hợp lệ")
  private String phuongThucThanhToan;

  @JsonProperty("ghi_chu")
  private String ghiChu;

  @JsonProperty("ngay_thanh_toan")
  @NotNull(message = "Ngày thanh toán không được để trống")
  @PastOrPresent(message = "Ngày thanh toán không được nằm trong tương lai")
  private OffsetDateTime ngayThanhToan;

  @JsonProperty("xac_nhan_da_chi_tien")
  @NotNull(message = "Phải xác nhận đã chi tiền")
  @AssertTrue(message = "Phải xác nhận đã chi tiền")
  private Boolean xacNhanDaChiTien;
}
