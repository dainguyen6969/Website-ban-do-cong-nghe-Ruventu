package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.role.CreateRoleRequest;
import com.example.dantruventu.DTO.Request.role.UpdateRoleRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.role.AdminRoleListResponse;
import com.example.dantruventu.DTO.Response.role.RoleListItemResponse;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import com.example.dantruventu.Specification.RoleSpecification;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminRoleService {

  private final VaiTroRepository vaiTroRepository;
  private final NguoiDungRepository nguoiDungRepository;

  private static final String PROTECTED_ROLE_NAME = "ADMIN";
  private static final String CUSTOMER_ROLE_NAME = "USER";

  public AdminRoleListResponse getRoles(String keyword, int page, int limit) {

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(
          ErrorCode.INVALID_ROLE_SEARCH_PARAM, "Tham số tìm kiếm/phân trang không hợp lệ.");
    }

    if (keyword != null && keyword.length() > 100) {
      throw new AppException(
          ErrorCode.INVALID_ROLE_SEARCH_PARAM, "Tham số tìm kiếm/phân trang không hợp lệ.");
    }

    var specification = RoleSpecification.build(keyword);

    var pageable = PageRequest.of(page, limit, Sort.by("id").ascending());

    Page<VaiTro> rolePage = vaiTroRepository.findAll(specification, pageable);

    List<VaiTro> content = rolePage.getContent();
    List<Long> roleIds = content.stream().map(VaiTro::getId).toList();
    Map<Long, Long> userCountMap = new HashMap<>();

    if (!roleIds.isEmpty()) {
      List<Object[]> countResults = nguoiDungRepository.countUsersGroupedByRoleIds(roleIds);
      for (Object[] row : countResults) {
        if (row[0] != null && row[1] != null) {
          Long roleId = ((Number) row[0]).longValue();
          Long count = ((Number) row[1]).longValue();
          userCountMap.put(roleId, count);
        }
      }
    }

    List<RoleListItemResponse> items =
        content.stream()
            .map(
                role ->
                    RoleListItemResponse.builder()
                        .id(role.getId())
                        .tenVaiTro(role.getTenVaiTro())
                        .moTa(role.getMoTa())
                        .soLuongNhanVien(userCountMap.getOrDefault(role.getId(), 0L))
                        .build())
            .toList();

    long totalElements = rolePage.getTotalElements();
    int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / limit);

    var pagination =
        PaginationResponse.builder()
            .page(rolePage.getNumber())
            .limit(rolePage.getSize())
            .totalElements(totalElements)
            .totalPages(totalPages)
            .build();

    return AdminRoleListResponse.builder().items(items).pagination(pagination).build();
  }

  @Transactional
  public RoleListItemResponse createRole(CreateRoleRequest request) {

    if (request == null
        || request.getTenVaiTro() == null
        || request.getTenVaiTro().trim().isBlank()) {
      throw new AppException(
          ErrorCode.ROLE_NAME_REQUIRED, "Tên vai trò để trống hoặc dữ liệu không hợp lệ.");
    }

    String trimmedName = request.getTenVaiTro().trim();

    if (vaiTroRepository.existsByTrimmedTenVaiTroIgnoreCase(trimmedName)
        || vaiTroRepository.existsByTenVaiTroIgnoreCase(trimmedName)) {
      throw new AppException(ErrorCode.ROLE_NAME_EXISTS, "Tên vai trò đã tồn tại.");
    }

    String moTa = null;
    if (request.getMoTa() != null && !request.getMoTa().trim().isEmpty()) {
      moTa = request.getMoTa().trim();
    }

    VaiTro vaiTro = VaiTro.builder().tenVaiTro(trimmedName).moTa(moTa).build();

    VaiTro savedRole = vaiTroRepository.save(vaiTro);

    return RoleListItemResponse.builder()
        .id(savedRole.getId())
        .tenVaiTro(savedRole.getTenVaiTro())
        .moTa(savedRole.getMoTa())
        .soLuongNhanVien(0L)
        .build();
  }

  public RoleListItemResponse getRole(Long id) {

    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_ID, "ID không hợp lệ.");
    }

    VaiTro role =
        vaiTroRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.ROLE_NOT_FOUND_OR_CUSTOMER,
                        "Vai trò không tồn tại hoặc là vai trò Khách hàng ngoài phạm vi quản lý."));

    if (isCustomerRole(role)) {
      throw new AppException(
          ErrorCode.ROLE_NOT_FOUND_OR_CUSTOMER,
          "Vai trò không tồn tại hoặc là vai trò Khách hàng ngoài phạm vi quản lý.");
    }

    long soLuongNhanVien = nguoiDungRepository.countByVaiTroId(id);

    return RoleListItemResponse.builder()
        .id(role.getId())
        .tenVaiTro(role.getTenVaiTro())
        .moTa(role.getMoTa())
        .soLuongNhanVien(soLuongNhanVien)
        .build();
  }

  @Transactional
  public RoleListItemResponse updateRole(Long id, UpdateRoleRequest request, boolean hasMoTa) {

    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_ID, "ID không hợp lệ.");
    }

    VaiTro role =
        vaiTroRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.ROLE_NOT_FOUND_OR_CUSTOMER,
                        "Vai trò không tồn tại hoặc là vai trò Khách hàng ngoài phạm vi quản lý."));

    if (isCustomerRole(role)) {
      throw new AppException(
          ErrorCode.ROLE_NOT_FOUND_OR_CUSTOMER,
          "Vai trò không tồn tại hoặc là vai trò Khách hàng ngoài phạm vi quản lý.");
    }

    if (isProtectedAdminRole(role)) {
      throw new AppException(
          ErrorCode.CANNOT_EDIT_PROTECTED_ROLE,
          "Không thể chỉnh sửa vai trò hệ thống mặc định.");
    }

    if (request.getTenVaiTro() == null || request.getTenVaiTro().trim().isBlank()) {
      throw new AppException(
          ErrorCode.ROLE_NAME_REQUIRED, "Tên vai trò để trống hoặc dữ liệu không hợp lệ.");
    }

    String trimmedName = request.getTenVaiTro().trim();

    if (vaiTroRepository.existsByTrimmedTenVaiTroIgnoreCaseAndIdNot(trimmedName, id)) {
      throw new AppException(ErrorCode.ROLE_NAME_EXISTS, "Tên vai trò đã tồn tại.");
    }

    role.setTenVaiTro(trimmedName);

    if (hasMoTa) {
      String newMoTa =
          (request.getMoTa() == null || request.getMoTa().trim().isEmpty())
              ? null
              : request.getMoTa().trim();
      role.setMoTa(newMoTa);
    }

    VaiTro savedRole = vaiTroRepository.save(role);

    long soLuongNhanVien = nguoiDungRepository.countByVaiTroId(savedRole.getId());

    return RoleListItemResponse.builder()
        .id(savedRole.getId())
        .tenVaiTro(savedRole.getTenVaiTro())
        .moTa(savedRole.getMoTa())
        .soLuongNhanVien(soLuongNhanVien)
        .build();
  }

  private boolean isCustomerRole(VaiTro vaiTro) {
    if (vaiTro == null || vaiTro.getTenVaiTro() == null) {
      return false;
    }
    String upper = vaiTro.getTenVaiTro().toUpperCase(Locale.ROOT);
    String lower = vaiTro.getTenVaiTro().toLowerCase(Locale.ROOT);
    String moTaLower = vaiTro.getMoTa() != null ? vaiTro.getMoTa().toLowerCase(Locale.ROOT) : "";
    return upper.equals(CUSTOMER_ROLE_NAME)
        || upper.equals("KHACH_HANG")
        || lower.equals("khách hàng")
        || lower.equals("khach hang")
        || moTaLower.contains("khách hàng")
        || moTaLower.contains("khach hang");
  }

  private boolean isProtectedAdminRole(VaiTro vaiTro) {
    if (vaiTro == null || vaiTro.getTenVaiTro() == null) {
      return false;
    }
    return vaiTro.getTenVaiTro().equalsIgnoreCase(PROTECTED_ROLE_NAME);
  }
}
