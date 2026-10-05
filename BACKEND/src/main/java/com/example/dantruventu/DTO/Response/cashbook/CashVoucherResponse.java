package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CashVoucherResponse(
    Long id,
    @JsonProperty("ma_phieu") String maPhieu,
    @JsonProperty("loai_phieu") LoaiPhieuThuChi loaiPhieu,
    @JsonProperty("loai_thu_chi_id") Long loaiThuChiId,
    @JsonProperty("nhom_nguoi_nop_nhan") NhomNguoiNopNhanEnum nhomNguoiNopNhan,
    @JsonProperty("nguoi_nop_nhan_id") Long nguoiNopNhanId,
    @JsonProperty("nha_cung_cap_id") Long nhaCungCapId,
    @JsonProperty("doi_tac_van_chuyen_id") Long doiTacVanChuyenId,
    @JsonProperty("ten_nguoi_nop_nhan") String tenNguoiNopNhan,
    @JsonProperty("ma_chung_tu_tham_chieu") String maChungTuThamChieu,
    @JsonProperty("so_tien") BigDecimal soTien,
    @JsonProperty("phuong_thuc_thanh_toan") String phuongThucThanhToan,
    @JsonProperty("ngay_ghi_nhan") OffsetDateTime ngayGhiNhan,
    @JsonProperty("nguoi_tao_id") Long nguoiTaoId,
    @JsonProperty("nguon_tao") NguonTaoPhieuThuChi nguonTao,
    @JsonProperty("trang_thai") TrangThaiPhieuThuChi trangThai) {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  public static CashVoucherResponse from(SoQuyThuChi entity) {
    if (entity == null) {
      return null;
    }

    return new CashVoucherResponse(
        entity.getId(),
        entity.getMaPhieu(),
        entity.getLoaiPhieu(),
        entity.getLoaiThuChi() == null ? null : entity.getLoaiThuChi().getId(),
        entity.getNhomNguoiNopNhan(),
        entity.getNguoiNopNhan() == null ? null : entity.getNguoiNopNhan().getId(),
        entity.getNhaCungCap() == null ? null : entity.getNhaCungCap().getId(),
        entity.getDoiTacVanChuyen() == null ? null : entity.getDoiTacVanChuyen().getId(),
        entity.getTenNguoiNopNhan(),
        entity.getMaChungTuThamChieu(),
        entity.getSoTien(),
        entity.getPhuongThucThanhToan(),
        entity.getNgayGhiNhan() == null
            ? null
            : entity.getNgayGhiNhan().atZone(ZONE).toOffsetDateTime(),
        entity.getNguoiTao() == null ? null : entity.getNguoiTao().getId(),
        entity.getNguonTao(),
        entity.getTrangThai());
  }
}
