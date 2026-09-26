package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class CustomerOrderResponse {

  private CustomerOrderResponse() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Recipient {

    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @JsonProperty("dia_chi_giao_hang")
    private String diaChiGiaoHang;
  }

  @Getter
  @Builder
  public static class Product {

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("don_gia")
    private BigDecimal donGia;

    @JsonProperty("thanh_tien")
    private BigDecimal thanhTien;
  }

  @Getter
  @Builder
  public static class Preview {

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
    private List<Product> sanPham;

    @JsonProperty("thong_tin_nguoi_nhan")
    private Recipient thongTinNguoiNhan;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Created {

    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("loai_don_hang")
    private LoaiDonHang loaiDonHang;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("trang_thai_dong_goi")
    private TrangThaiDongGoi trangThaiDongGoi;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;

    @JsonProperty("phuong_thuc_thanh_toan")
    private String phuongThucThanhToan;

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

    @JsonProperty("thong_tin_nguoi_nhan")
    private Recipient thongTinNguoiNhan;

    @JsonProperty("san_pham")
    private List<CreatedProduct> sanPham;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class CreatedProduct {

    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("so_luong")
    private Integer soLuong;
  }

  @Getter
  @Builder
  public static class ListItem {
    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("so_luong_san_pham")
    private Long soLuongSanPham;
  }

  @Getter
  @Builder
  public static class ListData {
    private List<ListItem> items;
    private PaginationResponse pagination;
  }

  @Getter
  @Builder
  public static class DetailProduct {
    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("don_gia")
    private BigDecimal donGia;

    @JsonProperty("thanh_tien")
    private BigDecimal thanhTien;

    @JsonProperty("thue_vat")
    private BigDecimal thueVat;

    @JsonProperty("tien_chiet_khau")
    private BigDecimal tienChietKhau;

    @JsonProperty("tien_vat")
    private BigDecimal tienVat;

    @JsonProperty("quan_ly_serial")
    private Boolean quanLySerial;
  }

  @Getter
  @Builder
  public static class Serial {
    private Long id;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("so_serial")
    private String soSerial;

    @JsonProperty("trang_thai")
    private TrangThaiSerial trangThai;
  }

  @Getter
  @Builder
  public static class Delivery {
    private Long id;

    @JsonProperty("ma_phieu_giao_hang")
    private String maPhieuGiaoHang;

    @JsonProperty("doi_tac_van_chuyen_id")
    private Long doiTacVanChuyenId;

    @JsonProperty("ma_van_don")
    private String maVanDon;

    @JsonProperty("trang_thai_giao_hang")
    private TrangThaiGiaoHangEnum trangThaiGiaoHang;

    @JsonProperty("tien_thu_ho_cod")
    private BigDecimal tienThuHoCod;
  }

  @Getter
  @Builder
  public static class Detail {
    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("loai_don_hang")
    private LoaiDonHang loaiDonHang;

    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonProperty("ten_khach_hang")
    private String tenKhachHang;

    @JsonProperty("so_dien_thoai_khach_hang")
    private String soDienThoaiKhachHang;

    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @JsonProperty("dia_chi_giao_hang")
    private String diaChiGiaoHang;

    @JsonProperty("hinh_thuc_nhan_hang")
    private String hinhThucNhanHang;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("trang_thai_dong_goi")
    private TrangThaiDongGoi trangThaiDongGoi;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;

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

    @JsonProperty("san_pham")
    private List<DetailProduct> sanPham;

    private List<Serial> serials;

    @JsonProperty("phieu_giao_hang")
    private List<Delivery> phieuGiaoHang;

    @JsonProperty("ghi_chu")
    private String ghiChu;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;
  }

  @Getter
  @Builder
  public static class Cancelled {
    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;
  }

  @Getter
  @Builder
  public static class Tracking {
    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;

    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;
  }
}
