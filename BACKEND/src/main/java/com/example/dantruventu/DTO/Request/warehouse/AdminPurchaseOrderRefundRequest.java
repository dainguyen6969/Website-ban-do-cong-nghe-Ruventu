package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderRefundRequest {

  @JsonProperty("xac_nhan_da_nhan_tien")
  @NotNull(message = "Phải xác nhận đã nhận tiền NCC hoàn")
  @AssertTrue(message = "Phải xác nhận đã nhận tiền NCC hoàn")
  private Boolean xacNhanDaNhanTien;

  @JsonProperty("phuong_thuc_hoan")
  @NotBlank(message = "Phương thức hoàn tiền không được để trống")
  @Pattern(regexp = "TIEN_MAT|CHUYEN_KHOAN|THE", message = "Phương thức hoàn tiền không hợp lệ")
  private String phuongThucHoan;

  @JsonProperty("ngay_nhan_tien")
  @NotNull(message = "Ngày nhận tiền không được để trống")
  @PastOrPresent(message = "Ngày nhận tiền không được nằm trong tương lai")
  private OffsetDateTime ngayNhanTien;

  @JsonProperty("ma_giao_dich")
  @Size(max = 255, message = "Mã giao dịch không được vượt quá 255 ký tự")
  private String maGiaoDich;

  @JsonProperty("ghi_chu")
  @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự")
  private String ghiChu;
}
