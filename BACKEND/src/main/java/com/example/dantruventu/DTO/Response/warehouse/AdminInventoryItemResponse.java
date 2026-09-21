package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminInventoryItemResponse {

  @JsonProperty("loai_doi_tuong")
  private String loaiDoiTuong;

  @JsonProperty("doi_tuong_id")
  private Long doiTuongId;

  private String anh;

  @JsonProperty("ma_hien_thi")
  private String maHienThi;

  @JsonProperty("ten_hien_thi")
  private String tenHienThi;

  @JsonProperty("ton_co_the_ban")
  private Long tonCoTheBan;

  @JsonProperty("ton_thuc_te")
  private Long tonThucTe;

  @JsonProperty("vi_tri_luu_kho")
  @JsonInclude(JsonInclude.Include.ALWAYS)
  private String viTriLuuKho;

  @JsonProperty("canh_bao")
  private Boolean canhBao;

  @JsonProperty("co_ton_am")
  private Boolean coTonAm;
}
