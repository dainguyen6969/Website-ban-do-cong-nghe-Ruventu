package com.example.dantruventu.DTO.Request.order;

import com.example.dantruventu.Enum.LoaiDonHang;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

public final class AdminSalesRequest {

  private AdminSalesRequest() {}

  public abstract static class StrictRequest {

    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }

  @Getter
  @Setter
  public static class Tax extends StrictRequest {

    @NotNull
    @JsonProperty("ap_dung")
    private Boolean apDung;

    @NotBlank
    @Pattern(regexp = "CHUA_BAO_GOM|DA_BAO_GOM")
    @JsonProperty("che_do_gia")
    private String cheDoGia;
  }

  @Getter
  @Setter
  public static class Line extends StrictRequest {

    @Size(max = 40)
    @JsonProperty("ma_dong")
    private String maDong;

    @NotNull
    @Positive
    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @NotNull
    @Min(1)
    @Max(100000)
    @JsonProperty("so_luong")
    private Integer soLuong;
  }

  @Getter
  @Setter
  public abstract static class Base extends StrictRequest {

    @Positive
    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @NotNull
    @Positive
    @JsonProperty("kho_hang_id")
    private Long khoHangId;

    @NotBlank
    @JsonProperty("bang_gia")
    private String bangGia = "BAN_LE";

    @NotNull @Valid private Tax thue;

    @Size(max = 50)
    @JsonProperty("ma_chuong_trinh")
    private String maChuongTrinh;

    @NotEmpty
    @Size(max = 100)
    @Valid
    @JsonProperty("san_pham")
    private List<@NotNull Line> sanPham;

    @NotNull
    @DecimalMin("0")
    @Digits(integer = 13, fraction = 2)
    @JsonProperty("phi_giao_hang")
    private BigDecimal phiGiaoHang = BigDecimal.ZERO;

    @Size(max = 2000)
    @JsonProperty("ghi_chu")
    private String ghiChu;
  }

  @Getter
  @Setter
  public static class Preview extends Base {

    @NotNull
    @JsonProperty("loai_don_hang")
    private LoaiDonHang loaiDonHang;
  }

  @Getter
  @Setter
  public static class Recipient extends StrictRequest {

    @NotBlank
    @Size(max = 100)
    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @NotBlank
    @Pattern(regexp = "^(?:\\+84|0)[0-9]{9,10}$")
    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @Size(max = 255)
    @JsonProperty("dia_chi_giao_hang")
    private String diaChiGiaoHang;
  }

  @Getter
  @Setter
  public static class Online extends Base {

    @NotNull
    @Valid
    @JsonProperty("thong_tin_nguoi_nhan")
    private Recipient thongTinNguoiNhan;

    @NotBlank
    @Pattern(regexp = "TIEN_MAT|CHUYEN_KHOAN")
    @JsonProperty("phuong_thuc_thanh_toan")
    private String phuongThucThanhToan;

    @NotBlank
    @Pattern(regexp = "NHAN_TAI_CUA_HANG|GIAO_HANG")
    @JsonProperty("hinh_thuc_nhan_hang")
    private String hinhThucNhanHang;

    @NotNull
    @DecimalMin("0")
    @Digits(integer = 13, fraction = 2)
    @JsonProperty("tong_thanh_toan_xac_nhan")
    private BigDecimal tongThanhToanXacNhan;
  }

  @Getter
  @Setter
  public static class Allocation extends StrictRequest {

    @NotBlank
    @Size(max = 80)
    @JsonProperty("ma_dong")
    private String maDong;

    @NotNull
    @Positive
    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @NotNull
    @Size(max = 10000)
    @JsonProperty("serial_ids")
    private List<@NotNull @Positive Long> serialIds;
  }

  @Getter
  @Setter
  public static class Payment extends StrictRequest {

    @NotBlank
    @Pattern(regexp = "TIEN_MAT|CHUYEN_KHOAN|THE")
    @JsonProperty("phuong_thuc")
    private String phuongThuc;

    @DecimalMin("0")
    @Digits(integer = 13, fraction = 2)
    @JsonProperty("tien_khach_dua")
    private BigDecimal tienKhachDua;

    @DecimalMin("0")
    @Digits(integer = 13, fraction = 2)
    @JsonProperty("so_tien_da_nhan")
    private BigDecimal soTienDaNhan;

    @NotNull
    @PastOrPresent
    @JsonProperty("ngay_thanh_toan")
    private OffsetDateTime ngayThanhToan;

    @Size(max = 255)
    @JsonProperty("ma_giao_dich")
    private String maGiaoDich;

    @NotNull
    @AssertTrue(message = "Phải xác nhận đã nhận tiền từ khách")
    @JsonProperty("xac_nhan_da_nhan_tien")
    private Boolean xacNhanDaNhanTien;
  }

  @Getter
  @Setter
  public static class Pos extends Base {

    @Positive
    @JsonProperty("nhan_vien_id")
    private Long nhanVienId;

    @NotNull
    @Valid
    @Size(max = 1000)
    @JsonProperty("phan_bo_serial")
    private List<@NotNull Allocation> phanBoSerial = new ArrayList<>();

    @NotNull
    @DecimalMin("0")
    @Digits(integer = 13, fraction = 2)
    @JsonProperty("tong_thanh_toan_xac_nhan")
    private BigDecimal tongThanhToanXacNhan;

    @NotNull
    @Valid
    @JsonProperty("thanh_toan")
    private Payment thanhToan;
  }
}
