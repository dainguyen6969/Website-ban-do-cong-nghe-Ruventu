package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminInventoryDetailResponse {

  @JsonProperty("loai_doi_tuong")
  private String loaiDoiTuong;

  @JsonProperty("doi_tuong_id")
  private Long doiTuongId;

  @JsonProperty("phien_ban")
  private PhienBanData phienBan;

  private ComboData combo;

  @JsonProperty("ton_kho_theo_kho")
  private List<AdminInventoryWarehouseStockResponse> tonKhoTheoKho;

  private List<ThanhPhanData> components;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class PhienBanData {

    private Long id;

    @JsonProperty("san_pham_id")
    private Long sanPhamId;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("ma_vach")
    private String maVach;

    @JsonProperty("trang_thai")
    private Short trangThai;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ComboData {

    private Long id;

    @JsonProperty("ma_san_pham")
    private String maSanPham;

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("trang_thai")
    private Short trangThai;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ThanhPhanData {

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("ma_vach")
    private String maVach;

    @JsonProperty("so_luong")
    private Long soLuong;

    @JsonProperty("cau_hinh_hop_le")
    private Boolean cauHinhHopLe;

    @JsonProperty("ton_kho_theo_kho")
    private List<AdminInventoryWarehouseStockResponse> tonKhoTheoKho;
  }
}
