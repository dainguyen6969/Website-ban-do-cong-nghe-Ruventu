package com.example.dantruventu.Mapper.partner;

import com.example.dantruventu.DTO.Request.partner.AdminSupplierCreateRequest;
import com.example.dantruventu.DTO.Request.partner.AdminSupplierUpdateRequest;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierDetailResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierListItemResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierResponse;
import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Entity.NhaCungCap;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface NhaCungCapMapper {

  AdminSupplierListItemResponse toListItem(NhaCungCap entity);

  AdminSupplierResponse toResponse(NhaCungCap entity);

  @Mapping(target = "lichSuDonNhap", ignore = true)
  @Mapping(target = "pagination", ignore = true)
  AdminSupplierDetailResponse toDetail(NhaCungCap entity);

  AdminSupplierDetailResponse.PurchaseHistoryData toPurchaseHistory(
      DonNhapHang entity, @Context ZoneId timeZone);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "danhSachDonNhapHang", ignore = true)
  NhaCungCap toEntity(AdminSupplierCreateRequest request);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "maNhaCungCap", ignore = true)
  @Mapping(target = "danhSachDonNhapHang", ignore = true)
  void updateEntity(AdminSupplierUpdateRequest request, @MappingTarget NhaCungCap entity);

  default Short map(TrangThaiCoBanEnum value) {
    return value == null ? null : value.getValue();
  }

  default TrangThaiCoBanEnum map(Short value) {
    return value == null ? null : TrangThaiCoBanEnum.fromValue(value);
  }

  default OffsetDateTime map(LocalDateTime value, @Context ZoneId timeZone) {

    return value == null ? null : value.atZone(timeZone).toOffsetDateTime();
  }
}
