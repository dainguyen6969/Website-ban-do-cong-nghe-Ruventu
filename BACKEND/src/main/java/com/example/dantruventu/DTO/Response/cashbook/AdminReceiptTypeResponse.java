package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminReceiptTypeResponse {

  private Long id;

  @JsonProperty("ma_loai")
  private String maLoai;

  @JsonProperty("ten_loai")
  private String tenLoai;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

  @JsonProperty("ghi_chu")
  private String ghiChu;

  @JsonProperty("trang_thai")
  private Integer trangThai;
}
