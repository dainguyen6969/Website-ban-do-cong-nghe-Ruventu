package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminInventoryCheckUpdateResponse {

  private Long id;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("ton_he_thong")
  private Integer tonHeThong;

  @JsonProperty("ton_thuc_te")
  private Integer tonThucTe;

  @JsonProperty("so_luong_chenh_lech")
  private Integer soLuongChenhLech;

  @JsonProperty("ly_do")
  private String lyDo;

  @JsonProperty("trang_thai")
  private TrangThaiPhieuKiemKho trangThai;

  @JsonProperty("ngay_tao")
  private LocalDateTime ngayTao;
}
