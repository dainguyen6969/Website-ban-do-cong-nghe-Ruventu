package com.example.dantruventu.Mapper.product;

import com.example.dantruventu.DTO.Request.product.AdminBrandRequest;
import com.example.dantruventu.DTO.Response.product.AdminBrandDetailResponse;
import com.example.dantruventu.DTO.Response.product.AdminBrandListItemResponse;
import com.example.dantruventu.DTO.Response.product.AdminBrandResponse;
import com.example.dantruventu.DTO.Response.product.AdminBrandStatusResponse;
import com.example.dantruventu.Entity.ThuongHieu;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ThuongHieuMapper {

  @Mapping(target = "soLuongSanPham", ignore = true)
  AdminBrandListItemResponse toListItem(ThuongHieu thuongHieu);

  @Mapping(target = "sanPham", ignore = true)
  AdminBrandDetailResponse toDetail(ThuongHieu thuongHieu);

  AdminBrandResponse toResponse(ThuongHieu thuongHieu);

  AdminBrandStatusResponse toStatusResponse(ThuongHieu thuongHieu);

  AdminBrandDetailResponse.ProductData toProductData(
      ThuongHieuRepository.BrandProductProjection product);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "duongDanUrl", ignore = true)
  @Mapping(target = "danhSachSanPham", ignore = true)
  ThuongHieu toEntity(AdminBrandRequest request);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "duongDanUrl", ignore = true)
  @Mapping(target = "danhSachSanPham", ignore = true)
  void updateEntity(AdminBrandRequest request, @MappingTarget ThuongHieu thuongHieu);

  default Short map(TrangThaiCoBanEnum value) {
    return value == null ? null : value.getValue();
  }

  default TrangThaiCoBanEnum map(Short value) {
    return value == null ? null : TrangThaiCoBanEnum.fromValue(value);
  }
}
