package com.example.dantruventu.DTO.Request.order;

import com.example.dantruventu.Enum.TrangThaiSerial;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.ArrayList;
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

  @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
  @JsonProperty("ghi_chu")
  private String ghiChu;

  @NotEmpty(message = "Danh sách hàng nhận không được rỗng")
  @Size(max = 1000, message = "Tối đa 1000 dòng hàng nhận")
  @Valid
  @JsonProperty("hang_nhan")
  private List<@NotNull Item> hangNhan;

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
    @Positive
    @JsonProperty("kho_hang_id")
    private Long khoHangId;

    @NotNull
    @Min(0)
    @JsonProperty("so_luong_nguyen_ven")
    private Integer soLuongNguyenVen;

    @NotNull
    @Min(0)
    @JsonProperty("so_luong_loi")
    private Integer soLuongLoi;

    @NotNull @Valid private List<@NotNull SerialItem> serials = new ArrayList<>();

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

    @NotNull
    @JsonProperty("trang_thai_sau_nhan")
    private TrangThaiSerial trangThaiSauNhan;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }
}
