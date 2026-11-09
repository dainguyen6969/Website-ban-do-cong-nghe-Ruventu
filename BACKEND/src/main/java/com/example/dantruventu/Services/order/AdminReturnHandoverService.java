package com.example.dantruventu.Services.order;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnHandoverRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnHandoverResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminReturnHandoverService {

  private static final String UUID_PATTERN =
      "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
  private static final String INCOMPLETE_MESSAGE =
      "Chưa bàn giao lại đủ toàn bộ hàng và phụ kiện đang giữ";

  private final PhieuTraHangRepository returnRepository;
  private final SoQuyThuChiRepository cashRepository;
  private final CashbookService cashbookService;
  private final SalesProperties salesProperties;
  private final OrderEvents orderEvents;

  @Transactional
  public AdminReturnHandoverResponse handover(
      Long id, String key, AdminReturnHandoverRequest request, NguoiDung actor) {
    if (actor == null || actor.getId() == null || actor.getId() <= 0) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }
    if (actor.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.FORBIDDEN, "Tài khoản đã bị khóa");
    }
    if (id == null || id <= 0) {
      throw invalid("ID phiếu trả không hợp lệ");
    }
    validateRequest(request);
    if (key == null || !key.matches(UUID_PATTERN)) {
      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }
    return cashbookService.executeOnce(
        "TH-HANDOVER-" + key.toLowerCase(Locale.ROOT),
        actor,
        List.of(id, request),
        AdminReturnHandoverResponse.class,
        () -> doHandover(id, request, actor));
  }

  private AdminReturnHandoverResponse doHandover(
      Long id, AdminReturnHandoverRequest request, NguoiDung actor) {
    PhieuTraHang slip =
        returnRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));
    Map<String, Object> saved =
        slip.getDuLieuNhanHang() == null
            ? Map.of()
            : ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());
    if (saved == null) saved = Map.of();
    if (slip.getTrangThaiTraHang() != TrangThaiTraHang.CHO_TRA_KHACH
        || slip.getNgayKetThuc() != null
        || saved.get("ban_giao_lai") != null) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "id",
          "HANDOVER_NOT_ALLOWED",
          "Phiếu không còn cho phép bàn giao lại hàng");
    }
    if (slip.getNgayNhanHang() != null
        || !savedItems(saved, "hang_da_nhan").isEmpty()
        || returnRepository.findRefundExpenseByReturnId(id).isPresent()
        || cashRepository.findByBusinessKey("CHI-TH-" + id).isPresent()
        || cashRepository.findByMaPhieu("CHI-TH-" + id).isPresent()) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "id",
          "RETURN_ALREADY_ACCEPTED",
          "Phiếu đã chấp nhận nhập trả hoặc ghi nhận hoàn tiền, không cho bàn giao bằng thao tác này");
    }
    Object purpose = saved.get("muc_dich_ket_thuc");
    if (!"HUY".equals(purpose) && !"TU_CHOI".equals(purpose)) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "id",
          "HANDOVER_END_PURPOSE_MISSING",
          "Phiếu thiếu mục đích kết thúc hợp lệ để bàn giao lại hàng");
    }

    List<?> heldItems = savedItems(saved, "hang_dang_giu");
    if (heldItems.isEmpty()) {
      throw inconsistentCustody();
    }
    Map<String, HeldItem> heldByCode = readHeldItems(heldItems);
    OffsetDateTime handedAt =
        request.getNgayBanGiao().atZoneSameInstant(salesProperties.zone()).toOffsetDateTime();
    if (slip.getNgayTiepNhanThucTe() != null
        && handedAt.isBefore(
            slip.getNgayTiepNhanThucTe().atZone(salesProperties.zone()).toOffsetDateTime())) {
      throw invalid("Thời điểm bàn giao không được trước thời điểm thực tiếp nhận hàng");
    }
    handedAt = handedAt.withNano(0);

    List<AdminReturnHandoverResponse.Item> handedItems = new ArrayList<>();
    List<Map<String, Object>> handedItemSnapshots = new ArrayList<>();
    for (var item : request.getHangBanGiao()) {
      String code = item.getMaMucNhan().strip();
      HeldItem held = heldByCode.get(code);
      if (held == null) {
        throw new AppException(
            ErrorCode.NOT_FOUND,
            "hang_ban_giao",
            "HANDOVER_ITEM_NOT_FOUND",
            "Mục bàn giao không thuộc hàng đang giữ của phiếu");
      }
      if (held.receivedAt() != null && handedAt.isBefore(held.receivedAt())) {
        throw invalid("Thời điểm bàn giao không được trước thời điểm thực tiếp nhận hàng");
      }
      List<String> accessories = item.getPhuKien().stream().map(String::strip).toList();
      if (held.quantity() != item.getSoLuong()
          || !accessoryCounts(held.accessories()).equals(accessoryCounts(accessories))) {
        throw incomplete();
      }
      // The handover condition is a fresh observation, not a forced copy of the intake text.
      // Keep both the original custody snapshot and the actual handover description for audit.
      String condition = item.getTinhTrang().strip();
      handedItems.add(
          new AdminReturnHandoverResponse.Item(code, item.getSoLuong(), condition, accessories));
      handedItemSnapshots.add(
          Map.of(
              "ma_muc_nhan", code,
              "so_luong", item.getSoLuong(),
              "tinh_trang", condition,
              "phu_kien", accessories));
    }
    if (handedItems.size() != heldByCode.size()) {
      throw incomplete();
    }

    String recipient = request.getTenNguoiNhan().strip();
    String phone = request.getSdtNguoiNhan().strip();
    List<String> evidence = request.getBangChungUrls().stream().map(String::strip).toList();
    Map<String, Object> handover = new LinkedHashMap<>();
    handover.put("ten_nguoi_nhan", recipient);
    handover.put("sdt_nguoi_nhan", phone);
    handover.put("ngay_ban_giao", handedAt.toString());
    handover.put("hang_ban_giao", List.copyOf(handedItemSnapshots));
    handover.put("bang_chung_urls", evidence);
    handover.put("nguoi_thuc_hien_id", actor.getId());
    handover.put(
        "thoi_diem_ghi_nhan", OffsetDateTime.now(salesProperties.zone()).withNano(0).toString());

    Map<String, Object> updated = new LinkedHashMap<>(saved);
    updated.put("ban_giao_lai", handover);
    updated.put("hang_da_ban_giao", List.copyOf(heldItems));
    updated.put("hang_dang_giu", List.of());
    updated.put("dang_giu_hang", false);
    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(updated));
    slip.setTrangThaiTraHang(TrangThaiTraHang.valueOf((String) purpose));
    slip.setNgayKetThuc(handedAt.toLocalDateTime());
    returnRepository.saveAndFlush(slip);
    if (slip.getDonHang() != null) orderEvents.changed(slip.getDonHang().getId(), "RETURN_UPDATED");

    // HUY/TU_CHOI release quantities through the existing queries. No return lines are deleted.
    // Reuse only the transaction/idempotency helper; never create a stock or cash transaction.
    return new AdminReturnHandoverResponse(
        id,
        slip.getTrangThaiTraHang(),
        handedAt,
        false,
        true,
        new AdminReturnHandoverResponse.Handover(
            recipient, phone, handedAt, List.copyOf(handedItems), evidence),
        null);
  }

  private void validateRequest(AdminReturnHandoverRequest request) {
    if (request == null || !Boolean.TRUE.equals(request.getXacNhanTraDuHang())) {
      throw invalid("Phải xác nhận đã trả đủ hàng");
    }
    if (blank(request.getTenNguoiNhan()) || blank(request.getSdtNguoiNhan())) {
      throw invalid("Vui lòng nhập đủ tên và số điện thoại người nhận");
    }
    if (request.getNgayBanGiao() == null) {
      throw invalid("Vui lòng nhập thời điểm bàn giao thực tế");
    }
    if (request.getNgayBanGiao().isAfter(OffsetDateTime.now(salesProperties.zone()))) {
      throw invalid("Thời điểm bàn giao không được ở tương lai");
    }
    if (request.getBangChungUrls() == null
        || request.getBangChungUrls().isEmpty()
        || request.getBangChungUrls().stream().anyMatch(this::blank)) {
      throw invalid("Vui lòng cung cấp bằng chứng bàn giao có đường dẫn hợp lệ");
    }
    if (request.getHangBanGiao() == null || request.getHangBanGiao().isEmpty()) {
      throw invalid("Vui lòng gửi danh sách hàng đã bàn giao");
    }
    Map<String, Boolean> codes = new HashMap<>();
    for (var item : request.getHangBanGiao()) {
      if (item == null
          || blank(item.getMaMucNhan())
          || item.getSoLuong() == null
          || item.getSoLuong() <= 0
          || blank(item.getTinhTrang())
          || item.getPhuKien() == null
          || item.getPhuKien().stream().anyMatch(this::blank)) {
        throw invalid(
            "Mục bàn giao phải đủ mã nhận, số lượng dương, tình trạng và phụ kiện hợp lệ");
      }
      if (codes.putIfAbsent(item.getMaMucNhan().strip(), true) != null) {
        throw new AppException(
            ErrorCode.INVALID_DATA,
            "hang_ban_giao",
            "HANDOVER_ITEM_DUPLICATED",
            "Không được lặp mã mục nhận trong danh sách bàn giao");
      }
    }
  }

  private record HeldItem(int quantity, List<String> accessories, OffsetDateTime receivedAt) {}

  private Map<String, HeldItem> readHeldItems(List<?> items) {
    Map<String, HeldItem> result = new LinkedHashMap<>();
    for (Object value : items) {
      if (!(value instanceof Map<?, ?> item)
          || !(item.get("ma_muc_nhan") instanceof String code)
          || code.isBlank()
          || !code.equals(code.strip())
          || !(item.get("so_luong") instanceof Number quantity)
          || !(item.get("tinh_trang") instanceof String condition)
          || condition.isBlank()
          || !(item.get("phu_kien") instanceof List<?> accessoryValues)) {
        throw inconsistentCustody();
      }
      int count;
      try {
        count = new BigDecimal(quantity.toString()).intValueExact();
      } catch (ArithmeticException | NumberFormatException exception) {
        throw inconsistentCustody();
      }
      if (count <= 0) {
        throw inconsistentCustody();
      }
      List<String> accessories = new ArrayList<>();
      for (Object accessory : accessoryValues) {
        if (!(accessory instanceof String text) || text.isBlank()) {
          throw inconsistentCustody();
        }
        accessories.add(text.strip());
      }
      OffsetDateTime receivedAt = null;
      Object recordedAt = item.get("ngay_tiep_nhan_thuc_te");
      if (recordedAt != null) {
        if (!(recordedAt instanceof String date)) {
          throw inconsistentCustody();
        }
        try {
          receivedAt = OffsetDateTime.parse(date);
        } catch (DateTimeParseException exception) {
          throw inconsistentCustody();
        }
      }
      if (result.putIfAbsent(code, new HeldItem(count, List.copyOf(accessories), receivedAt))
          != null) {
        throw inconsistentCustody();
      }
    }
    return result;
  }

  private Map<String, Long> accessoryCounts(List<String> accessories) {
    Map<String, Long> result = new HashMap<>();
    accessories.forEach(value -> result.merge(value, 1L, Long::sum));
    return result;
  }

  private List<?> savedItems(Map<String, Object> saved, String field) {
    Object value = saved.get(field);
    if (value == null) {
      return List.of();
    }
    if (value instanceof List<?> items) {
      return items;
    }
    throw inconsistentCustody();
  }

  private boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException incomplete() {
    return new AppException(
        ErrorCode.UNPROCESSABLE_ENTITY, "hang_ban_giao", "HANDOVER_INCOMPLETE", INCOMPLETE_MESSAGE);
  }

  private AppException inconsistentCustody() {
    return new AppException(
        ErrorCode.CONFLICT,
        "id",
        "RETURN_CUSTODY_INCONSISTENT",
        "Dữ liệu hàng đang giữ không đầy đủ hoặc không nhất quán; cần đối chiếu trước khi bàn giao");
  }
}
