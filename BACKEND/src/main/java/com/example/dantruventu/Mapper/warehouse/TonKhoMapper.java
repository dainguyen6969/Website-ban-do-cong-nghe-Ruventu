package com.example.dantruventu.Mapper.warehouse;

import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Entity.KhoHang;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Entity.TheKho;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.warehouse.AdminTonKhoRepository;
import org.mapstruct.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface TonKhoMapper {

    @Mapping(target = "quanLyId", source = "quanLy.id")
    AdminWarehouseResponse toWarehouse(KhoHang khoHang);

    @Mapping(target = "sanPhamId", source = "sanPham.id")
    AdminInventoryDetailResponse.PhienBanData toPhienBan(
            PhienBanSanPham phienBan);

    AdminInventoryDetailResponse.ComboData toCombo(
            SanPham sanPham);

    @Mapping(
            target = "canhBao",
            source = "canhBao",
            qualifiedByName = "flag")
    @Mapping(
            target = "coTonAm",
            source = "coTonAm",
            qualifiedByName = "flag")
    AdminInventoryItemResponse toItem(
            AdminTonKhoRepository.ItemProjection source);

    @Mapping(
            target = "canhBao",
            source = "canhBao",
            qualifiedByName = "flag")
    @Mapping(
            target = "coTonAm",
            source = "coTonAm",
            qualifiedByName = "flag")
    AdminInventoryWarehouseStockResponse toStock(
            AdminTonKhoRepository.StockProjection source);

    @Mapping(
            target = "cauHinhHopLe",
            source = "hopLe",
            qualifiedByName = "flag")
    @Mapping(target = "tonKhoTheoKho", ignore = true)
    AdminInventoryDetailResponse.ThanhPhanData toThanhPhan(
            AdminTonKhoRepository.ComponentProjection source);

    @Mapping(target = "phienBanId", source = "phienBan.id")
    @Mapping(target = "khoHangId", source = "khoHang.id")
    @Mapping(
            target = "ngayTao",
            source = "ngayTao",
            qualifiedByName = "inventoryDate")
    AdminInventoryLedgerResponse toLedger(
            TheKho theKho,
            @Context ZoneId zoneId);

    default Short map(TrangThaiCoBanEnum value) {
        return value == null ? null : value.getValue();
    }

    @Named("flag")
    default Boolean flag(Integer value) {
        return value != null && value != 0;
    }

    @Named("inventoryDate")
    default OffsetDateTime inventoryDate(
            LocalDateTime value,
            @Context ZoneId zoneId) {

        return value == null
                ? null
                : value.atZone(zoneId).toOffsetDateTime();
    }
}