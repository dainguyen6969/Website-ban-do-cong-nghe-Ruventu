package com.example.dantruventu.DTO.Response.order;

import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AdminReturnRejectResponse(
    Long id,
    @JsonProperty("trang_thai_tra_hang") TrangThaiTraHang trangThaiTraHang,
    @JsonProperty("muc_dich_ket_thuc") String mucDichKetThuc,
    @JsonProperty("ly_do_ket_thuc") String lyDoKetThuc,
    @JsonProperty("dang_giu_hang") boolean dangGiuHang,
    @JsonProperty("da_giai_phong_quyen_tra") boolean daGiaiPhongQuyenTra,
    @JsonFormat(
            shape = JsonFormat.Shape.STRING,
            pattern = "yyyy-MM-dd'T'HH:mm:ssXXX",
            without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
        @JsonProperty("ngay_ket_thuc")
        OffsetDateTime ngayKetThuc) {}
