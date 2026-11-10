package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminReturnInspectionRequest {

  @NotNull(message = "Vui lòng nhập thời điểm thực tiếp nhận")
  @PastOrPresent(message = "Thời điểm thực tiếp nhận không được ở tương lai")
  @JsonFormat(without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
  @JsonProperty("ngay_tiep_nhan_thuc_te")
  private OffsetDateTime ngayTiepNhanThucTe;

  @NotBlank(message = "Vui lòng nhập người giao hàng")
  @JsonProperty("nguoi_giao")
  private String nguoiGiao;

  @NotEmpty(message = "Vui lòng gửi danh sách hàng thực nhận")
  @Size(max = 1000, message = "Tối đa 1000 mục thực nhận mỗi lần")
  @JsonProperty("hang_thuc_nhan")
  private List<@NotNull @Valid Item> hangThucNhan;

  @NotBlank(message = "Vui lòng ghi nhận kết quả kiểm tra")
  @JsonProperty("ket_qua_kiem_tra")
  private String ketQuaKiemTra;

  @NotEmpty(message = "Vui lòng cung cấp bằng chứng tiếp nhận")
  @JsonProperty("bang_chung_urls")
  private List<@NotBlank(message = "Đường dẫn bằng chứng không được để trống") String>
      bangChungUrls;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  @Getter
  @Setter
  public static class Item {

    @NotNull(message = "Vui lòng chọn chi tiết phiếu trả")
    @Positive(message = "Chi tiết phiếu trả không hợp lệ")
    @JsonProperty("chi_tiet_tra_hang_id")
    private Long chiTietTraHangId;

    @Positive(message = "Thiết bị không hợp lệ; dùng null nếu chưa xác minh")
    @JsonProperty("thiet_bi_id")
    private Long thietBiId;

    @NotNull(message = "Vui lòng nhập số lượng thực nhận")
    @Positive(message = "Số lượng thực nhận phải là số nguyên dương")
    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("so_serial")
    private String soSerial;

    @JsonProperty("dau_hieu_nhan_dang")
    private String dauHieuNhanDang;

    @NotBlank(message = "Vui lòng mô tả tình trạng thực nhận")
    @JsonProperty("tinh_trang")
    private String tinhTrang;

    @NotNull(message = "Danh sách phụ kiện không được là null; dùng [] nếu không có")
    @JsonProperty("phu_kien")
    private List<@NotBlank(message = "Tên phụ kiện không được để trống") String> phuKien =
        List.of();

    public void setChiTietTraHangId(Object value) {
      this.chiTietTraHangId = integer(value, "Chi tiết phiếu trả");
    }

    public void setThietBiId(Object value) {
      this.thietBiId = integer(value, "Thiết bị");
    }

    public void setSoLuong(Object value) {
      Long number = integer(value, "Số lượng thực nhận");
      try {
        this.soLuong = number == null ? null : Math.toIntExact(number);
      } catch (ArithmeticException exception) {
        throw new IllegalArgumentException("Số lượng thực nhận vượt giới hạn", exception);
      }
    }

    private static Long integer(Object value, String label) {
      if (value == null) return null;
      if (!(value instanceof Number number)) {
        throw new IllegalArgumentException(label + " phải là số nguyên");
      }
      try {
        return new BigDecimal(number.toString()).longValueExact();
      } catch (ArithmeticException | NumberFormatException exception) {
        throw new IllegalArgumentException(label + " phải là số nguyên hợp lệ", exception);
      }
    }

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường mục thực nhận không được hỗ trợ: " + name);
    }
  }
}
