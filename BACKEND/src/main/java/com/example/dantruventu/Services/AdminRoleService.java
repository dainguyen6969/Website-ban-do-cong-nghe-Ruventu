package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.role.CreateRoleRequest;
import com.example.dantruventu.DTO.Request.role.UpdateRoleRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.role.AdminRoleListResponse;
import com.example.dantruventu.DTO.Response.role.RoleListItemResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import com.example.dantruventu.Specification.RoleSpecification;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminRoleService {

  private final VaiTroRepository vaiTroRepository;
  private final NguoiDungRepository nguoiDungRepository;

  private static final String PROTECTED_ROLE_NAME = "ADMIN";
  private static final String CUSTOMER_ROLE_NAME = "USER";

  private static final Set<String> WARRANTY_STAFF_EVENTS =
      Set.of(
          "GHI_KET_LUAN",
          "GUI_DON_VI",
          "DON_VI_TIEP_NHAN",
          "YEU_CAU_THU_HOI",
          "NHAN_LAI",
          "BAT_DAU_CONG_VIEC",
          "CAP_NHAT_TIEN_DO",
          "YEU_CAU_DUNG");

  private static final List<String> CRUD = List.of("xem", "them", "sua", "xoa");

  private static final Map<String, List<String>> ASSIGNABLE_ACTIONS =
      Map.ofEntries(
          Map.entry("tong_quat", List.of("xem")),
          Map.entry("san_pham", CRUD),
          Map.entry("danh_muc", CRUD),
          Map.entry("combo_san_pham", CRUD),
          Map.entry("kho_hang", List.of("xem", "sua")),
          Map.entry("nhap_hang", CRUD),
          Map.entry("kiem_hang", List.of("xem", "them", "sua")),
          Map.entry("ban_hang_pos", List.of("xem", "them")),
          Map.entry("don_hang", CRUD),
          Map.entry("giao_hang", List.of("xem", "them", "sua")),
          Map.entry("giao_hang_duoc_phan_cong", List.of("xem", "sua")),
          Map.entry("khach_tra_hang", CRUD),
          Map.entry("khach_hang", CRUD),
          Map.entry("nha_cung_cap", CRUD),
          Map.entry("doi_tac_van_chuyen", CRUD),
          Map.entry("khuyen_mai", CRUD),
          Map.entry("bao_hanh", List.of("xem", "them", "sua")),
          Map.entry("so_quy", List.of("xem", "them", "sua")),
          Map.entry("bao_cao", List.of("xem")));

  private static final Map<String, List<String>> ADMIN_ONLY_ACTIONS =
      Map.of("nhan_vien", CRUD, "vai_tro_quyen", CRUD);

  private VaiTro activeRole(Object principal) {
    if (!(principal instanceof NguoiDung user)
        || user.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      return null;
    }

    VaiTro role = user.getVaiTro();
    if (role == null || role.getMaVaiTro() == null || role.getMaVaiTro().isBlank()) {
      return null;
    }
    return role;
  }

  public boolean isSystemAdmin(Object principal) {
    VaiTro role = activeRole(principal);
    return role != null && PROTECTED_ROLE_NAME.equals(role.getMaVaiTro());
  }

  public Map<String, List<String>> effectivePermissions(Object principal) {
    VaiTro role = activeRole(principal);
    if (role == null || CUSTOMER_ROLE_NAME.equals(role.getMaVaiTro())) {
      return Map.of();
    }

    Map<String, List<String>> result = new LinkedHashMap<>();
    if (PROTECTED_ROLE_NAME.equals(role.getMaVaiTro())) {
      result.putAll(ASSIGNABLE_ACTIONS);
      result.putAll(ADMIN_ONLY_ACTIONS);
      return result;
    }

    Map<String, List<String>> stored = role.getQuyen();
    if (stored == null) return Map.of();

    ASSIGNABLE_ACTIONS.forEach(
        (module, allowed) -> {
          List<String> granted = stored.get(module);
          if (granted != null) {
            List<String> actions = allowed.stream().filter(granted::contains).toList();
            if (!actions.isEmpty()) result.put(module, actions);
          }
        });
    return result;
  }

  @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
  public Map<String, List<String>> effectivePermissionsForUser(Long userId, long authVersion) {
    return nguoiDungRepository
        .findByIdWithVaiTro(userId)
        .filter(user -> user.getPhienBanXacThuc() == authVersion)
        .map(this::effectivePermissions)
        .orElseGet(Map::of);
  }

  public boolean hasPermission(Object principal, String module, String action) {
    if (module == null || action == null) return false;
    return effectivePermissions(principal).getOrDefault(module, List.of()).contains(action);
  }

  public boolean hasModuleAction(Object principal, String module, String action) {
    var actions = effectivePermissions(principal).getOrDefault(module, List.of());
    return actions.contains("xem") && actions.contains(action);
  }

  public boolean canViewDeliveries(Object principal) {
    return hasModuleAction(principal, "giao_hang", "xem")
        || hasModuleAction(principal, "giao_hang_duoc_phan_cong", "xem");
  }

  public boolean canChangeDeliveryStatus(Object principal) {
    return hasModuleAction(principal, "giao_hang", "sua")
        || hasModuleAction(principal, "giao_hang_duoc_phan_cong", "sua");
  }

  public Long deliveryStatusAssigneeId(NguoiDung actor) {
    if (hasModuleAction(actor, "giao_hang", "sua")) {
      return null;
    }
    if (actor != null
        && actor.getId() != null
        && hasModuleAction(actor, "giao_hang_duoc_phan_cong", "sua")) {
      return actor.getId();
    }
    throw new AppException(ErrorCode.FORBIDDEN);
  }

  public Long deliveryAssigneeId(NguoiDung actor) {
    if (hasModuleAction(actor, "giao_hang", "xem")) {
      return null;
    }
    if (actor != null
        && actor.getId() != null
        && hasModuleAction(actor, "giao_hang_duoc_phan_cong", "xem")) {
      return actor.getId();
    }
    throw new AppException(ErrorCode.FORBIDDEN);
  }

  public boolean canSaveWarrantyEvent(Object principal, Object event) {
    return isSystemAdmin(principal)
        || (event instanceof String type
            && WARRANTY_STAFF_EVENTS.contains(type.trim())
            && hasModuleAction(principal, "bao_hanh", "sua"));
  }

  public Map<String, Object> getMyPermissions(Object principal) {
    VaiTro role = activeRole(principal);
    if (role == null) throw new AppException(ErrorCode.FORBIDDEN);

    NguoiDung user = (NguoiDung) principal;
    String accountType =
        switch (role.getMaVaiTro()) {
          case PROTECTED_ROLE_NAME -> "QUAN_TRI";
          case CUSTOMER_ROLE_NAME -> "KHACH_HANG";
          default -> "NHAN_VIEN";
        };

    return Map.of(
        "nguoi_dung_id", user.getId(),
        "trang_thai", user.getTrangThai().getValue(),
        "loai_tai_khoan", accountType,
        "vai_tro",
            Map.of(
                "id", role.getId(),
                "ma_vai_tro", role.getMaVaiTro(),
                "ten_vai_tro", role.getTenVaiTro(),
                "phien_ban", role.getPhienBan()),
        "quyen", effectivePermissions(user));
  }

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
            .map(role -> toResponse(role, userCountMap.getOrDefault(role.getId(), 0L)))
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

    VaiTro vaiTro =
        VaiTro.builder()
            .tenVaiTro(trimmedName)
            .moTa(moTa)
            .quyen(validatePermissions(request.getQuyen()))
            .build();

    return toResponse(vaiTroRepository.saveAndFlush(vaiTro), 0L);
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

    return toResponse(role, soLuongNhanVien);
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
          ErrorCode.CANNOT_EDIT_PROTECTED_ROLE, "Không thể chỉnh sửa vai trò hệ thống mặc định.");
    }

    if (request.getTenVaiTro() == null || request.getTenVaiTro().trim().isBlank()) {
      throw new AppException(
          ErrorCode.ROLE_NAME_REQUIRED, "Tên vai trò để trống hoặc dữ liệu không hợp lệ.");
    }

    String trimmedName = request.getTenVaiTro().trim();

    if (vaiTroRepository.existsByTrimmedTenVaiTroIgnoreCaseAndIdNot(trimmedName, id)) {
      throw new AppException(ErrorCode.ROLE_NAME_EXISTS, "Tên vai trò đã tồn tại.");
    }

    if (request.getPhienBan() == null) {
      throw new AppException(ErrorCode.INVALID_DATA, "Thiếu trường phien_ban.");
    }
    if (request.getPhienBan().longValue() != role.getPhienBan()) {
      throw new AppException(ErrorCode.ROLE_VERSION_CONFLICT);
    }

    role.setQuyen(validatePermissions(request.getQuyen()));

    role.setTenVaiTro(trimmedName);

    if (hasMoTa) {
      String newMoTa =
          (request.getMoTa() == null || request.getMoTa().trim().isEmpty())
              ? null
              : request.getMoTa().trim();
      role.setMoTa(newMoTa);
    }

    VaiTro savedRole;
    try {
      savedRole = vaiTroRepository.saveAndFlush(role);
    } catch (OptimisticLockingFailureException exception) {
      throw new AppException(ErrorCode.ROLE_VERSION_CONFLICT);
    }

    long soLuongNhanVien = nguoiDungRepository.countByVaiTroId(savedRole.getId());
    return toResponse(savedRole, soLuongNhanVien);
  }

  @Transactional
  public void deleteRole(Long id) {

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
          ErrorCode.CANNOT_EDIT_PROTECTED_ROLE, "Không thể xóa vai trò hệ thống mặc định.");
    }

    long soNhanVien = nguoiDungRepository.countByVaiTroId(id);

    if (soNhanVien > 0) {
      throw new AppException(
          ErrorCode.ROLE_HAS_EMPLOYEES, "Vai trò đang có nhân viên, không thể xóa.");
    }

    try {
      vaiTroRepository.delete(role);
      vaiTroRepository.flush();
    } catch (OptimisticLockingFailureException exception) {
      throw new AppException(ErrorCode.ROLE_VERSION_CONFLICT);
    }
  }

  private RoleListItemResponse toResponse(VaiTro role, long employeeCount) {
    return RoleListItemResponse.builder()
        .id(role.getId())
        .maVaiTro(role.getMaVaiTro())
        .tenVaiTro(role.getTenVaiTro())
        .moTa(role.getMoTa())
        .quyen(role.getQuyen())
        .phienBan(role.getPhienBan())
        .soLuongNhanVien(employeeCount)
        .build();
  }

  private Map<String, List<String>> validatePermissions(Map<String, List<String>> requested) {
    if (requested == null) {
      throw new AppException(ErrorCode.INVALID_DATA, "Thiếu trường quyen.");
    }

    Map<String, List<String>> normalized = new LinkedHashMap<>();
    for (var entry : requested.entrySet()) {
      String module = entry.getKey();
      List<String> actions = entry.getValue();
      List<String> allowed = module == null ? null : ASSIGNABLE_ACTIONS.get(module);

      if (allowed == null
          || actions == null
          || actions.stream().anyMatch(action -> action == null || !allowed.contains(action))) {
        throw new AppException(
            ErrorCode.INVALID_DATA, "Module hoặc thao tác không được cấp: " + module);
      }

      if (!actions.isEmpty()) {
        normalized.put(module, allowed.stream().filter(actions::contains).toList());
      }
    }
    return normalized;
  }

  private boolean isCustomerRole(VaiTro vaiTro) {
    return vaiTro != null && CUSTOMER_ROLE_NAME.equals(vaiTro.getMaVaiTro());
  }

  private boolean isProtectedAdminRole(VaiTro vaiTro) {
    return vaiTro != null && PROTECTED_ROLE_NAME.equals(vaiTro.getMaVaiTro());
  }
}
