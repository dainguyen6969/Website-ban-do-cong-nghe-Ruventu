package com.example.dantruventu.Mapper.warehouse;

import com.example.dantruventu.DTO.Response.warehouse.AdminSerialDetailResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialListItemResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialStatusResponse;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Enum.TrangThaiSerial;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface SoSerialSanPhamMapper {

  @Mapping(target = "phienBanId", source = "phienBan.id")
  @Mapping(target = "maSanPham", source = "phienBan.sanPham.maSanPham")
  @Mapping(target = "tenSanPham", source = "phienBan.sanPham.tenSanPham")
  @Mapping(target = "tenPhienBan", source = "phienBan.tenPhienBan")
  @Mapping(target = "maVach", source = "phienBan.maVach")
  @Mapping(target = "donHangId", expression = "java(visibleOrderId(entity))")
  AdminSerialListItemResponse toListItem(SoSerialSanPham entity, @Context ZoneId timeZone);

  @Mapping(target = "phienBanId", source = "phienBan.id")
  @Mapping(target = "maSanPham", source = "phienBan.sanPham.maSanPham")
  @Mapping(target = "tenSanPham", source = "phienBan.sanPham.tenSanPham")
  @Mapping(target = "tenPhienBan", source = "phienBan.tenPhienBan")
  @Mapping(target = "maVach", source = "phienBan.maVach")
  @Mapping(target = "donHang", expression = "java(visibleOrder(entity))")
  AdminSerialDetailResponse toDetail(SoSerialSanPham entity, @Context ZoneId timeZone);

  @Mapping(target = "donHangId", ignore = true)
  AdminSerialStatusResponse toStatus(SoSerialSanPham entity);

  AdminSerialDetailResponse.OrderData toOrder(DonHang entity);

  default boolean canShowOrder(SoSerialSanPham entity) {
    return entity.getTrangThai() == TrangThaiSerial.DA_BAN
        || entity.getTrangThai() == TrangThaiSerial.DANG_BAO_HANH;
  }

  default Long visibleOrderId(SoSerialSanPham entity) {
    if (!canShowOrder(entity) || entity.getDonHang() == null) {
      return null;
    }

    return entity.getDonHang().getId();
  }

  default AdminSerialDetailResponse.OrderData visibleOrder(SoSerialSanPham entity) {

    if (!canShowOrder(entity) || entity.getDonHang() == null) {
      return null;
    }

    return toOrder(entity.getDonHang());
  }

  default OffsetDateTime map(LocalDateTime value, @Context ZoneId timeZone) {

    return value == null ? null : value.atZone(timeZone).toOffsetDateTime();
  }
}
