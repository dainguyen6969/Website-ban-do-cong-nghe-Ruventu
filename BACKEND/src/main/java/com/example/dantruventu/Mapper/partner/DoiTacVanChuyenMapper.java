package com.example.dantruventu.Mapper.partner;

import com.example.dantruventu.DTO.Request.partner.AdminShippingPartnerCreateRequest;
import com.example.dantruventu.DTO.Response.partner.AdminShippingDeliveryResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerListItemResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerStatusResponse;
import com.example.dantruventu.Entity.DoiTacVanChuyen;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface DoiTacVanChuyenMapper {

  AdminShippingPartnerListItemResponse toListItem(DoiTacVanChuyen entity);

  AdminShippingPartnerResponse toResponse(DoiTacVanChuyen entity, @Context ZoneId timeZone);

  AdminShippingPartnerStatusResponse toStatusResponse(
      DoiTacVanChuyen entity, @Context ZoneId timeZone);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "maDoiTac", ignore = true)
  @Mapping(target = "trangThai", ignore = true)
  @Mapping(target = "ngayTao", ignore = true)
  @Mapping(target = "ngayCapNhat", ignore = true)
  DoiTacVanChuyen toEntity(AdminShippingPartnerCreateRequest request);

  @Mapping(target = "donHangId", source = "donHang.id")
  @Mapping(target = "maDonHang", source = "donHang.maDonHang")
  @Mapping(target = "ghiChuDonHang", source = "donHang.ghiChu")
  AdminShippingDeliveryResponse toDeliveryResponse(PhieuGiaoHang entity, @Context ZoneId timeZone);

  default Short map(TrangThaiCoBanEnum value) {
    return value == null ? null : value.getValue();
  }

  default OffsetDateTime map(LocalDateTime value, @Context ZoneId timeZone) {

    return value == null ? null : value.atZone(timeZone).toOffsetDateTime();
  }
}
