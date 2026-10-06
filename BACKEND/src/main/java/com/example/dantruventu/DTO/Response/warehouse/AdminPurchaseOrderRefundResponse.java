package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.DTO.Response.cashbook.CashVoucherResponse;
import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record AdminPurchaseOrderRefundResponse(
    @JsonProperty("don_nhap_hang_id") Long donNhapHangId,
    @JsonProperty("trang_thai_nhap") TrangThaiNhapHang trangThaiNhap,
    @JsonProperty("trang_thai_thanh_toan") TrangThaiThanhToanNhap trangThaiThanhToan,
    @JsonProperty("gia_tri_hang_tra") BigDecimal giaTriHangTra,
    @JsonProperty("gia_tri_sau_tra") BigDecimal giaTriSauTra,
    @JsonProperty("so_tien_da_thanh_toan") BigDecimal soTienDaThanhToan,
    @JsonProperty("so_tien_da_nhan_hoan") BigDecimal soTienDaNhanHoan,
    @JsonProperty("so_tien_con_no") BigDecimal soTienConNo,
    @JsonProperty("so_tien_ncc_con_phai_hoan") BigDecimal soTienNccConPhaiHoan,
    @JsonProperty("phieu_thu") CashVoucherResponse phieuThu) {}
