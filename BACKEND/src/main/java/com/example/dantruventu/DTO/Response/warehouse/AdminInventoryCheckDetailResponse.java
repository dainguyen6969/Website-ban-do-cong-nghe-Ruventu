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
public class AdminInventoryCheckDetailResponse {

  private Long id;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("nguoi_kiem")
  private CheckerData nguoiKiem;

  @JsonProperty("phien_ban")
  private VariantData phienBan;

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

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class CheckerData {

    private Long id;

    @JsonProperty("ho_ten")
    private String hoTen;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class VariantData {

    private Long id;

    @JsonProperty("ma_san_pham")
    private String maSanPham;

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("ma_vach")
    private String maVach;
  }
}
