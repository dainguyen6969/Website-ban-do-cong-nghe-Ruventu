package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
  private BigDecimal soTienThanhToan;

  @JsonProperty("phuong_thuc_thanh_toan")
  @NotBlank(message = "Phương thức thanh toán không được để trống")
  private String phuongThucThanhToan;

  @JsonProperty("ghi_chu")
  private String ghiChu;

  @JsonProperty("ngay_thanh_toan")
  @NotNull(message = "Ngày thanh toán không được để trống")
  private OffsetDateTime ngayThanhToan;

  @JsonProperty("xac_nhan_da_chi_tien")
  @AssertTrue(message = "Phải xác nhận đã chi tiền")
  private Boolean xacNhanDaChiTien;
}
