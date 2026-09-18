package com.example.dantruventu.Mapper.product;

import com.example.dantruventu.DTO.Request.product.AdminCategoryCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminCategoryUpdateRequest;
import com.example.dantruventu.DTO.Response.product.AdminCategoryDetailResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryListItemResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryStatusResponse;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DanhMucMapper {

  @Mapping(source = "danhMucCha.id", target = "danhMucChaId")
  @Mapping(source = "danhMucCha.tenDanhMuc", target = "tenDanhMucCha")
  @Mapping(target = "soLuongSanPham", ignore = true)
  AdminCategoryListItemResponse toListItem(DanhMuc danhMuc);

  @Mapping(source = "danhMucCha.id", target = "danhMucChaId")
  @Mapping(target = "sanPham", ignore = true)
  AdminCategoryDetailResponse toDetail(DanhMuc danhMuc);

  @Mapping(source = "danhMucCha.id", target = "danhMucChaId")
  AdminCategoryResponse toResponse(DanhMuc danhMuc);

  AdminCategoryStatusResponse toStatusResponse(DanhMuc danhMuc);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "danhMucCha", ignore = true)
  @Mapping(target = "duongDanUrl", ignore = true)
  @Mapping(target = "danhSachDanhMucCon", ignore = true)
  @Mapping(target = "danhSachSanPham", ignore = true)
  DanhMuc toEntity(AdminCategoryCreateRequest request);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "danhMucCha", ignore = true)
  @Mapping(target = "duongDanUrl", ignore = true)
  @Mapping(target = "danhSachDanhMucCon", ignore = true)
  @Mapping(target = "danhSachSanPham", ignore = true)
  void updateEntity(AdminCategoryUpdateRequest request, @MappingTarget DanhMuc danhMuc);

  default Short map(TrangThaiCoBanEnum value) {
    return value == null ? null : value.getValue();
  }

  default TrangThaiCoBanEnum map(Short value) {
    return value == null ? null : TrangThaiCoBanEnum.fromValue(value);
  }
}
