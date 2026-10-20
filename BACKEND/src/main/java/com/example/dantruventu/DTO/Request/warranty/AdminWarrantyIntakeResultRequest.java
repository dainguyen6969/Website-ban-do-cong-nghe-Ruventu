package com.example.dantruventu.DTO.Request.warranty;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AdminWarrantyIntakeResultRequest(
    @JsonProperty("yeu_cau_tiep_nhan_id") Object yeuCauTiepNhanId,
    @JsonProperty("don_hang_id") Object donHangId,
    @JsonProperty("chi_tiet_don_hang_id") Object chiTietDonHangId,
    @JsonProperty("thiet_bi_id") Object thietBiId,
    @JsonProperty("so_serial") String soSerial,
    @JsonProperty("ten_nguoi_lien_he") String tenNguoiLienHe,
    @JsonProperty("sdt_nguoi_lien_he") String sdtNguoiLienHe,
    @JsonProperty("ket_qua_tiep_nhan") String ketQuaTiepNhan,
    @JsonProperty("ly_do") String lyDo,
    @JsonProperty("can_cu") String canCu,
    @JsonProperty("bang_chung_urls") List<String> bangChungUrls) {
  @JsonAnySetter
  public void rejectUnknown(String name, Object value) {
    throw new IllegalArgumentException("Trường không được phép: " + name);
  }
}
