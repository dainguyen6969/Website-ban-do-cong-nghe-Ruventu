package com.example.dantruventu.Mapper.cashbook;

import com.example.dantruventu.DTO.Response.warehouse.AdminPurchaseOrderListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminPurchaseOrderStatusResponse;
import com.example.dantruventu.Entity.DonNhapHang;
import org.springframework.stereotype.Component;

@Component
public class AdminPurchaseOrderMapper {

  public AdminPurchaseOrderListResponse.Item toListItem(DonNhapHang entity) {

    return AdminPurchaseOrderListResponse.Item.builder()
        .id(entity.getId())
        .maDonNhap(entity.getMaDonNhap())
        .nhaCungCap(
            AdminPurchaseOrderListResponse.Supplier.builder()
                .id(entity.getNhaCungCap().getId())
                .maNhaCungCap(entity.getNhaCungCap().getMaNhaCungCap())
                .tenNhaCungCap(entity.getNhaCungCap().getTenNhaCungCap())
                .build())
        .trangThaiNhap(entity.getTrangThaiNhap())
        .trangThaiThanhToan(entity.getTrangThaiThanhToan())
        .tongTien(entity.getTongTien())
        .ngayTao(entity.getNgayTao())
        .build();
  }

  public AdminPurchaseOrderStatusResponse toStatusResponse(DonNhapHang entity) {

    return AdminPurchaseOrderStatusResponse.builder()
        .id(entity.getId())
        .maDonNhap(entity.getMaDonNhap())
        .tongTien(entity.getTongTien())
        .trangThaiNhap(entity.getTrangThaiNhap())
        .trangThaiThanhToan(entity.getTrangThaiThanhToan())
        .build();
  }
}
