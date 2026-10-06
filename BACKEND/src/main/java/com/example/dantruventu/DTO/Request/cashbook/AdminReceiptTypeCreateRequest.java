package com.example.dantruventu.DTO.Request.cashbook;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AdminReceiptTypeCreateRequest {

  @JsonProperty("ma_loai")
  private String maLoai;

  @JsonProperty("ten_loai")
  private String tenLoai;

  @JsonProperty("ghi_chu")
  private String ghiChu;

  @JsonIgnore private boolean backendManagedFieldProvided;

  @JsonProperty("loai_phieu")
  public void captureLoaiPhieu(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonProperty("trang_thai")
  public void captureTrangThai(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonIgnore
  public boolean isBackendManagedFieldProvided() {
    return backendManagedFieldProvided;
  }
}
