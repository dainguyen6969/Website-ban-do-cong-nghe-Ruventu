package com.example.dantruventu.Mapper.product;

import com.example.dantruventu.DTO.Request.product.AdminProductCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminProductUpdateRequest;
import com.example.dantruventu.DTO.Request.product.ProductImageRequest;
import com.example.dantruventu.DTO.Request.product.ProductVariantCreateRequest;
import com.example.dantruventu.DTO.Response.product.*;
import com.example.dantruventu.Entity.AnhSanPham;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SanPhamMapper {

  ObjectMapper JSON_MAPPER = new ObjectMapper();

  AdminProductListItemResponse toListItem(SanPham sanPham);

  @Mapping(source = "danhMuc.id", target = "danhMuc.id")
  @Mapping(source = "danhMuc.tenDanhMuc", target = "danhMuc.tenDanhMuc")
  @Mapping(source = "thuongHieu.id", target = "thuongHieu.id")
  @Mapping(source = "thuongHieu.tenThuongHieu", target = "thuongHieu.tenThuongHieu")
  @Mapping(target = "anhSanPham", ignore = true)
  @Mapping(target = "danhSachPhienBan", ignore = true)
  AdminProductDetailResponse toDetailResponse(SanPham sanPham);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "danhMuc", ignore = true)
  @Mapping(target = "thuongHieu", ignore = true)
  @Mapping(target = "danhSachAnhSanPham", ignore = true)
  @Mapping(target = "danhSachPhienBan", ignore = true)
  @Mapping(target = "danhSachThanhPhanCombo", ignore = true)
  SanPham toEntity(AdminProductCreateRequest request);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "danhMuc", ignore = true)
  @Mapping(target = "thuongHieu", ignore = true)
  @Mapping(target = "loaiSanPham", ignore = true)
  @Mapping(target = "danhSachAnhSanPham", ignore = true)
  @Mapping(target = "danhSachPhienBan", ignore = true)
  @Mapping(target = "danhSachThanhPhanCombo", ignore = true)
  void updateEntity(AdminProductUpdateRequest request, @MappingTarget SanPham sanPham);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "sanPham", ignore = true)
  AnhSanPham toImageEntity(ProductImageRequest request);

  AdminProductDetailResponse.AnhSanPhamData toImageResponse(AnhSanPham anhSanPham);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "sanPham", ignore = true)
  PhienBanSanPham toVariantEntity(ProductVariantCreateRequest request);

  @Mapping(source = "sanPham.id", target = "sanPhamId")
  AdminProductVariantResponse toVariantResponse(PhienBanSanPham phienBan);

  AdminProductUpdateResponse toUpdateResponse(SanPham sanPham);

  AdminProductStatusResponse toStatusResponse(SanPham sanPham);

  default Short map(TrangThaiCoBanEnum value) {
    return value == null ? null : value.getValue();
  }

  default TrangThaiCoBanEnum map(Short value) {
    return value == null ? null : TrangThaiCoBanEnum.fromValue(value);
  }

  default String map(JsonNode value) {
    return value == null ? null : value.toString();
  }

  default JsonNode map(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return JSON_MAPPER.readTree(value);
    } catch (Exception exception) {
      throw new IllegalArgumentException("Thông số kỹ thuật không phải JSON hợp lệ", exception);
    }
  }
}
