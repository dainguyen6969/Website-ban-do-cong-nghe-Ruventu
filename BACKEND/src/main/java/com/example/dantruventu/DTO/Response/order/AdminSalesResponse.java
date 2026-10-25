package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Enum.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.JsonNode;

public final class AdminSalesResponse {

  private AdminSalesResponse() {}

  public record PageData<T>(List<T> items, PaginationResponse pagination) {}

  public record Customer(
      Long id,
      @JsonProperty("ho_ten") String hoTen,
      @JsonProperty("so_dien_thoai") String soDienThoai,
      String email) {}

  public record Employee(Long id, @JsonProperty("ho_ten") String hoTen) {}

  public record Options(
      @JsonProperty("bang_gia") List<String> bangGia,
      @JsonProperty("che_do_thue") List<String> cheDoThue,
      @JsonProperty("phuong_thuc_online") List<String> phuongThucOnline,
      @JsonProperty("phuong_thuc_pos") List<String> phuongThucPos,
      @JsonProperty("hinh_thuc_nhan_hang") List<String> hinhThucNhanHang,
      @JsonProperty("kho_mac_dinh_id") Long khoMacDinhId,
      @JsonProperty("nhan_vien_mac_dinh") Employee nhanVienMacDinh) {}

  @Getter
  @Setter
  public static class Product {

    @JsonProperty("san_pham_id")
    private Long sanPhamId;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("ma_san_pham")
    private String maSanPham;

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("ma_vach")
    private String maVach;

    @JsonProperty("anh_dai_dien")
    private String anhDaiDien;

    @JsonProperty("loai_san_pham")
    private LoaiSanPham loaiSanPham;

    @JsonProperty("don_gia")
    private BigDecimal donGia;

    @JsonProperty("thue_vat")
    private BigDecimal thueVat;

    @JsonProperty("quan_ly_serial")
    private boolean quanLySerial;

    @JsonProperty("ton_thuc_te")
    private Long tonThucTe;

    @JsonProperty("ton_co_the_ban")
    private Long tonCoTheBan;

    @JsonProperty("so_bo_co_the_lap")
    private Long soBoCoTheLap;

    @JsonProperty("thoi_han_bao_hanh_thang")
    private Integer thoiHanBaoHanhThang;

    @JsonProperty("bao_hanh_theo_linh_kien")
    private Boolean baoHanhTheoLinhKien;

    @JsonProperty("thuoc_tinh_phien_ban")
    private List<CatalogFields.AttributeData> thuocTinhPhienBan;

    @JsonProperty("thanh_phan")
    private List<CatalogFields.ComboPart> thanhPhan;
  }

  public record SerialRequirement(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong_can_serial") Integer soLuongCanSerial,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("ten_phien_ban") String tenPhienBan) {

    public SerialRequirement(Long phienBanId, Integer soLuongCanSerial) {
      this(phienBanId, soLuongCanSerial, null, null);
    }
  }

  public record PreviewLine(
      @JsonProperty("ma_dong") String maDong,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("don_gia") BigDecimal donGia,
      @JsonProperty("so_luong") Integer soLuong,
      @JsonProperty("thue_vat") BigDecimal thueVat,
      @JsonProperty("tien_chiet_khau") BigDecimal tienChietKhau,
      @JsonProperty("tien_vat") BigDecimal tienVat,
      @JsonProperty("thanh_toan_dong") BigDecimal thanhToanDong,
      @JsonProperty("thanh_tien") BigDecimal thanhTien,
      @JsonProperty("la_qua_tang") boolean laQuaTang,
      @JsonProperty("serial_requirements") List<SerialRequirement> serialRequirements) {}

  public record Promotion(
      @JsonProperty("ma_chuong_trinh") String maChuongTrinh,
      @JsonProperty("ten_chuong_trinh") String tenChuongTrinh) {}

  @Getter
  @Setter
  @AllArgsConstructor
  public static class Preview extends SalePreviewData {

    @JsonProperty("tong_tien_hang")
    private BigDecimal tongTienHang;

    @JsonProperty("tien_chiet_khau")
    private BigDecimal tienChietKhau;

    @JsonProperty("tong_tien_vat")
    private BigDecimal tongTienVat;

    @JsonProperty("phi_giao_hang")
    private BigDecimal phiGiaoHang;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;

    @JsonProperty("san_pham")
    private List<PreviewLine> sanPham;

    @JsonProperty("khuyen_mai_kha_dung")
    private List<Promotion> khuyenMaiKhaDung;
  }

  public record Serial(
      Long id,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_serial") String soSerial,
      @JsonProperty("trang_thai") TrangThaiSerial trangThai) {}

  public record CashReceipt(
      @JsonProperty("ma_phieu") String maPhieu,
      @JsonProperty("so_tien") BigDecimal soTien,
      @JsonProperty("nhom_nguoi_nop_nhan") NhomNguoiNopNhanEnum nhomNguoiNopNhan,
      @JsonProperty("nguon_tao") NguonTaoPhieuThuChi nguonTao,
      @JsonProperty("trang_thai") TrangThaiPhieuThuChi trangThai) {}

