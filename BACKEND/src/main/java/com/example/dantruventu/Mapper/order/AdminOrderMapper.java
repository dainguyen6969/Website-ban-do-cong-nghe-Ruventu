package com.example.dantruventu.Mapper.order;

import com.example.dantruventu.DTO.Response.order.AdminOrderResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AdminOrderMapper {

  @Mapping(target = "tenKhachHang", source = "khachHang.hoTen")
  @Mapping(target = "soDienThoaiKhachHang", source = "khachHang.soDienThoai")
  AdminOrderResponse.ListItem toListItem(DonHang entity, @Context ZoneId zone);

  AdminOrderResponse.Action toAction(AdminSalesResponse.Order source);

  AdminOrderResponse.CashDocument toCashDocument(SoQuyThuChi entity, @Context ZoneId zone);

  default OffsetDateTime map(LocalDateTime value, @Context ZoneId zone) {

    return value == null ? null : value.atZone(zone).toOffsetDateTime();
  }
}
