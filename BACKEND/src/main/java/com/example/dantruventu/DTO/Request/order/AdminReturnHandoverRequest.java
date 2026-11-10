package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminReturnHandoverRequest {

  @NotNull(message = "Vui lòng xác nhận đã trả đủ hàng")
  @AssertTrue(message = "Phải xác nhận đã trả đủ hàng")
  @JsonProperty("xac_nhan_tra_du_hang")
  private Boolean xacNhanTraDuHang;

  @NotBlank(message = "Vui lòng nhập tên người nhận")
  @JsonProperty("ten_nguoi_nhan")
  private String tenNguoiNhan;

  @NotBlank(message = "Vui lòng nhập số điện thoại người nhận")
  @JsonProperty("sdt_nguoi_nhan")
  private String sdtNguoiNhan;

  @NotNull(message = "Vui lòng nhập thời điểm bàn giao thực tế")
  @PastOrPresent(message = "Thời điểm bàn giao không được ở tương lai")
  @JsonFormat(without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
  @JsonProperty("ngay_ban_giao")
  private OffsetDateTime ngayBanGiao;

  @NotEmpty(message = "Vui lòng gửi danh sách hàng đã bàn giao")
  @JsonProperty("hang_ban_giao")
  private List<@NotNull(message = "Mục bàn giao không hợp lệ") @Valid Item> hangBanGiao;

  @NotEmpty(message = "Vui lòng cung cấp bằng chứng bàn giao")
  @JsonProperty("bang_chung_urls")
  private List<@NotBlank(message = "Đường dẫn bằng chứng không được để trống") String>
      bangChungUrls;

  public void setXacNhanTraDuHang(Object value) {
    if (value != null && !(value instanceof Boolean)) {
      throw new IllegalArgumentException("Xác nhận trả đủ hàng phải là boolean");
    }
    this.xacNhanTraDuHang = (Boolean) value;
  }

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  @Getter
  @Setter
  public static class Item {

    @NotBlank(message = "Vui lòng chọn mã mục nhận")
    @JsonProperty("ma_muc_nhan")
    private String maMucNhan;

    @NotNull(message = "Vui lòng nhập số lượng bàn giao")
    @Positive(message = "Số lượng bàn giao phải là số nguyên dương")
    @JsonProperty("so_luong")
    private Integer soLuong;

    @NotBlank(message = "Vui lòng ghi nhận tình trạng hàng bàn giao")
    @JsonProperty("tinh_trang")
    private String tinhTrang;

    @NotNull(message = "Danh sách phụ kiện không được là null; dùng [] nếu không có")
    @JsonProperty("phu_kien")
    private List<@NotBlank(message = "Tên phụ kiện không được để trống") String> phuKien =
        List.of();

    public void setSoLuong(Object value) {
      if (value == null) {
        this.soLuong = null;
        return;
      }
      if (!(value instanceof Number number)) {
        throw new IllegalArgumentException("Số lượng bàn giao phải là số nguyên");
      }
      try {
        this.soLuong = new BigDecimal(number.toString()).intValueExact();
      } catch (ArithmeticException | NumberFormatException exception) {
        throw new IllegalArgumentException("Số lượng bàn giao phải là số nguyên hợp lệ", exception);
      }
    }

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường mục bàn giao không được hỗ trợ: " + name);
    }
  }
}
