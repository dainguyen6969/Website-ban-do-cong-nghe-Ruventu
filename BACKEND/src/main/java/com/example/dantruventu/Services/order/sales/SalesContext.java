package com.example.dantruventu.Services.order.sales;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Entity.KhoHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.warehouse.KhoHangRepository;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SalesContext {

  private final NguoiDungRepository userRepository;
  private final KhoHangRepository warehouseRepository;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long defaultWarehouseId;

  public Long defaultWarehouseId() {
    return defaultWarehouseId;
  }

  public KhoHang warehouse(Long id) {

    if (!Objects.equals(id, defaultWarehouseId)) {
      throw invalid("Chỉ hỗ trợ kho mặc định " + defaultWarehouseId);
    }

    KhoHang warehouse =
        warehouseRepository.findById(id).orElseThrow(() -> notFound("Kho hàng không tồn tại"));

    if (warehouse.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Kho hàng đã ngừng hoạt động");
    }

    if (warehouseRepository.count() != 1) {
      throw conflict(
          "Luồng bán serial hiện chỉ hỗ trợ một kho. "
              + "Cần thống nhất dữ liệu kho trước khi bán");
    }

    return warehouse;
  }

  public NguoiDung actor() {

    var authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !authentication.isAuthenticated()) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    if (!(authentication.getPrincipal() instanceof NguoiDung principal)) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    Long userId = principal.getId();

    if (userId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    NguoiDung user =
        userRepository
            .findByIdWithVaiTro(userId)
            .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

    if (user.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.FORBIDDEN, "Tài khoản đã bị khóa");
    }

    return user;
  }

  public NguoiDung customer(Long id, boolean required) {

    if (id == null) {
      if (required) {
        throw invalid("Vui lòng chọn khách hàng cho đơn Online");
      }
      return null;
    }

    NguoiDung customer =
        userRepository
            .findByIdWithVaiTro(id)
            .orElseThrow(() -> notFound("Khách hàng không tồn tại"));

    if (!"USER".equals(customer.getVaiTro().getTenVaiTro())) {
      throw invalid("Tài khoản được chọn không phải khách hàng");
    }

    if (customer.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Khách hàng đã bị khóa");
    }

    return customer;
  }

  public NguoiDung employee(Long id, NguoiDung actor) {

    if (id == null || Objects.equals(id, actor.getId())) {
      return actor;
    }

    if (!"ADMIN".equals(actor.getVaiTro().getTenVaiTro())) {
      throw new AppException(ErrorCode.FORBIDDEN, "Không có quyền chọn nhân viên thanh toán khác");
    }

    NguoiDung employee =
        userRepository
            .findByIdWithVaiTro(id)
            .orElseThrow(() -> notFound("Nhân viên không tồn tại"));

    Set<String> employeeRoles = Set.of("ADMIN", "QUAN_LY", "NHAN_VIEN_BAN_HANG", "STAFF");

    if (employee.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || !employeeRoles.contains(employee.getVaiTro().getTenVaiTro())) {
      throw conflict("Nhân viên được chọn không hợp lệ");
    }

    return employee;
  }
}
