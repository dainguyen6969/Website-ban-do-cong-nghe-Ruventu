package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDisbursementListItemResponse {

  private Long id;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

  @JsonProperty("nhom_nguoi_nop_nhan")
  private NhomNguoiNopNhanEnum nhomNguoiNopNhan;

  @JsonProperty("ten_nguoi_nop_nhan")
  private String tenNguoiNopNhan;

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
