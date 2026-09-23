package com.example.dantruventu.Mapper.order;

import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.*;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AdminSalesMapper {

  @Mapping(target = "sanPhamId", source = "sanPham.id")
  @Mapping(target = "phienBanId", source = "id")
  @Mapping(target = "maSanPham", source = "sanPham.maSanPham")
  @Mapping(target = "tenSanPham", source = "sanPham.tenSanPham")
  @Mapping(target = "loaiSanPham", source = "sanPham.loaiSanPham")
  @Mapping(target = "thueVat", source = "sanPham.thueVat")
  @Mapping(target = "donGia", source = "giaBanLe")
  AdminSalesResponse.Product toProduct(PhienBanSanPham entity);

  AdminSalesResponse.Customer toCustomer(NguoiDung entity);

  @Mapping(target = "khachHangId", source = "khachHang.id")
  @Mapping(target = "tenKhachHang", source = "khachHang.hoTen")
  @Mapping(target = "soDienThoaiKhachHang", source = "khachHang.soDienThoai")
  @Mapping(target = "nhanVienId", source = "nhanVien.id")
  AdminSalesResponse.Order toOrder(DonHang entity, @Context ZoneId zone);

  @Mapping(target = "khachHangId", source = "khachHang.id")
  @Mapping(target = "tenKhachHang", source = "khachHang.hoTen")
  @Mapping(target = "soDienThoaiKhachHang", source = "khachHang.soDienThoai")
  @Mapping(target = "nhanVienId", source = "nhanVien.id")
  AdminSalesResponse.Checkout toCheckout(DonHang entity, @Context ZoneId zone);

  @Mapping(target = "phienBanId", source = "phienBan.id")
  AdminSalesResponse.Serial toSerial(SoSerialSanPham entity);

  AdminSalesResponse.CashReceipt toCashReceipt(SoQuyThuChi entity);

  @Mapping(target = "doiTacVanChuyenId", source = "doiTacVanChuyen.id")
  AdminSalesResponse.Delivery toDelivery(PhieuGiaoHang entity);

  default OffsetDateTime map(LocalDateTime value, @Context ZoneId zone) {
    return value == null ? null : value.atZone(zone).toOffsetDateTime();
  }
}
