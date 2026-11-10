package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminDeliveryReturnRequest {

  @NotNull(message = "Vui lòng xác nhận đã nhận đủ hàng")
  @AssertTrue(message = "Phải xác nhận đã nhận đủ hàng")
  @JsonProperty("xac_nhan_da_nhan_du_hang")
  private Boolean xacNhanDaNhanDuHang;

  @NotBlank(message = "Vui lòng nhập lý do trả")
  @Size(max = 255, message = "Lý do trả tối đa 255 ký tự")
  @JsonProperty("ly_do_tra")
  private String lyDoTra;

  @NotBlank(message = "Vui lòng chọn hình thức hoàn tiền")
  @Pattern(
      regexp = "TIEN_MAT|CHUYEN_KHOAN",
      message = "Hình thức hoàn tiền chỉ nhận TIEN_MAT hoặc CHUYEN_KHOAN")
  @JsonProperty("hinh_thuc_hoan_tien")
  private String hinhThucHoanTien;

  @NotNull(message = "Vui lòng nhập thời điểm thực nhận")
  @PastOrPresent(message = "Thời điểm thực nhận không được nằm trong tương lai")
  @JsonProperty("thoi_diem_nhan")
  private OffsetDateTime thoiDiemNhan;

  @NotEmpty(message = "Danh sách hàng nhận không được rỗng")
  @Size(max = 1000, message = "Tối đa 1000 dòng hàng nhận")
  @Valid
  @JsonProperty("hang_nhan")
  private List<@NotNull Item> hangNhan;

  @NotEmpty(message = "Cần có ít nhất một ảnh bằng chứng")
  @Size(max = 50, message = "Tối đa 50 ảnh bằng chứng")
  @JsonProperty("bang_chung_urls")
  private List<
          @NotBlank(message = "Đường dẫn bằng chứng không được để trống")
          @Size(max = 2048, message = "Đường dẫn bằng chứng quá dài") String>
      bangChungUrls;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  @Getter
  @Setter
  public static class Item {

    @NotNull
    @Positive
    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @NotNull
    @Positive
    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @NotNull
    @Min(0)
    @JsonProperty("so_luong_nguyen_ven")
    private Integer soLuongNguyenVen;

    @NotNull
    @Min(0)
    @JsonProperty("so_luong_loi")
    private Integer soLuongLoi;

    @NotNull(message = "Phải gửi serials; hàng không serial gửi []")
    @Size(max = 10000)
    @Valid
    private List<@NotNull SerialItem> serials;

    /*
     * Chỉ sử dụng cho hàng không quản lý serial.
     * Với hàng quản lý serial, kết luận nằm trên từng serial.
     */
    @JsonProperty("du_dieu_kien_ban_lai")
    private Boolean duDieuKienBanLai;

    @Size(max = 2000, message = "Ghi chú kiểm tra tối đa 2000 ký tự")
    @JsonProperty("ghi_chu_kiem_tra")
    private String ghiChuKiemTra;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }

  @Getter
  @Setter
  public static class SerialItem {

    @NotNull
    @Positive
    @JsonProperty("so_serial_id")
    private Long soSerialId;

    @NotNull(message = "Phải kết luận điều kiện bán lại cho từng serial")
    @JsonProperty("du_dieu_kien_ban_lai")
    private Boolean duDieuKienBanLai;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }
}
