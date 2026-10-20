package com.example.dantruventu.DTO.Response.warranty;

import com.example.dantruventu.Enum.KetQuaXuLyBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AdminWarrantyStatusResponse(
    Long id,
    @JsonProperty("su_kien") String suKien,
    @JsonProperty("trang_thai_xu_ly") TrangThaiBaoHanh trangThaiXuLy,
    @JsonProperty("ket_qua_xu_ly") KetQuaXuLyBaoHanh ketQuaXuLy,
    @JsonProperty("thiet_bi_se_tra_id") Long thietBiSeTraId,
    @JsonProperty("lich_su_id") Long lichSuId,
    @JsonProperty("phien_ban_phuong_an") @JsonInclude(JsonInclude.Include.NON_NULL)
        Integer phienBanPhuongAn) {}
