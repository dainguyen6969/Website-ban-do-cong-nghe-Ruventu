package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminReceiptTypeStatusResponse {

  private Long id;

  @JsonProperty("ma_loai")
  private String maLoai;

  @JsonProperty("ten_loai")
  private String tenLoai;

  @JsonProperty("loai_phieu")
  private LoaiPhieuThuChi loaiPhieu;

  @JsonProperty("trang_thai")
  private Integer trangThai;

  @Getter(AccessLevel.NONE)
  @JsonIgnore
  private boolean changed;

  @JsonIgnore
  public boolean isChanged() {
    return changed;
  }
}
