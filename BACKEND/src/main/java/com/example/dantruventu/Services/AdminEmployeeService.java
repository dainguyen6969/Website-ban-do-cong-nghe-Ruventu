package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.employee.CreateEmployeeRequest;
import com.example.dantruventu.DTO.Request.employee.UpdateEmployeeRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.employee.AdminEmployeeListResponse;
import com.example.dantruventu.DTO.Response.employee.EmployeeListItemResponse;
import com.example.dantruventu.DTO.Response.employee.EmployeeRoleResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import com.example.dantruventu.Specification.EmployeeSpecification;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminEmployeeService {

  private final NguoiDungRepository nguoiDungRepository;
  private final VaiTroRepository vaiTroRepository;
  private final PasswordEncoder passwordEncoder;

  public AdminEmployeeListResponse getEmployees(
      String keyword, Short trangThai, Long vaiTroId, int page, int limit) {

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(
          ErrorCode.INVALID_PARAM, "Tham số không hợp lệ: page từ 0, limit từ 1 đến 100");
    }

    if (keyword != null && keyword.length() > 100) {
      throw new AppException(ErrorCode.INVALID_PARAM, "Từ khóa tìm kiếm tối đa 100 ký tự");
    }

    if (vaiTroId != null && vaiTroId <= 0) {
      throw new AppException(ErrorCode.INVALID_PARAM, "Tham số vai_tro_id không hợp lệ");
    }

    TrangThaiCoBanEnum status = null;
    if (trangThai != null) {
      if (trangThai != 0 && trangThai != 1) {
        throw new AppException(
            ErrorCode.INVALID_PARAM, "Tham số trang_thai chỉ nhận giá trị 0 hoặc 1");
      }
      status = TrangThaiCoBanEnum.fromValue(trangThai);
    }

    var specification = EmployeeSpecification.build(keyword, status, vaiTroId);

    var pageable = PageRequest.of(page, limit, Sort.by("id").descending());

    Page<NguoiDung> userPage = nguoiDungRepository.findAll(specification, pageable);

    List<EmployeeListItemResponse> items =
        userPage.getContent().stream().map(this::toListItemResponse).toList();

    long totalElements = userPage.getTotalElements();
    int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / limit);

    var pagination =
        PaginationResponse.builder()
            .page(userPage.getNumber())
            .limit(userPage.getSize())
            .totalElements(totalElements)
            .totalPages(totalPages)
            .build();

    return AdminEmployeeListResponse.builder().items(items).pagination(pagination).build();
  }

  public EmployeeListItemResponse getEmployeeDetail(Long id) {
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_ID, "ID không hợp lệ.");
    }

    NguoiDung employee =
        nguoiDungRepository
            .findByIdWithVaiTro(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.EMPLOYEE_NOT_FOUND_OR_CUSTOMER,
                        "Nhân viên không tồn tại hoặc ID thuộc khách hàng."));

    if (isCustomerRole(employee.getVaiTro())) {
      throw new AppException(
          ErrorCode.EMPLOYEE_NOT_FOUND_OR_CUSTOMER,
          "Nhân viên không tồn tại hoặc ID thuộc khách hàng.");
    }

    return toListItemResponse(employee);
  }

  @Transactional
  public EmployeeListItemResponse createEmployee(CreateEmployeeRequest request) {

    if (!request.getMatKhau().equals(request.getXacNhanMatKhau())) {
      throw new AppException(ErrorCode.INVALID_PARAM, "Mật khẩu xác nhận không khớp");
    }

    VaiTro vaiTro =
        vaiTroRepository
            .findById(request.getVaiTroId())
            .orElseThrow(
                () -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Vai trò không tồn tại."));

    if (isCustomerRole(vaiTro)) {
      throw new AppException(
          ErrorCode.INVALID_PARAM, "Không thể gán vai trò Khách hàng cho nhân viên.");
    }

    String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
    String rawPhone = request.getSoDienThoai().trim();
    String normalizedPhone = rawPhone.startsWith("+84") ? "0" + rawPhone.substring(3) : rawPhone;

    if (nguoiDungRepository.existsByEmail(email)
        || nguoiDungRepository.existsBySoDienThoai(normalizedPhone)
        || nguoiDungRepository.existsBySoDienThoai(rawPhone)) {
      throw new AppException(ErrorCode.EMAIL_OR_PHONE_EXISTS, "Email hoặc SĐT đã tồn tại.");
    }

    NguoiDung employee =
        NguoiDung.builder()
            .hoTen(request.getHoTen().trim())
            .email(email)
            .soDienThoai(normalizedPhone)
            .matKhau(passwordEncoder.encode(request.getMatKhau()))
            .vaiTro(vaiTro)
            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
            .build();

    NguoiDung savedEmployee = nguoiDungRepository.save(employee);

    return toListItemResponse(savedEmployee);
  }

  @Transactional
  public EmployeeListItemResponse updateEmployee(
      Long id, UpdateEmployeeRequest request, Long currentAdminId) {

    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_ID, "ID không hợp lệ.");
    }

    NguoiDung employee =
        nguoiDungRepository
            .findByIdWithVaiTro(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.EMPLOYEE_NOT_FOUND_OR_CUSTOMER,
                        "Nhân viên không tồn tại hoặc ID thuộc khách hàng."));

    if (isCustomerRole(employee.getVaiTro())) {
      throw new AppException(
          ErrorCode.EMPLOYEE_NOT_FOUND_OR_CUSTOMER,
          "Nhân viên không tồn tại hoặc ID thuộc khách hàng.");
    }

    if (request.getTrangThai() == null
        || (request.getTrangThai() != 0 && request.getTrangThai() != 1)) {
      throw new AppException(ErrorCode.INVALID_PARAM, "Trạng thái chỉ nhận 0 hoặc 1.");
    }

    VaiTro newVaiTro =
        vaiTroRepository
            .findById(request.getVaiTroId())
            .orElseThrow(
                () -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Vai trò không tồn tại."));

    if (isCustomerRole(newVaiTro)) {
      throw new AppException(
          ErrorCode.INVALID_PARAM, "Không thể gán vai trò Khách hàng cho nhân viên.");
    }

    if (currentAdminId != null && Objects.equals(currentAdminId, id)) {
      if (request.getTrangThai() == 0) {
        throw new AppException(
            ErrorCode.CANNOT_LOCK_OWN_ACCOUNT, "Không thể tự khóa tài khoản của chính mình.");
      }

      if (isAdminRole(employee.getVaiTro()) && !isAdminRole(newVaiTro)) {
        throw new AppException(
            ErrorCode.CANNOT_DEMOTE_OWN_ACCOUNT,
            "Không thể tự hạ quyền quản trị viên của chính mình.");
      }
    }

    String rawPhone = request.getSoDienThoai().trim();
    String normalizedPhone = rawPhone.startsWith("+84") ? "0" + rawPhone.substring(3) : rawPhone;
    if (nguoiDungRepository.existsBySoDienThoaiAndIdNot(normalizedPhone, id)
        || nguoiDungRepository.existsBySoDienThoaiAndIdNot(rawPhone, id)) {
      throw new AppException(
          ErrorCode.PHONE_ALREADY_EXISTS, "SĐT đã được sử dụng bởi người dùng khác.");
    }

    String matKhau = request.getMatKhau();
    String xacNhanMatKhau = request.getXacNhanMatKhau();
    boolean hasPass = matKhau != null && !matKhau.isBlank();
    boolean hasConfirm = xacNhanMatKhau != null && !xacNhanMatKhau.isBlank();

    if (hasPass || hasConfirm) {
      if (!hasPass || !hasConfirm) {
        throw new AppException(
            ErrorCode.INVALID_PARAM, "Phải nhập đầy đủ mật khẩu và xác nhận mật khẩu.");
      }
      if (matKhau.length() < 8) {
        throw new AppException(ErrorCode.INVALID_PARAM, "Mật khẩu phải có ít nhất 8 ký tự.");
      }
      if (!matKhau.equals(xacNhanMatKhau)) {
        throw new AppException(ErrorCode.INVALID_PARAM, "Mật khẩu xác nhận không khớp.");
      }
      employee.setMatKhau(passwordEncoder.encode(matKhau));
    }

    employee.setHoTen(request.getHoTen().trim());
    employee.setSoDienThoai(normalizedPhone);
    employee.setVaiTro(newVaiTro);
    employee.setTrangThai(TrangThaiCoBanEnum.fromValue(request.getTrangThai()));

    NguoiDung updatedEmployee = nguoiDungRepository.save(employee);

    return toListItemResponse(updatedEmployee);
  }

  private boolean isCustomerRole(VaiTro vaiTro) {
    if (vaiTro == null) {
      return false;
    }
    String roleName =
        vaiTro.getTenVaiTro() != null ? vaiTro.getTenVaiTro().toUpperCase(Locale.ROOT) : "";
    String roleDesc = vaiTro.getMoTa() != null ? vaiTro.getMoTa().toLowerCase(Locale.ROOT) : "";
    return "USER".equals(roleName)
        || "KHACH_HANG".equals(roleName)
        || "KHÁCH HÀNG".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || "KHACH HANG".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || roleDesc.contains("khách hàng")
        || roleDesc.contains("khach hang");
  }

  private boolean isAdminRole(VaiTro vaiTro) {
    if (vaiTro == null) {
      return false;
    }
    String roleName =
        vaiTro.getTenVaiTro() != null ? vaiTro.getTenVaiTro().toUpperCase(Locale.ROOT) : "";
    String roleDesc = vaiTro.getMoTa() != null ? vaiTro.getMoTa().toLowerCase(Locale.ROOT) : "";
    return "ADMIN".equals(roleName)
        || "QUAN_TRI_VIEN".equals(roleName)
        || "QUẢN TRỊ VIÊN".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || "QUAN TRI VIEN".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || roleDesc.contains("quản trị viên")
        || roleDesc.contains("quan tri vien");
  }

  private EmployeeListItemResponse toListItemResponse(NguoiDung user) {
    EmployeeRoleResponse roleResponse = null;
    if (user.getVaiTro() != null) {
      roleResponse =
          EmployeeRoleResponse.builder()
              .id(user.getVaiTro().getId())
              .tenVaiTro(user.getVaiTro().getTenVaiTro())
              .build();
    }

    return EmployeeListItemResponse.builder()
        .id(user.getId())
        .hoTen(user.getHoTen())
        .soDienThoai(user.getSoDienThoai())
        .email(user.getEmail())
        .trangThai(user.getTrangThai() != null ? user.getTrangThai().getValue() : null)
        .vaiTro(roleResponse)
        .build();
  }
}
