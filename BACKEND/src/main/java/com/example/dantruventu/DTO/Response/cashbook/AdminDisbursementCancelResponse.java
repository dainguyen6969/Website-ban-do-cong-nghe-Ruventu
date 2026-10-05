package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
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
public class AdminDisbursementCancelResponse {

  private Long id;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

  @JsonProperty("nguon_tao")
  private NguonTaoPhieuThuChi nguonTao;

  @JsonProperty("trang_thai")
  private TrangThaiPhieuThuChi trangThai;

  @JsonProperty("so_tien")
  private BigDecimal soTien;

  @JsonProperty("updated_at")
  private OffsetDateTime updatedAt;
}
