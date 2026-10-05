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
public class CashbookTransactionResponse {

  private Long id;
  private Long stt;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

  @JsonProperty("ngay_ghi_nhan")
  private OffsetDateTime ngayGhiNhan;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("nhom_nguoi_nop_nhan")
  private NhomNguoiNopNhanEnum nhomNguoiNopNhan;

  @JsonProperty("ten_nguoi_nop_nhan")
  private String tenNguoiNopNhan;

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
