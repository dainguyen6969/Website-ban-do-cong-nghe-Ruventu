package com.example.dantruventu.DTO.Response.order;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SoldDeviceData(
    @JsonProperty("thiet_bi_id") Long thietBiId,
    @JsonProperty("ma_theo_doi") String maTheoDoi,
    @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
    @JsonProperty("phien_ban_id") Long phienBanId,
    @JsonProperty("ten_san_pham") String tenSanPham,
    @JsonProperty("ten_phien_ban") String tenPhienBan,
    @JsonProperty("so_serial_id") Long soSerialId,
    @JsonProperty("so_serial") String soSerial,
    @JsonProperty("thoi_han_bao_hanh_thang") Integer thoiHanBaoHanhThang,
    @JsonProperty("ngay_kich_hoat") OffsetDateTime ngayKichHoat,
    @JsonProperty("han_bao_hanh") OffsetDateTime hanBaoHanh) {}
