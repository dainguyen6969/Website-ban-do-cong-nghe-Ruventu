package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

public final class CustomerCheckoutRequest {

  private CustomerCheckoutRequest() {}

  @Getter
  @Setter
  public static class Recipient {

    @NotBlank(message = "Tên người nhận không được để trống")
    @Size(max = 100, message = "Tên người nhận không được vượt quá 100 ký tự")
    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @NotBlank(message = "Số điện thoại người nhận không được để trống")
    @Pattern(
        regexp = "^(?:\\+84|0)[0-9]{9,10}$",
        message = "Số điện thoại không đúng định dạng")
    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @Size(max = 255, message = "Địa chỉ giao hàng không được vượt quá 255 ký tự")
    @JsonProperty("dia_chi_giao_hang")
    private String diaChiGiaoHang;
  }

  @Getter
  @Setter
  public static class Preview {

    @NotEmpty(message = "Phải chọn ít nhất một sản phẩm để thanh toán")
    @Size(max = 100, message = "Chỉ được chọn tối đa 100 sản phẩm")
    @JsonProperty("cart_item_ids")
    private List<@NotNull @Positive Long> cartItemIds;

    @NotBlank(message = "Hình thức nhận hàng không được để trống")
    @Pattern(
        regexp = "GIAO_HANG|NHAN_TAI_CUA_HANG",
        message = "Hình thức nhận hàng không hợp lệ")
    @JsonProperty("hinh_thuc_nhan_hang")
    private String hinhThucNhanHang;

    @Positive(message = "Địa chỉ không hợp lệ")
    @JsonProperty("dia_chi_id")
    private Long diaChiId;

    @Valid
    @JsonProperty("thong_tin_nguoi_nhan")
    private Recipient thongTinNguoiNhan;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    @Pattern(
        regexp = "TIEN_MAT|CHUYEN_KHOAN",
        message = "Phương thức thanh toán không hợp lệ")
    @JsonProperty("phuong_thuc_thanh_toan")
    private String phuongThucThanhToan;

    @Size(max = 50, message = "Mã chương trình không được vượt quá 50 ký tự")
    @JsonProperty("ma_chuong_trinh")
    private String maChuongTrinh;

    @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự")
    @JsonProperty("ghi_chu")
    private String ghiChu;
  }

  @Getter
  @Setter
  public static class Checkout extends Preview {

    @NotNull(message = "Tổng thanh toán xác nhận không được để trống")
    @jakarta.validation.constraints.DecimalMin(
        value = "0",
        message = "Tổng thanh toán xác nhận không được âm")
    @jakarta.validation.constraints.Digits(
        integer = 13,
        fraction = 2,
        message = "Tổng thanh toán xác nhận không hợp lệ")
    @JsonProperty("tong_thanh_toan_xac_nhan")
    private BigDecimal tongThanhToanXacNhan;
  }
}
