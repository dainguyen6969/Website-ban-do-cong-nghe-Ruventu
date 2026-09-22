package com.example.dantruventu.Mapper.order;

import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface AdminDeliveryMapper {

  @Mapping(target = "donHangId", source = "donHang.id")
  @Mapping(target = "maDonHang", source = "donHang.maDonHang")
  @Mapping(target = "trangThaiDongGoi", source = "donHang.trangThaiDongGoi")
  @Mapping(target = "tenNguoiNhan", source = "donHang.tenNguoiNhan")
  @Mapping(target = "sdtNguoiNhan", source = "donHang.sdtNguoiNhan")
  @Mapping(target = "diaChiGiaoHang", source = "donHang.diaChiGiaoHang")
  @Mapping(target = "ghiChu", source = "donHang.ghiChu")
  ListItem toListItem(PhieuGiaoHang entity, @Context ZoneId zone);

  @Mapping(target = "nguoiNhan", source = "donHang")
  @Mapping(target = "tongTien", source = "donHang")
  @Mapping(target = "ghiChu", source = "donHang.ghiChu")
  @Mapping(target = "sanPham", ignore = true)
  Detail toDetail(PhieuGiaoHang entity, @Context ZoneId zone);

  @Mapping(target = "phieuTraHang", ignore = true)
  Action toAction(PhieuGiaoHang entity, @Context ZoneId zone);

  PartnerData toPartner(DoiTacVanChuyen entity);

  OrderData toOrder(DonHang entity);

  RecipientData toRecipient(DonHang entity);

  @Mapping(target = "tongTienVat", ignore = true)
  TotalData toTotal(DonHang entity);

  @Mapping(target = "chiTietDonHangId", source = "id")
  @Mapping(target = "phienBanId", source = "phienBan.id")
  @Mapping(target = "maSanPham", source = "phienBan.sanPham.maSanPham")
  @Mapping(target = "tenSanPham", source = "phienBan.sanPham.tenSanPham")
  @Mapping(target = "tenPhienBan", source = "phienBan.tenPhienBan")
  @Mapping(target = "thueVat", ignore = true)
  @Mapping(target = "tienChietKhau", ignore = true)
  @Mapping(target = "tienVat", ignore = true)
  @Mapping(target = "quanLySerial", ignore = true)
  ProductData toProduct(ChiTietDonHang entity);

  @Mapping(target = "khachHangId", source = "khachHang.id")
  @Mapping(target = "canHoanTien", ignore = true)
  ReturnData toReturn(PhieuTraHang entity);

  default Short map(TrangThaiCoBanEnum value) {
    return value == null ? null : value.getValue();
  }

  default OffsetDateTime map(LocalDateTime value, @Context ZoneId zone) {

    return value == null ? null : value.atZone(zone).toOffsetDateTime();
  }
}