  public record Delivery(
      Long id,
      @JsonProperty("ma_phieu_giao_hang") String maPhieuGiaoHang,
      @JsonProperty("doi_tac_van_chuyen_id") Long doiTacVanChuyenId,
      @JsonProperty("ten_doi_tac_van_chuyen") String tenDoiTacVanChuyen,
      @JsonProperty("ma_van_don") String maVanDon,
      @JsonProperty("trang_thai_giao_hang") TrangThaiGiaoHangEnum trangThaiGiaoHang,
      @JsonProperty("tien_thu_ho_cod") BigDecimal tienThuHoCod,
      @JsonProperty("phi_tra_doi_tac") BigDecimal phiTraDoiTac) {}

  @Getter
  @Setter
  public static class Order {

    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("loai_don_hang")
    private LoaiDonHang loaiDonHang;

    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonProperty("ten_khach_hang")
    private String tenKhachHang;

    @JsonProperty("nhan_vien_id")
    private Long nhanVienId;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("da_ghi_nhan_thu_cod")
    private Boolean daGhiNhanThuCod;

    @JsonProperty("trang_thai_dong_goi")
    private TrangThaiDongGoi trangThaiDongGoi;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;

    @JsonProperty("da_giu_hang")
    private Boolean daGiuHang;

    @JsonProperty("han_giu_hang")
    private OffsetDateTime hanGiuHang;

    @JsonProperty("da_nhan_lai_truoc_ban_giao")
    private Boolean daNhanLaiTruocBanGiao;

    @JsonProperty("tong_tien_hang")
    private BigDecimal tongTienHang;

    @JsonProperty("tien_chiet_khau")
    private BigDecimal tienChietKhau;

    @JsonProperty("tong_tien_vat")
    private BigDecimal tongTienVat;

    @JsonProperty("phi_giao_hang")
    private BigDecimal phiGiaoHang;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;

    @JsonProperty("phuong_thuc_thanh_toan")
    private String phuongThucThanhToan;

    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @JsonProperty("dia_chi_giao_hang")
    private String diaChiGiaoHang;

    @JsonProperty("hinh_thuc_nhan_hang")
    private String hinhThucNhanHang;

    @JsonProperty("ghi_chu")
    private String ghiChu;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;

    @JsonProperty("san_pham")
    private List<AdminDeliveryResponse.ProductData> sanPham;

    private List<Serial> serials;

    @JsonProperty("phieu_giao_hang")
    private List<Delivery> phieuGiaoHang;

    @JsonProperty("so_dien_thoai_khach_hang")
    private String soDienThoaiKhachHang;

    @JsonProperty("ma_giao_dich_thanh_toan")
    private String maGiaoDichThanhToan;

    @JsonProperty("khuyen_mai")
    private AppliedPromotion khuyenMai;

    @JsonProperty("ngay_hoan_thanh")
    private OffsetDateTime ngayHoanThanh;

    @JsonProperty("thiet_bi_da_giao")
    private List<SoldDeviceData> thietBiDaGiao;

    @JsonProperty("canh_bao_thiet_bi")
    private String canhBaoThietBi;

    @JsonProperty("thiet_bi_da_ban")
    private List<Map<String, Object>> thietBiDaBan;

    @JsonProperty("thiet_bi_hien_hanh")
    private List<Map<String, Object>> thietBiHienHanh;

    @JsonProperty("can_xac_minh_lich_su")
    private boolean canXacMinhLichSu;

    @JsonProperty("canh_bao")
    private List<String> canhBao;

    @JsonProperty("doi_soat_thanh_toan")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Map<String, Object> doiSoatThanhToan;

    @JsonProperty("hang_con_thieu")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<Map<String, Object>> hangConThieu;

      @JsonProperty("giu_hang_cho_hang")
      @JsonInclude(JsonInclude.Include.NON_NULL)
      private List<Map<String, Object>> giuHangChoHang;
  }

  @Getter
  @Setter
  public static class Checkout extends Order {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("tien_khach_dua")
    private BigDecimal tienKhachDua;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("tien_thua")
    private BigDecimal tienThua;

    @JsonProperty("phieu_thu")
    private CashReceipt phieuThu;
  }

  public record AppliedPromotion(
      Long id,
      @JsonProperty("khuyen_mai_id") Long khuyenMaiId,
      @JsonProperty("ma_chuong_trinh") String maChuongTrinh,
      @JsonProperty("ten_chuong_trinh") String tenChuongTrinh,
      @JsonProperty("so_tien_giam") BigDecimal soTienGiam,
      @JsonProperty("trang_thai_ap_dung") TrangThaiApDungKhuyenMai trangThaiApDung,
      @JsonProperty("du_lieu_ap_dung") JsonNode duLieuApDung,
      @JsonProperty("canh_bao_du_lieu") String canhBaoDuLieu) {}
}
