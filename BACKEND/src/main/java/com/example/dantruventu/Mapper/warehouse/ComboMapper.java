package com.example.dantruventu.Mapper.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminComboCreateRequest;
import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Entity.ThanhPhanCombo;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.warehouse.ComboRepository;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ComboMapper {

  ObjectMapper JSON_MAPPER = new ObjectMapper();

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "danhMuc", ignore = true)
  @Mapping(target = "thuongHieu", ignore = true)
  @Mapping(target = "loaiSanPham", constant = "BO_PC")
  @Mapping(target = "ngayTao", ignore = true)
  @Mapping(target = "danhSachAnhSanPham", ignore = true)
  @Mapping(target = "danhSachPhienBan", ignore = true)
  @Mapping(target = "danhSachThanhPhanCombo", ignore = true)
  SanPham toEntity(AdminComboCreateRequest request);

  @Mapping(target = "phienBanId", ignore = true)
  @Mapping(target = "thanhPhan", ignore = true)
  @Mapping(target = "giaBan", ignore = true)
  @Mapping(target = "tonCoTheBan", ignore = true)
  @Mapping(target = "tonThucTe", ignore = true)
  AdminComboListItemResponse toListItem(SanPham sanPham);

  @Mapping(target = "danhMucId", source = "danhMuc.id")
  @Mapping(target = "thuongHieuId", source = "thuongHieu.id")
  @Mapping(target = "phienBanId", ignore = true)
  @Mapping(target = "khoiLuong", ignore = true)
  @Mapping(target = "giaBanLe", ignore = true)
  @Mapping(target = "giaNhap", ignore = true)
  @Mapping(target = "thanhPhan", ignore = true)
  @Mapping(target = "anhSanPham", ignore = true)
  @Mapping(target = "tonCoTheBan", ignore = true)
  @Mapping(target = "tonThucTe", ignore = true)
  @Mapping(target = "cauHinhBiKhoa", ignore = true)
  AdminComboDetailResponse toDetail(SanPham sanPham);

  @Mapping(target = "phienBanId", source = "phienBanThanhPhan.id")
  @Mapping(target = "maSanPham", source = "phienBanThanhPhan.sanPham.maSanPham")
  @Mapping(target = "tenSanPham", source = "phienBanThanhPhan.sanPham.tenSanPham")
  @Mapping(target = "maVach", source = "phienBanThanhPhan.maVach")
  @Mapping(target = "tenPhienBan", source = "phienBanThanhPhan.tenPhienBan")
  @Mapping(target = "giaBanLe", source = "phienBanThanhPhan.giaBanLe")
  @Mapping(target = "giaNhap", source = "phienBanThanhPhan.giaNhap")
  @Mapping(target = "tonCoTheBan", ignore = true)
  ComboComponentResponse toComponent(ThanhPhanCombo thanhPhan);

  @Mapping(target = "phienBanId", ignore = true)
  @Mapping(target = "thanhPhan", ignore = true)
  AdminComboMutationResponse toMutation(SanPham sanPham);

  AdminComboStatusResponse toStatus(SanPham sanPham);

  AdminComboComponentOptionResponse toComponentOption(
      ComboRepository.ComponentOptionProjection source);

  default Short map(TrangThaiCoBanEnum value) {
    return value == null ? null : value.getValue();
  }

  default TrangThaiCoBanEnum map(Short value) {
    return value == null ? null : TrangThaiCoBanEnum.fromValue(value);
  }

  default String jsonToString(JsonNode value) {
    return value == null ? null : value.toString();
  }

  default JsonNode stringToJson(String value) {
    return value == null || value.isBlank() ? null : JSON_MAPPER.readTree(value);
  }
}
