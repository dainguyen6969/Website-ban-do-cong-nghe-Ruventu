package com.example.dantruventu.DTO.Response.warranty;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AdminWarrantyIntakeResultResponse(
    @JsonProperty("yeu_cau_tiep_nhan_id") Long yeuCauTiepNhanId,
    @JsonProperty("lich_su_id") Long lichSuId,
    @JsonProperty("ket_qua_tiep_nhan") String ketQuaTiepNhan,
    @JsonProperty("phieu_bao_hanh_id") Long phieuBaoHanhId,
    @JsonProperty("trang_thai_serial") String trangThaiSerial,
    @JsonProperty("ngay_tao") OffsetDateTime ngayTao,
    @JsonProperty("don_hang_id") Long donHangId,
    @JsonProperty("thiet_bi_id") Long thietBiId,
    @JsonProperty("co_the_lap_phieu") boolean coTheLapPhieu) {}
