package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AdminReturnHandoverResponse(
    Long id,
    @JsonProperty("trang_thai_tra_hang") TrangThaiTraHang trangThaiTraHang,
    @JsonFormat(
            shape = JsonFormat.Shape.STRING,
            pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
            without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
        @JsonProperty("ngay_ket_thuc")
        OffsetDateTime ngayKetThuc,
    @JsonProperty("dang_giu_hang") boolean dangGiuHang,
    @JsonProperty("da_giai_phong_quyen_tra") boolean daGiaiPhongQuyenTra,
    @JsonProperty("ban_giao_lai") Handover banGiaoLai,
    @JsonProperty("phieu_chi") Object phieuChi) {

  public record Handover(
      @JsonProperty("ten_nguoi_nhan") String tenNguoiNhan,
      @JsonProperty("sdt_nguoi_nhan") String sdtNguoiNhan,
      @JsonFormat(
              shape = JsonFormat.Shape.STRING,
              pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
              without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
          @JsonProperty("ngay_ban_giao")
          OffsetDateTime ngayBanGiao,
      @JsonProperty("hang_ban_giao") List<Item> hangBanGiao,
      @JsonProperty("bang_chung_urls") List<String> bangChungUrls) {}

  public record Item(
      @JsonProperty("ma_muc_nhan") String maMucNhan,
      @JsonProperty("so_luong") int soLuong,
      @JsonProperty("tinh_trang") String tinhTrang,
      @JsonProperty("phu_kien") List<String> phuKien) {}
}
