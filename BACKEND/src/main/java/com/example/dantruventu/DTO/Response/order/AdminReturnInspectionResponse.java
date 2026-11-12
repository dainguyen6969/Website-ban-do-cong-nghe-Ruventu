package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AdminReturnInspectionResponse(
    Long id,
    @JsonProperty("trang_thai_tra_hang") TrangThaiTraHang trangThaiTraHang,
    @JsonFormat(
            shape = JsonFormat.Shape.STRING,
            pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
            without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
        @JsonProperty("ngay_tiep_nhan_thuc_te")
        OffsetDateTime ngayTiepNhanThucTe,
    @JsonProperty("dang_giu_hang") boolean dangGiuHang,
    @JsonProperty("hang_thuc_nhan") List<Item> hangThucNhan,
    @JsonProperty("da_nhap_kho") boolean daNhapKho,
    @JsonProperty("phieu_chi") Object phieuChi,
    @JsonProperty("ket_qua_kiem_tra") String ketQuaKiemTra,
    @JsonProperty("bang_chung_urls") List<String> bangChungUrls) {

  public record Item(
      @JsonProperty("ma_muc_nhan") String maMucNhan,
      @JsonProperty("chi_tiet_tra_hang_id") Long chiTietTraHangId,
      @JsonProperty("thiet_bi_id") Long thietBiId,
      @JsonProperty("so_luong") int soLuong,
      @JsonProperty("so_serial") String soSerial,
      @JsonProperty("dau_hieu_nhan_dang") String dauHieuNhanDang,
      @JsonProperty("tinh_trang") String tinhTrang,
      @JsonProperty("phu_kien") List<String> phuKien) {}
}
