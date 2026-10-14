package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminReturnRefundRequest {

  @NotNull(message = "Phải xác nhận đã hoàn tiền")
  @AssertTrue(message = "Phải xác nhận đã hoàn tiền")
  @JsonProperty("xac_nhan_da_hoan_tien")
  private Boolean xacNhanDaHoanTien;

  @NotBlank(message = "Phương thức hoàn tiền không được để trống")
  @Pattern(
      regexp = "TIEN_MAT|CHUYEN_KHOAN",
      message = "Phương thức hoàn tiền chỉ nhận TIEN_MAT hoặc CHUYEN_KHOAN")
  @JsonProperty("phuong_thuc_hoan")
  private String phuongThucHoan;

  @NotNull(message = "Ngày hoàn tiền không được để trống")
  @PastOrPresent(message = "Ngày hoàn tiền không được nằm trong tương lai")
  @JsonProperty("ngay_hoan_tien")
  private OffsetDateTime ngayHoanTien;

  @Size(max = 255, message = "Mã giao dịch tối đa 255 ký tự")
  @JsonProperty("ma_giao_dich")
  private String maGiaoDich;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
