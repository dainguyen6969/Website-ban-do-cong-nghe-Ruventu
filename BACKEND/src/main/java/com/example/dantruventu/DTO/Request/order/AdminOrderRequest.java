package com.example.dantruventu.DTO.Request.order;

import com.example.dantruventu.Enum.TrangThaiDongGoi;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

public final class AdminOrderRequest {

  private AdminOrderRequest() {}

  @Getter
  @Setter
  public static class Confirm extends AdminSalesRequest.StrictRequest {

    @NotNull
    @AssertTrue(message = "Phải xác nhận thao tác")
    @JsonProperty("xac_nhan")
    private Boolean xacNhan;
  }

  @Getter
  @Setter
  public static class Fulfillment extends Confirm {

    @Positive
    @JsonProperty("doi_tac_van_chuyen_id")
    private Long doiTacVanChuyenId;

    @DecimalMin("0")
    @Digits(integer = 13, fraction = 0)
    @JsonProperty("phi_tra_doi_tac")
    private BigDecimal phiTraDoiTac;
  }

  @Getter
  @Setter
  public static class Packing extends AdminSalesRequest.StrictRequest {

    @NotNull
    @JsonProperty("trang_thai_dong_goi")
    private TrangThaiDongGoi trangThaiDongGoi;
  }

  @Getter
  @Setter
  public static class SerialGroup extends AdminSalesRequest.StrictRequest {

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
  public static class ExportItem extends AdminSalesRequest.StrictRequest {

    @NotNull
    @Positive
    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @NotNull
    @Valid
    @Size(max = 1000)
    private List<@NotNull SerialGroup> serials;
  }

  @Getter
  @Setter
  public static class Export extends AdminSalesRequest.StrictRequest {

    @NotNull
    @Positive
    @JsonProperty("kho_hang_id")
    private Long khoHangId;

    @NotEmpty
    @Valid
    @Size(max = 1000)
    private List<@NotNull ExportItem> items;
  }

  @Getter
  @Setter
  public static class Payment extends AdminSalesRequest.StrictRequest {

    @NotBlank
    @Pattern(regexp = "KHACH_HANG|DOI_TAC_GIAO_HANG")
    @JsonProperty("nguon_thu")
    private String nguonThu;

    @Positive
    @JsonProperty("phieu_giao_hang_id")
    private Long phieuGiaoHangId;

    @NotBlank
    @Pattern(regexp = "TIEN_MAT|CHUYEN_KHOAN|THE")
    @JsonProperty("phuong_thuc_thanh_toan")
    private String phuongThucThanhToan;

    @NotNull
    @Positive
    @Digits(integer = 13, fraction = 0)
    @JsonProperty("so_tien_thanh_toan")
    private BigDecimal soTienThanhToan;

    @NotNull
    @PastOrPresent
    @JsonProperty("ngay_thanh_toan")
    private OffsetDateTime ngayThanhToan;

    @Size(max = 255)
    @JsonProperty("ma_giao_dich_thanh_toan")
    private String maGiaoDichThanhToan;

    @NotNull
    @AssertTrue(message = "Phải xác nhận cửa hàng đã nhận tiền")
    @JsonProperty("xac_nhan_da_nhan_tien")
    private Boolean xacNhanDaNhanTien;
  }

  @Getter
  @Setter
  public static class Cancel extends AdminSalesRequest.StrictRequest {

    @NotBlank
    @Size(max = 255)
    @JsonProperty("ly_do")
    private String lyDo;
  }

  @Getter
  @Setter
  public static class Pickup extends AdminSalesRequest.StrictRequest {

    @NotNull
    @AssertTrue(message = "Phải xác nhận khách đã nhận hàng")
    @JsonProperty("xac_nhan_da_nhan_hang")
    private Boolean xacNhanDaNhanHang;
  }

  @Getter
  @Setter
  public static class Refund extends AdminSalesRequest.StrictRequest {

    @NotNull
    @AssertTrue(message = "Phải xác nhận đã hoàn tiền")
    @JsonProperty("xac_nhan_da_hoan_tien")
    private Boolean xacNhanDaHoanTien;

    @NotBlank
    @Pattern(regexp = "TIEN_MAT|CHUYEN_KHOAN|THE")
    @JsonProperty("phuong_thuc_hoan")
    private String phuongThucHoan;

    @NotNull
    @PastOrPresent
    @JsonProperty("ngay_hoan_tien")
    private OffsetDateTime ngayHoanTien;

    @Size(max = 255)
    @JsonProperty("ma_giao_dich")
    private String maGiaoDich;
  }
}
