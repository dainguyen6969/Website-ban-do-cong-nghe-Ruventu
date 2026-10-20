package com.example.dantruventu.DTO.Request.warranty;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AdminWarrantyStatusRequest(
    @JsonProperty("su_kien") String suKien,
    @JsonProperty("thoi_diem") String thoiDiem,
    @JsonProperty("ghi_chu") String ghiChu,
    @JsonProperty("ly_do") String lyDo,
    @JsonProperty("thiet_bi_se_tra_id") Object thietBiSeTraId,
    @JsonProperty("ket_qua_xu_ly") String ketQuaXuLy,
    @JsonProperty("tinh_trang") String tinhTrang,
    @JsonProperty("phu_kien") List<AdminWarrantyCreateRequest.Accessory> phuKien,
    @JsonProperty("can_cu_kiem_tra") String canCuKiemTra,
    @JsonProperty("sai_lech_da_xu_ly") List<Object> saiLechDaXuLy,
    @JsonProperty("phien_ban_phuong_an") Object phienBanPhuongAn) {
  @JsonAnySetter
  public void rejectUnknown(String name, Object value) {
    throw new IllegalArgumentException("Trường không được phép: " + name);
  }
}
