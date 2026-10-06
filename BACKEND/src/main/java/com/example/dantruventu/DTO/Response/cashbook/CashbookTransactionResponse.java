package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonPropertyOrder({
  "id",
  "stt",
  "ma_phieu",
  "loai_phieu",
  "loai_thu_chi_id",
  "ngay_ghi_nhan",
  "nhom_nguoi_nop_nhan",
  "ten_nguoi_nop_nhan",
  "nguoi_nop_nhan_id",
  "doi_tac_van_chuyen_id",
  "nha_cung_cap_id",
  "ma_chung_tu_tham_chieu",
  "phuong_thuc_thanh_toan",
  "tien_thu",
  "tien_chi",
  "mo_ta",
  "nguoi_tao_id",
  "ten_nguoi_tao",
  "nguon_tao",
  "trang_thai"
})
public class CashbookTransactionResponse {

  private Long id;
  private Long stt;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

  @JsonProperty("loai_thu_chi_id")
  private Long loaiThuChiId;

  @JsonProperty("ngay_ghi_nhan")
  private OffsetDateTime ngayGhiNhan;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("nhom_nguoi_nop_nhan")
  private NhomNguoiNopNhanEnum nhomNguoiNopNhan;

  @JsonProperty("ten_nguoi_nop_nhan")
  private String tenNguoiNopNhan;

  @JsonProperty("nguoi_nop_nhan_id")
  private Long nguoiNopNhanId;

  @JsonProperty("doi_tac_van_chuyen_id")
  private Long doiTacVanChuyenId;

  @JsonProperty("nha_cung_cap_id")
  private Long nhaCungCapId;

  @JsonProperty("ma_chung_tu_tham_chieu")
  private String maChungTuThamChieu;

  @JsonProperty("phuong_thuc_thanh_toan")
  private String phuongThucThanhToan;

  @JsonProperty("tien_thu")
  private BigDecimal tienThu;

  @JsonProperty("tien_chi")
  private BigDecimal tienChi;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("nguoi_tao_id")
  private Long nguoiTaoId;

  @JsonProperty("ten_nguoi_tao")
  private String tenNguoiTao;

  @JsonProperty("nguon_tao")
  private NguonTaoPhieuThuChi nguonTao;

  @JsonProperty("trang_thai")
  private TrangThaiPhieuThuChi trangThai;
}
