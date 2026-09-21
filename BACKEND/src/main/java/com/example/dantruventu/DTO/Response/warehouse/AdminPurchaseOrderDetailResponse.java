package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderDetailResponse {

  private Long id;

  @JsonProperty("ma_don_nhap")
  private String maDonNhap;

  @JsonProperty("nha_cung_cap")
  private Supplier nhaCungCap;

  @JsonProperty("kho_hang")
  private Warehouse khoHang;

  @JsonProperty("ap_dung_thue")
  private Boolean apDungThue;

  @JsonProperty("thue_vat")
  private BigDecimal thueVat;

  @JsonProperty("tien_hang")
  private BigDecimal tienHang;

  @JsonProperty("tien_thue")
  private BigDecimal tienThue;

  @JsonProperty("tong_tien")
  private BigDecimal tongTien;

  @JsonProperty("trang_thai_nhap")
  private TrangThaiNhapHang trangThaiNhap;

  @JsonProperty("trang_thai_thanh_toan")
  private TrangThaiThanhToanNhap trangThaiThanhToan;

  @JsonProperty("so_tien_da_thanh_toan")
  private BigDecimal soTienDaThanhToan;

  @JsonProperty("so_tien_con_no")
  private BigDecimal soTienConNo;

  @JsonProperty("ngay_tao")
  private LocalDateTime ngayTao;

  private List<Item> items;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Supplier {

    private Long id;

    @JsonProperty("ma_nha_cung_cap")
    private String maNhaCungCap;

    @JsonProperty("ten_nha_cung_cap")
    private String tenNhaCungCap;

    @JsonProperty("so_dien_thoai")
    private String soDienThoai;

    private String email;

    @JsonProperty("dia_chi")
    private String diaChi;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Warehouse {

    private Long id;

    @JsonProperty("ma_kho")
    private String maKho;

    @JsonProperty("ten_kho")
    private String tenKho;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Item {

    private Long id;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("gia_nhap")
    private BigDecimal giaNhap;

    @JsonProperty("thanh_tien")
    private BigDecimal thanhTien;

    @JsonProperty("so_luong_da_nhap_kho")
    private Integer soLuongDaNhapKho;

    @JsonProperty("so_luong_da_tra")
    private Integer soLuongDaTra;

    @JsonProperty("quan_ly_serial")
    private Boolean quanLySerial;

    @JsonProperty("che_do_serial_da_xac_lap")
    private Boolean cheDoSerialDaXacLap;
  }
}
