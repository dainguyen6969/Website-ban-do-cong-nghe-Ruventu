package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.time.LocalDate;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonPropertyOrder({
  "tu_ngay",
  "den_ngay",
  "keyword",
  "loai_phieu",
  "loai_thu_chi_id",
  "phuong_thuc_thanh_toan",
  "nhom_nguoi_nop_nhan",
  "nguoi_nop_nhan_id",
  "nha_cung_cap_id",
  "doi_tac_van_chuyen_id",
  "ten_nguoi_nop_nhan",
  "nguoi_tao_id",
  "nguon_tao"
})
public class CashbookFilterResponse {

  @JsonProperty("tu_ngay")
  private LocalDate tuNgay;

  @JsonProperty("den_ngay")
  private LocalDate denNgay;

  private String keyword;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

  @JsonProperty("loai_thu_chi_id")
  private Long loaiThuChiId;

  @JsonProperty("phuong_thuc_thanh_toan")
  private String phuongThucThanhToan;

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

  @JsonProperty("nguoi_tao_id")
  private Long nguoiTaoId;

  @JsonProperty("nguon_tao")
  private NguonTaoPhieuThuChi nguonTao;
}
