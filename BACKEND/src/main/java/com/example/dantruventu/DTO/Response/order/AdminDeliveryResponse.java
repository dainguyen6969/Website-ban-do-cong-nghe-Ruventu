package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class AdminDeliveryResponse {

  private AdminDeliveryResponse() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ListData {
    private List<ListItem> items;
    private PaginationResponse pagination;
  }

  @Getter
  @Setter
  @JsonInclude(JsonInclude.Include.ALWAYS)
  public static class ListItem {
    private Long id;

    @JsonProperty("ma_phieu_giao_hang")
    private String maPhieuGiaoHang;

    @JsonProperty("ma_van_don")
    private String maVanDon;

    @JsonProperty("don_hang_id")
    private Long donHangId;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("trang_thai_dong_goi")
    private TrangThaiDongGoi trangThaiDongGoi;

    @JsonProperty("trang_thai_giao_hang")
    private TrangThaiGiaoHangEnum trangThaiGiaoHang;

    @JsonProperty("doi_tac_van_chuyen")
    private PartnerData doiTacVanChuyen;

    @JsonProperty("tien_thu_ho_cod")
    private BigDecimal tienThuHoCod;

    @JsonProperty("phi_tra_doi_tac")
    private BigDecimal phiTraDoiTac;

    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @JsonProperty("dia_chi_giao_hang")
    private String diaChiGiaoHang;

    @JsonProperty("ghi_chu")
    private String ghiChu;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;

    @JsonProperty("ngay_cap_nhat")
    private OffsetDateTime ngayCapNhat;
  }

  @Getter
  @Setter
  @JsonInclude(JsonInclude.Include.ALWAYS)
  public static class Detail {
    private Long id;

    @JsonProperty("ma_phieu_giao_hang")
    private String maPhieuGiaoHang;

    @JsonProperty("ma_van_don")
    private String maVanDon;

    @JsonProperty("trang_thai_giao_hang")
    private TrangThaiGiaoHangEnum trangThaiGiaoHang;

    @JsonProperty("don_hang")
    private OrderData donHang;

    @JsonProperty("nguoi_nhan")
    private RecipientData nguoiNhan;

    @JsonProperty("san_pham")
    private List<ProductData> sanPham;

    @JsonProperty("tong_tien")
    private TotalData tongTien;

    @JsonProperty("doi_tac_van_chuyen")
    private PartnerData doiTacVanChuyen;

    @JsonProperty("tien_thu_ho_cod")
    private BigDecimal tienThuHoCod;

    @JsonProperty("phi_tra_doi_tac")
    private BigDecimal phiTraDoiTac;

    @JsonProperty("ghi_chu")
    private String ghiChu;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;

    @JsonProperty("ngay_cap_nhat")
    private OffsetDateTime ngayCapNhat;
  }

  @Getter
  @Setter
  public static class Action {
    private Long id;

    @JsonProperty("ma_phieu_giao_hang")
    private String maPhieuGiaoHang;

    @JsonProperty("ma_van_don")
    private String maVanDon;

    @JsonProperty("trang_thai_giao_hang")
    private TrangThaiGiaoHangEnum trangThaiGiaoHang;

    @JsonProperty("don_hang")
    private OrderData donHang;

    @JsonProperty("doi_tac_van_chuyen")
    private PartnerData doiTacVanChuyen;

    @JsonProperty("tien_thu_ho_cod")
    private BigDecimal tienThuHoCod;

    @JsonProperty("phi_tra_doi_tac")
    private BigDecimal phiTraDoiTac;

    @JsonProperty("ngay_cap_nhat")
    private OffsetDateTime ngayCapNhat;

    @JsonProperty("phieu_tra_hang")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private ReturnData phieuTraHang;
  }

  @Getter
  @Setter
  public static class PartnerData {
    private Long id;

    @JsonProperty("ma_doi_tac")
    private String maDoiTac;

    @JsonProperty("ten_doi_tac")
    private String tenDoiTac;

    @JsonProperty("loai_doi_tac")
    private LoaiDoiTacVanChuyenEnum loaiDoiTac;

    @JsonProperty("trang_thai")
    private Short trangThai;
  }

  @Getter
  @Setter
  public static class OrderData {
    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("loai_don_hang")
    private LoaiDonHang loaiDonHang;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_dong_goi")
    private TrangThaiDongGoi trangThaiDongGoi;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;
  }

  @Getter
  @Setter
  public static class RecipientData {
    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @JsonProperty("dia_chi_giao_hang")
    private String diaChiGiaoHang;
  }

  @Getter
  @Setter
  @JsonInclude(JsonInclude.Include.ALWAYS)
  public static class ProductData {
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
  @Setter
  @JsonInclude(JsonInclude.Include.ALWAYS)
  public static class TotalData {
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
  }

  @Getter
  @Setter
  public static class ReturnData {
    private Long id;

    @JsonProperty("ma_tra_hang")
    private String maTraHang;

    @JsonProperty("khach_hang_id")
    private Long khachHangId;

    @JsonProperty("trang_thai_tra_hang")
    private TrangThaiTraHang trangThaiTraHang;

    @JsonProperty("tong_tien_hoan")
    private BigDecimal tongTienHoan;

    @JsonProperty("hinh_thuc_hoan_tien")
    private String hinhThucHoanTien;

    @JsonProperty("can_hoan_tien")
    private boolean canHoanTien;
  }
}
