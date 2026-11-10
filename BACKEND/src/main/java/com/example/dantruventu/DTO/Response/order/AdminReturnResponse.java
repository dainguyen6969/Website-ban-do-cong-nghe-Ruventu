package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashVoucherResponse;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
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
  public static class PreviewResponse {

    @JsonProperty("don_hang_id")
    private Long donHangId;

    @JsonProperty("du_dieu_kien")
    private boolean duDieuKien;

    @JsonProperty("chi_tiet_tra")
    private List<PreviewLine> chiTietTra;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("da_giu_quyen_tra")
    private boolean daGiuQuyenTra;

    @JsonProperty("can_kiem_tra_lai_khi_tao")
    private boolean canKiemTraLaiKhiTao;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class PreviewLine {

    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("don_gia_hoan")
    private BigDecimal donGiaHoan;

    @JsonProperty("thanh_tien_hoan")
    private BigDecimal thanhTienHoan;

    @JsonProperty("dieu_chinh_lam_tron")
    private BigDecimal dieuChinhLamTron;
  }

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
  @JsonInclude(value = JsonInclude.Include.ALWAYS, content = JsonInclude.Include.ALWAYS)
  public static class DetailResponse {

    private Long id;

    @JsonProperty("ma_tra_hang")
    private String maTraHang;

    @JsonProperty("don_hang")
    private OrderSummary donHang;

    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonProperty("ten_nguoi_lien_he")
    private String tenNguoiLienHe;

    @JsonProperty("sdt_nguoi_lien_he")
    private String sdtNguoiLienHe;

    @JsonProperty("ly_do_tra")
    private String lyDoTra;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("chi_tiet_tra")
    private List<DetailReturnLine> chiTietTra;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("hinh_thuc_hoan_tien")
    private String hinhThucHoanTien;

    @JsonFormat(
        shape = JsonFormat.Shape.STRING,
        pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
        timezone = "Asia/Ho_Chi_Minh",
        without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
    @JsonProperty("ngay_tiep_nhan_thuc_te")
    private OffsetDateTime ngayTiepNhanThucTe;

    @JsonFormat(
        shape = JsonFormat.Shape.STRING,
        pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
        timezone = "Asia/Ho_Chi_Minh",
        without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
    @JsonProperty("ngay_nhan_hang")
    private OffsetDateTime ngayNhanHang;

    @JsonFormat(
        shape = JsonFormat.Shape.STRING,
        pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
        timezone = "Asia/Ho_Chi_Minh",
        without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
    @JsonProperty("ngay_ket_thuc")
    private OffsetDateTime ngayKetThuc;

    @JsonProperty("ly_do_ket_thuc")
    private String lyDoKetThuc;

    @JsonProperty("muc_dich_ket_thuc")
    private String mucDichKetThuc;

    @JsonProperty("ket_qua_kiem_tra")
    private Object ketQuaKiemTra;

    @JsonProperty("hang_dang_giu")
    private List<?> hangDangGiu;

    @JsonProperty("hang_da_nhan")
    private List<?> hangDaNhan;

    @JsonProperty("ban_giao_lai")
    private Object banGiaoLai;

    @JsonProperty("phe_duyet_ngoai_le")
    private Object pheDuyetNgoaiLe;

    @JsonProperty("phieu_chi")
    private DetailRefundVoucher phieuChi;

    @JsonProperty("thao_tac_duoc_phep")
    private List<String> thaoTacDuocPhep;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class DetailReturnLine {

    private Long id;

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
  @JsonInclude(JsonInclude.Include.ALWAYS)
  public static class DetailRefundVoucher {

    private Long id;

    @JsonProperty("ma_phieu")
    private String maPhieu;

    @JsonProperty("phieu_tra_hang_id")
    private Long phieuTraHangId;

    @JsonProperty("loai_phieu")
    private String loaiPhieu;

    @JsonProperty("so_tien")
    private BigDecimal soTien;

    @JsonProperty("phuong_thuc_thanh_toan")
    private String phuongThucThanhToan;

    @JsonProperty("ten_nguoi_nop_nhan")
    private String tenNguoiNopNhan;

    @JsonProperty("ma_chung_tu_tham_chieu")
    private String maChungTuThamChieu;

    @JsonFormat(
        shape = JsonFormat.Shape.STRING,
        pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
        timezone = "Asia/Ho_Chi_Minh",
        without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
    @JsonProperty("ngay_ghi_nhan")
    private OffsetDateTime ngayGhiNhan;

    @JsonProperty("nguon_tao")
    private String nguonTao;

    @JsonProperty("trang_thai")
    private String trangThai;
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

    @JsonProperty("ten_nguoi_lien_he")
    private String tenNguoiLienHe;

    @JsonProperty("sdt_nguoi_lien_he")
    private String sdtNguoiLienHe;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("chi_tiet_tra")
    private List<ReturnLine> chiTietTra;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("ngay_tao")
    @JsonFormat(
        shape = JsonFormat.Shape.STRING,
        timezone = "Asia/Ho_Chi_Minh",
        without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
    private OffsetDateTime ngayTao;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ReturnLine {

    private Long id;

    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("don_gia_hoan")
    private BigDecimal donGiaHoan;

    @JsonProperty("thanh_tien_hoan")
    private BigDecimal thanhTienHoan;

    @JsonProperty("dieu_chinh_lam_tron")
    private BigDecimal dieuChinhLamTron;
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

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("ten_nguoi_lien_he")
    private String tenNguoiLienHe;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("sdt_nguoi_lien_he")
    private String sdtNguoiLienHe;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("ngay_hoan_thanh")
    private OffsetDateTime ngayHoanThanh;

    @JsonProperty("chi_duoc_tra_toan_bo")
    private boolean chiDuocTraToanBo;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibleOrderDetailResponse {
    @JsonProperty("don_hang")
    private EligibleOrderSummary donHang;

    @JsonProperty("du_dieu_kien_lap_phieu")
    private boolean duDieuKienLapPhieu;

    @JsonProperty("ly_do_chan")
    private List<EligibilityBlockReason> lyDoChan;

    @JsonProperty("chi_duoc_tra_toan_bo")
    private boolean chiDuocTraToanBo;

    @JsonProperty("chi_tiet")
    private List<EligibleOrderLine> chiTiet;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibilityBlockReason {
    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    private String code;
    private String message;
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

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonProperty("ngay_hoan_thanh")
    private OffsetDateTime ngayHoanThanh;
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

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("la_qua_tang")
    private boolean laQuaTang;

    @JsonProperty("so_luong_da_giao")
    private Integer soLuongDaGiao;

    @JsonProperty("so_luong_da_yeu_cau_tra")
    private Long soLuongDaYeuCauTra;

    @JsonProperty("so_luong_con_duoc_tra")
    private Long soLuongConDuocTra;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("tien_chiet_khau")
    private BigDecimal tienChietKhau;

    @JsonProperty("thanh_toan_dong")
    private BigDecimal thanhToanDong;

    @JsonProperty("so_tien_con_duoc_hoan")
    private BigDecimal soTienConDuocHoan;

    @JsonProperty("don_gia_hoan_du_kien")
    private BigDecimal donGiaHoanDuKien;

    @JsonProperty("thiet_bi_hien_hanh")
    private List<EligibleCurrentDevice> thietBiHienHanh;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("cau_hinh_da_ban")
    private Map<String, Object> cauHinhDaBan;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class EligibleCurrentDevice {
    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("thiet_bi_id")
    private Long thietBiId;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("ma_theo_doi")
    private String maTheoDoi;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("so_serial_id")
    private Long soSerialId;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @JsonProperty("so_serial")
    private String soSerial;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("ma_don_vi_vat_ly")
    private String maDonViVatLy;
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
    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonProperty("ten_nguoi_lien_he")
    private String tenNguoiLienHe;

    @JsonProperty("sdt_nguoi_lien_he")
    private String sdtNguoiLienHe;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("ly_do_tra")
    private String lyDoTra;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;
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
