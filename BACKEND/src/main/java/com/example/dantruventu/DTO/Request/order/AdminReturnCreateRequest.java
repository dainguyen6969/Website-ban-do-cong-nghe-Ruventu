package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminReturnCreateRequest {

  @NotNull(message = "Đơn hàng không được để trống")
  @Positive(message = "Đơn hàng không hợp lệ")
  @JsonProperty("don_hang_id")
  private Long donHangId;

  @NotBlank(message = "Lý do trả hàng không được để trống")
  @Size(max = 255, message = "Lý do trả hàng tối đa 255 ký tự")
  @JsonProperty("ly_do_tra")
  private String lyDoTra;

  @NotBlank(message = "Hình thức hoàn tiền không được để trống")
  @Pattern(
      regexp = "TIEN_MAT|CHUYEN_KHOAN",
      message = "Hình thức hoàn tiền chỉ nhận TIEN_MAT hoặc CHUYEN_KHOAN")
  @JsonProperty("hinh_thuc_hoan_tien")
  private String hinhThucHoanTien;

  @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
  @JsonProperty("ghi_chu")
  private String ghiChu;

  @NotEmpty(message = "Phải chọn ít nhất một sản phẩm trả")
  @Size(max = 1000, message = "Tối đa 1000 dòng sản phẩm trả")
  @Valid
  @JsonProperty("chi_tiet_tra")
  private List<@NotNull ReturnLine> chiTietTra;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  @Getter
  @Setter
  public static class ReturnLine {

    @NotNull(message = "Chi tiết đơn hàng không được để trống")
    @Positive(message = "Chi tiết đơn hàng không hợp lệ")
    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @NotNull(message = "Số lượng trả không được để trống")
    @Positive(message = "Số lượng trả phải là số nguyên dương")
    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }
}
