package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashVoucherResponse;
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

    @JsonProperty("trang_thai_giao_hang")
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private TrangThaiGiaoHangEnum trangThaiGiaoHang;

    @JsonProperty("tong_thanh_toan")
    private BigDecimal tongThanhToan;

    @JsonProperty("hinh_thuc_nhan_hang")
    private String hinhThucNhanHang;

    @JsonProperty("phieu_giao_hang_gan_nhat_id")
    private Long phieuGiaoHangGanNhatId;
  }

  public record History(
      Long id,
      @JsonProperty("hanh_dong") String hanhDong,
      @JsonProperty("mo_ta") String moTa,
      @JsonProperty("nguoi_thuc_hien") String nguoiThucHien,
      @JsonProperty("ngay_thuc_hien") OffsetDateTime ngayThucHien,
      @JsonProperty("trang_thai_don_hang") TrangThaiDonHang trangThaiDonHang,
      @JsonProperty("trang_thai_dong_goi") TrangThaiDongGoi trangThaiDongGoi,
      @JsonProperty("trang_thai_xuat_kho") TrangThaiXuatKho trangThaiXuatKho,
      @JsonProperty("phieu_giao_hang_id") Long phieuGiaoHangId,
      @JsonProperty("ma_phieu_giao_hang") String maPhieuGiaoHang,
      @JsonProperty("trang_thai_giao_hang") TrangThaiGiaoHangEnum trangThaiGiaoHang) {

    public History(
        Long id,
        String hanhDong,
        String moTa,
        String nguoiThucHien,
        OffsetDateTime ngayThucHien,
        TrangThaiDonHang trangThaiDonHang,
        TrangThaiDongGoi trangThaiDongGoi,
        TrangThaiXuatKho trangThaiXuatKho) {

      this(
          id,
          hanhDong,
          moTa,
          nguoiThucHien,
          ngayThucHien,
          trangThaiDonHang,
          trangThaiDongGoi,
          trangThaiXuatKho,
          null,
          null,
          null);
    }
  }

  @Getter
  @Setter
  public static class Action extends AdminSalesResponse.Order {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("phieu_thu")
    private CashVoucherResponse phieuThu;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("phieu_chi")
    private CashVoucherResponse phieuChi;

    @JsonProperty("kho_hang_id")
    private Long khoHangId;

    @JsonProperty("hang_giu")
    private List<java.util.Map<String, Object>> hangGiu = List.of();

    @JsonProperty("giai_phong_giu_kho")
    private List<java.util.Map<String, Object>> giaiPhongGiuKho = List.of();

    @JsonProperty("tien_can_doi_soat_hoan")
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private BigDecimal tienCanDoiSoatHoan;

    @JsonProperty("thiet_bi_da_xuat")
    private List<SoldDeviceData> thietBiDaXuat = List.of();

    @JsonProperty("phieu_thu_moi")
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private CashVoucherResponse phieuThuMoi;
  }

  public record Requirement(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong_moi_don_vi") Integer soLuongMoiDonVi,
      @JsonProperty("so_luong_can_serial") Integer soLuongCanSerial,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("ten_phien_ban") String tenPhienBan) {}

  public record RequirementLine(
      @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
      @JsonProperty("loai_san_pham") LoaiSanPham loaiSanPham,
      @JsonProperty("so_luong_dat") Integer soLuongDat,
      @JsonProperty("serial_requirements") List<Requirement> serialRequirements,
      @JsonProperty("ma_dong") String maDong,
      @JsonProperty("la_qua_tang") boolean laQuaTang,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("hang_vat_ly") List<java.util.Map<String, Object>> hangVatLy) {}

  public record Requirements(
      Long id,
      @JsonProperty("trang_thai_don_hang") TrangThaiDonHang trangThaiDonHang,
      @JsonProperty("trang_thai_dong_goi") TrangThaiDongGoi trangThaiDongGoi,
      @JsonProperty("trang_thai_xuat_kho") TrangThaiXuatKho trangThaiXuatKho,
      @JsonProperty("kho_hang_id") Long khoHangId,
      List<RequirementLine> items) {}

  public record Candidates(
      @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong_can_serial") Integer soLuongCanSerial,
      List<AdminSalesResponse.Serial> items,
      PaginationResponse pagination) {}
}
