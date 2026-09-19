package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminInventoryLedgerResponse {

    private Long id;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("kho_hang_id")
    private Long khoHangId;

    @JsonProperty("loai_giao_dich")
    private String loaiGiaoDich;

    @JsonProperty("ma_chung_tu_goc")
    private Long maChungTuGoc;

    @JsonProperty("so_luong_thay_doi")
    private Integer soLuongThayDoi;

    @JsonProperty("ton_cuoi")
    private Integer tonCuoi;

    @JsonProperty("ghi_chu")
    private String ghiChu;

    @JsonProperty("ngay_tao")
    private OffsetDateTime ngayTao;
}