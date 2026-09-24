package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

public final class AdminOrderResponse {

  private AdminOrderResponse() {}

  @Getter
  @Setter
  public static class ListItem {

    private Long id;

    @JsonProperty("ma_don_hang")
    private String maDonHang;

    @JsonProperty("loai_don_hang")
    private LoaiDonHang loaiDonHang;

    @JsonProperty("anh_dai_dien_san_pham")
    private String anhDaiDienSanPham;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;

    @JsonProperty("ten_khach_hang")
    private String tenKhachHang;

    @JsonProperty("so_dien_thoai_khach_hang")
    private String soDienThoaiKhachHang;

    @JsonProperty("sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @JsonProperty("trang_thai_don_hang")
    private TrangThaiDonHang trangThaiDonHang;

    @JsonProperty("trang_thai_thanh_toan")
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @JsonProperty("trang_thai_dong_goi")
    private TrangThaiDongGoi trangThaiDongGoi;

    @JsonProperty("trang_thai_xuat_kho")
    private TrangThaiXuatKho trangThaiXuatKho;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;
  }

  public record CashDocument(
      @JsonProperty("ma_phieu") String maPhieu,
      @JsonProperty("loai_phieu") LoaiPhieuThuChi loaiPhieu,
      @JsonProperty("ma_chung_tu_tham_chieu") String maChungTuThamChieu,
      @JsonProperty("so_tien") BigDecimal soTien,
      @JsonProperty("nhom_nguoi_nop_nhan") NhomNguoiNopNhanEnum nhomNguoiNopNhan,
      @JsonProperty("nguon_tao") NguonTaoPhieuThuChi nguonTao,
      @JsonProperty("trang_thai") TrangThaiPhieuThuChi trangThai,
      @JsonProperty("ngay_ghi_nhan") OffsetDateTime ngayGhiNhan) {}

  @Getter
  @Setter
  public static class Action extends AdminSalesResponse.Order {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("phieu_thu")
    private CashDocument phieuThu;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("phieu_chi")
    private CashDocument phieuChi;
  }

  public record Requirement(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong_moi_don_vi") Integer soLuongMoiDonVi,
      @JsonProperty("so_luong_can_serial") Integer soLuongCanSerial) {}

  public record RequirementLine(
      @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
      @JsonProperty("loai_san_pham") LoaiSanPham loaiSanPham,
      @JsonProperty("so_luong_dat") Integer soLuongDat,
      @JsonProperty("serial_requirements") List<Requirement> serialRequirements) {}

  public record Requirements(
      Long id,
      @JsonProperty("trang_thai_don_hang") TrangThaiDonHang trangThaiDonHang,
      @JsonProperty("trang_thai_dong_goi") TrangThaiDongGoi trangThaiDongGoi,
      @JsonProperty("trang_thai_xuat_kho") TrangThaiXuatKho trangThaiXuatKho,
      List<RequirementLine> items) {}

  public record Candidates(
      @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong_can_serial") Integer soLuongCanSerial,
      List<AdminSalesResponse.Serial> items,
      PaginationResponse pagination) {}
}
