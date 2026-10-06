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
  "ma_phieu",
  "loai_phieu",
  "nhom_nguoi_nop_nhan",
  "ten_nguoi_nop_nhan",
  "nguoi_nop_nhan_id",
  "doi_tac_van_chuyen_id",
  "nha_cung_cap_id",
  "ma_chung_tu_tham_chieu",
  "loai_thu_chi_id",
  "ma_loai",
  "ten_loai",
  "phuong_thuc_thanh_toan",
  "nguoi_tao_id",
  "ten_nguoi_tao",
  "so_tien",
  "ngay_ghi_nhan",
  "nguon_tao",
  "trang_thai"
})
public class AdminReceiptListItemResponse {

  private Long id;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

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

  @JsonProperty("loai_thu_chi_id")
  private Long loaiThuChiId;

  @JsonProperty("ma_loai")
  private String maLoai;

  @JsonProperty("ten_loai")
  private String tenLoai;

  @JsonProperty("phuong_thuc_thanh_toan")
  private String phuongThucThanhToan;

  @JsonProperty("nguoi_tao_id")
  private Long nguoiTaoId;

  @JsonProperty("ten_nguoi_tao")
  private String tenNguoiTao;

  @JsonProperty("so_tien")
  private BigDecimal soTien;

  @JsonProperty("ngay_ghi_nhan")
  private OffsetDateTime ngayGhiNhan;

  @JsonProperty("nguon_tao")
  private NguonTaoPhieuThuChi nguonTao;

  @JsonProperty("trang_thai")
  private TrangThaiPhieuThuChi trangThai;
}
