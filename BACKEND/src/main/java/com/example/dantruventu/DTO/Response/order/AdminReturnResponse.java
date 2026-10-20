package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashVoucherResponse;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class AdminReturnResponse {

  private AdminReturnResponse() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class RefundResponse {

    private Long id;

    @JsonProperty("ma_tra_hang")
    private String maTraHang;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("hinh_thuc_hoan_tien")
    private String hinhThucHoanTien;

    @JsonProperty("phieu_chi")
    private CashVoucherResponse phieuChi;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ReceiveResponse {

    private Long id;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("hang_da_nhan")
    private List<ReceivedItem> hangDaNhan;

    @JsonProperty("don_hang")
    private ReceivedOrder donHang;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ReceivedItem {

    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("kho_hang_id")
    private Long khoHangId;

    @JsonProperty("so_luong_nguyen_ven")
    private Integer soLuongNguyenVen;

    @JsonProperty("so_luong_loi")
    private Integer soLuongLoi;

    private List<ReceivedSerial> serials;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ReceivedSerial {

    @JsonProperty("so_serial_id")
    private Long soSerialId;

    @JsonProperty("trang_thai")
    private TrangThaiSerial trangThai;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("don_hang_id")
    private Long donHangId;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ReceivedOrder {

    private Long id;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class DetailResponse {

    private Long id;

    @JsonProperty("ma_tra_hang")
    private String maTraHang;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("don_hang")
    private OrderSummary donHang;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("khach_hang")
    private CustomerSummary khachHang;

    @JsonProperty("chi_tiet_tra")
    private List<DetailReturnLine> chiTietTra;

    @JsonProperty("tong_so_luong")
    private Integer tongSoLuong;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("hinh_thuc_hoan_tien")
    private String hinhThucHoanTien;

    @JsonProperty("ly_do_tra")
    private String lyDoTra;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("ghi_chu")
    private String ghiChu;

    @JsonProperty("ngay_tao")
    private LocalDateTime ngayTao;

    @JsonProperty("can_nhan_hang")
    private boolean canNhanHang;

    @JsonProperty("can_hoan_tien")
    private boolean canHoanTien;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class DetailReturnLine {

    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("ma_san_pham")
    private String maSanPham;

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("don_gia_hoan")
    private BigDecimal donGiaHoan;

    @JsonProperty("thanh_tien_hoan")
    private BigDecimal thanhTienHoan;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class CreateResponse {

    private Long id;

    @JsonProperty("ma_tra_hang")
    private String maTraHang;

    @JsonProperty("don_hang_id")
    private Long donHangId;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("chi_tiet_tra")
    private List<ReturnLine> chiTietTra;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ReturnLine {

    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("don_gia_hoan")
    private BigDecimal donGiaHoan;

    @JsonProperty("thanh_tien_hoan")
    private BigDecimal thanhTienHoan;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibleOrderListResponse {

    private List<EligibleOrderItem> items;

    private PaginationResponse pagination;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibleOrderItem {

    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("loai_don_hang")
    private LoaiDonHang loaiDonHang;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("khach_hang")
    private CustomerSummary khachHang;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;

    @JsonProperty("ngay_tao")
    private LocalDateTime ngayTao;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibleOrderDetailResponse {

    @JsonProperty("don_hang")
    private EligibleOrderSummary donHang;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("khach_hang")
    private CustomerSummary khachHang;

    @JsonProperty("san_pham")
    private List<EligibleOrderLine> sanPham;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibleOrderSummary {

    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("tong_tien_hang")
    private BigDecimal tongTienHang;

    @JsonProperty("tien_chiet_khau")
    private BigDecimal tienChietKhau;

    @JsonProperty("phi_giao_hang")
    private BigDecimal phiGiaoHang;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibleOrderLine {

    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("ma_san_pham")
    private String maSanPham;

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("don_gia_mua")
    private BigDecimal donGiaMua;

    @JsonProperty("so_luong_mua")
    private Integer soLuongMua;

    @JsonProperty("so_luong_da_yeu_cau_tra")
    private Long soLuongDaYeuCauTra;

    @JsonProperty("so_luong_con_duoc_tra")
    private Long soLuongConDuocTra;

    @JsonProperty("don_gia_hoan")
    private BigDecimal donGiaHoan;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ListResponse {

    private List<ListItem> items;

    private PaginationResponse pagination;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ListItem {

    private Long id;

    @JsonProperty("ma_tra_hang")
    private String maTraHang;

    @JsonProperty("don_hang")
    private OrderSummary donHang;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("khach_hang")
    private CustomerSummary khachHang;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("hinh_thuc_hoan_tien")
    private String hinhThucHoanTien;

    @JsonProperty("ly_do_tra")
    private String lyDoTra;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("ngay_tao")
    private LocalDateTime ngayTao;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class OrderSummary {

    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class CustomerSummary {

    private Long id;

    @JsonProperty("ho_ten")
    private String hoTen;

    @JsonProperty("so_dien_thoai")
    private String soDienThoai;
  }
}
