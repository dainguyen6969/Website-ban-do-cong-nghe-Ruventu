package com.example.dantruventu.DTO.Response.warranty;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AdminWarrantyLookupResponse(
    List<Item> items,
    @JsonProperty("yeu_cau_tiep_nhan") List<IntakeRequest> yeuCauTiepNhan,
    PaginationResponse pagination) {
  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Item(
      @JsonProperty("don_hang_id") Long donHangId,
      @JsonProperty("ma_don_hang") String maDonHang,
      @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
      @JsonProperty("khach_hang_id") Long khachHangId,
      @JsonProperty("da_giao_khach") boolean daGiaoKhach,
      @JsonProperty("so_luong_da_giao") long soLuongDaGiao,
      @JsonProperty("so_luong_dang_xu_ly") long soLuongDangXuLy,
      @JsonProperty("thiet_bi_id") Long thietBiId,
      @JsonProperty("ma_theo_doi") String maTheoDoi,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_serial_id") Long soSerialId,
      @JsonProperty("so_serial") String soSerial,
      @JsonProperty("la_thiet_bi_hien_hanh") boolean laThietBiHienHanh,
      @JsonProperty("han_bao_hanh") OffsetDateTime hanBaoHanh,
      @JsonProperty("can_cu_tinh_han") String canCuTinhHan,
      @JsonProperty("dieu_kien_bao_hanh") String dieuKienBaoHanh,
      @JsonProperty("co_the_tiep_nhan") boolean coTheTiepNhan,
      @JsonProperty("ly_do_chan") List<BlockReason> lyDoChan,
      @JsonProperty("thiet_bi_hien_hanh_id") Long thietBiHienHanhId,
      @JsonProperty("chi_tiet_tra_hang_id") Long chiTietTraHangId) {}

  public record BlockReason(String code, String message) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record IntakeRequest(
      Long id,
      @JsonProperty("ket_qua_tiep_nhan") String ketQuaTiepNhan,
      @JsonProperty("ly_do") String lyDo,
      @JsonProperty("don_hang_id") Long donHangId,
      @JsonProperty("thiet_bi_id") Long thietBiId,
      @JsonProperty("ten_nguoi_lien_he") String tenNguoiLienHe,
      @JsonProperty("sdt_nguoi_lien_he") String sdtNguoiLienHe,
      @JsonProperty("so_serial") String soSerial,
      @JsonProperty("ma_theo_doi") String maTheoDoi,
      @JsonProperty("ma_don_hang") String maDonHang) {}
}
