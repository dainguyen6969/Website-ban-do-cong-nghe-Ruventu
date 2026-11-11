package com.example.dantruventu.Services.order;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnInspectionRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnInspectionResponse;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietTraHangRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Repository.order.ThietBiBaoHanhRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminReturnInspectionService {

  private final PhieuTraHangRepository returnRepository;
  private final ChiTietTraHangRepository returnLineRepository;
  private final ThietBiBaoHanhRepository deviceRepository;
  private final SoQuyThuChiRepository cashRepository;
  private final CashbookService cashbookService;
  private final SalesProperties salesProperties;
  private final OrderEvents orderEvents;

  @Transactional
  public AdminReturnInspectionResponse inspect(
      Long id, String key, AdminReturnInspectionRequest request, NguoiDung actor) {
    if (actor == null || actor.getId() == null || actor.getId() <= 0) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }
    if (actor.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.FORBIDDEN, "Tài khoản đã bị khóa");
    }
    if (id == null || id <= 0) throw invalid("ID phiếu trả không hợp lệ");
    validateRequest(request);
    return cashbookService.executeOnce(
        CashbookService.uuidKey("TH-INSPECT-", key),
        actor,
        List.of(id, request),
        AdminReturnInspectionResponse.class,
        () -> doInspect(id, request, actor));
  }

  private AdminReturnInspectionResponse doInspect(
      Long id, AdminReturnInspectionRequest request, NguoiDung actor) {
    PhieuTraHang slip =
        returnRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));
    Map<String, Object> decoded = ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());
    Map<String, Object> saved = decoded == null ? Map.of() : decoded;
    if (slip.getTrangThaiTraHang() == TrangThaiTraHang.DA_NHAN_HANG
        || slip.getTrangThaiTraHang() == TrangThaiTraHang.DA_HOAN_TIEN
        || slip.getTrangThaiTraHang() == TrangThaiTraHang.HOAN_TAT
        || slip.getNgayNhanHang() != null
        || !items(saved, "hang_da_nhan").isEmpty()
        || returnRepository.findRefundExpenseByReturnId(id).isPresent()
        || cashRepository.findByBusinessKey("CHI-TH-" + id).isPresent()
        || cashRepository.findByMaPhieu("CHI-TH-" + id).isPresent()) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "id",
          "RETURN_ALREADY_ACCEPTED",
          "Phiếu đã chấp nhận nhập trả, không còn cho ghi bước thực tiếp nhận");
    }
    if (slip.getTrangThaiTraHang() != TrangThaiTraHang.CHO_TIEP_NHAN
        || slip.getNgayKetThuc() != null
        || saved.get("ban_giao_lai") != null
        || saved.get("muc_dich_ket_thuc") != null) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "id",
          "RETURN_INSPECTION_NOT_ALLOWED",
          "Phiếu không còn cho phép ghi bước thực tiếp nhận");
    }
    OffsetDateTime receivedAt =
        request
            .getNgayTiepNhanThucTe()
            .atZoneSameInstant(salesProperties.zone())
            .toOffsetDateTime()
            .withNano(0);
    if (slip.getDonHang().getNgayHoanThanh() != null
        && receivedAt.toLocalDateTime().isBefore(slip.getDonHang().getNgayHoanThanh())) {
      throw invalid("Thời điểm thực tiếp nhận không được trước lúc khách nhận đơn hàng");
    }

    Map<Long, ChiTietTraHang> lines = new HashMap<>();
    for (var line : returnLineRepository.findByPhieuTraHang_IdOrderByIdAsc(id)) {
      lines.put(line.getId(), line);
    }
    Set<Long> purchaseIds = new HashSet<>();
    for (var item : request.getHangThucNhan()) {
      ChiTietTraHang line = lines.get(item.getChiTietTraHangId());
      if (line == null) {
        throw new AppException(
            ErrorCode.NOT_FOUND,
            "hang_thuc_nhan",
            "RETURN_LINE_NOT_FOUND",
            "Chi tiết thực nhận không thuộc phiếu trả");
      }
      if (line.getChiTietDonHang() == null
          || !Objects.equals(
              line.getChiTietDonHang().getDonHang().getId(), slip.getDonHang().getId())) {
        throw inconsistent();
      }
      if (item.getThietBiId() != null) purchaseIds.add(line.getChiTietDonHang().getId());
    }
    Map<Long, ThietBiBaoHanh> devices = new HashMap<>();
    if (!purchaseIds.isEmpty()) {
      for (var device :
          deviceRepository.findCurrentDevices(purchaseIds, TrangThaiBaoHanh.HOAN_TAT)) {
        devices.put(device.getId(), device);
      }
    }

    List<Object> held = new ArrayList<>(items(saved, "hang_dang_giu"));
    if (held.isEmpty()
        && (slip.getNgayTiepNhanThucTe() != null
            || Boolean.TRUE.equals(saved.get("dang_giu_hang")))) throw inconsistent();
    Set<String> codes = new HashSet<>();
    Set<Long> seenDevices = new HashSet<>();
    for (Object raw : held) {
      if (!(raw instanceof Map<?, ?> item)
          || !(item.get("ma_muc_nhan") instanceof String code)
          || code.isBlank()
          || !codes.add(code)) throw inconsistent();
      if (item.get("thiet_bi_id") instanceof Number device) {
        if (!seenDevices.add(device.longValue())) throw inconsistent();
      }
    }

    List<AdminReturnInspectionResponse.Item> result = new ArrayList<>();
    List<Map<String, Object>> newSnapshots = new ArrayList<>();
    for (var input : request.getHangThucNhan()) {
      var line = lines.get(input.getChiTietTraHangId());
      ThietBiBaoHanh device = null;
      if (input.getThietBiId() != null) {
        device = devices.get(input.getThietBiId());
        if (device == null
            || device.getChiTietDonHang() == null
            || !Objects.equals(device.getChiTietDonHang().getId(), line.getChiTietDonHang().getId())
            || input.getSoLuong() != 1
            || (clean(input.getSoSerial()) != null
                && (device.getSoSerial() == null
                    || !Objects.equals(
                        clean(input.getSoSerial()), device.getSoSerial().getSoSerial())))) {
          throw new AppException(
              ErrorCode.UNPROCESSABLE_ENTITY,
              "hang_thuc_nhan",
              "CURRENT_DEVICE_IDENTIFICATION_INVALID",
              "Nhận dạng không khớp thiết bị hiện hành; dùng thiet_bi_id=null nếu chưa xác minh");
        }
        if (!seenDevices.add(device.getId())) {
          throw new AppException(
              ErrorCode.CONFLICT,
              "hang_thuc_nhan",
              "RETURN_DEVICE_ALREADY_HELD",
              "Thiết bị đã có trong danh sách hàng đang giữ");
        }
      }
      String code;
      do {
        code = "HN-" + UUID.randomUUID();
      } while (!codes.add(code));
      var accessories = input.getPhuKien().stream().map(String::strip).toList();
      var received =
          new AdminReturnInspectionResponse.Item(
              code,
              input.getChiTietTraHangId(),
              input.getThietBiId(),
              input.getSoLuong(),
              clean(input.getSoSerial()),
              clean(input.getDauHieuNhanDang()),
              input.getTinhTrang().strip(),
              accessories);
      result.add(received);
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("ma_muc_nhan", code);
      item.put("chi_tiet_tra_hang_id", input.getChiTietTraHangId());
      item.put("chi_tiet_don_hang_id", line.getChiTietDonHang().getId());
      item.put("thiet_bi_id", input.getThietBiId());
      item.put("phien_ban_id", device == null ? null : device.getPhienBan().getId());
      item.put(
          "so_serial_id",
          device == null || device.getSoSerial() == null ? null : device.getSoSerial().getId());
      item.put("ngay_tiep_nhan_thuc_te", receivedAt.toString());
      item.put("so_luong", input.getSoLuong());
      item.put("so_serial", received.soSerial());
      item.put("dau_hieu_nhan_dang", received.dauHieuNhanDang());
      item.put("tinh_trang", received.tinhTrang());
      item.put("phu_kien", accessories);
      newSnapshots.add(item);
    }
    held.addAll(newSnapshots);
    var proof = request.getBangChungUrls().stream().map(String::strip).toList();
    Map<String, Object> event = new LinkedHashMap<>();
    event.put("ngay_tiep_nhan_thuc_te", receivedAt.toString());
    event.put("nguoi_giao", request.getNguoiGiao().strip());
    event.put("hang_thuc_nhan", newSnapshots);
    event.put("ket_qua_kiem_tra", request.getKetQuaKiemTra().strip());
    event.put("bang_chung_urls", proof);
    event.put("nguoi_thuc_hien_id", actor.getId());
    event.put(
        "thoi_diem_ghi_nhan", OffsetDateTime.now(salesProperties.zone()).withNano(0).toString());
    List<Object> history = new ArrayList<>(items(saved, "lich_su_tiep_nhan"));
    history.add(event);
    Map<String, Object> updated = new LinkedHashMap<>(saved);
    updated.put("lich_su_tiep_nhan", history);
    updated.put("hang_dang_giu", held);
    updated.put("dang_giu_hang", true);
    updated.put("ket_qua_kiem_tra", request.getKetQuaKiemTra().strip());
    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(updated));
    if (slip.getNgayTiepNhanThucTe() == null
        || receivedAt.toLocalDateTime().isBefore(slip.getNgayTiepNhanThucTe())) {
      slip.setNgayTiepNhanThucTe(receivedAt.toLocalDateTime());
    }
    returnRepository.saveAndFlush(slip);
    orderEvents.changed(slip.getDonHang().getId(), "RETURN_INSPECTED");
    return new AdminReturnInspectionResponse(
        id,
        slip.getTrangThaiTraHang(),
        slip.getNgayTiepNhanThucTe().atZone(salesProperties.zone()).toOffsetDateTime(),
        true,
        List.copyOf(result),
        false,
        null,
        request.getKetQuaKiemTra().strip(),
        proof);
  }

  private void validateRequest(AdminReturnInspectionRequest request) {
    if (request == null || request.getNgayTiepNhanThucTe() == null) {
      throw invalid("Vui lòng nhập thời điểm thực tiếp nhận");
    }
    if (request.getNgayTiepNhanThucTe().isAfter(OffsetDateTime.now(salesProperties.zone()))) {
      throw invalid("Thời điểm thực tiếp nhận không được ở tương lai");
    }
    if (blank(request.getNguoiGiao()) || blank(request.getKetQuaKiemTra())) {
      throw invalid("Vui lòng nhập người giao hàng và kết quả kiểm tra");
    }
    if (request.getHangThucNhan() == null
        || request.getHangThucNhan().isEmpty()
        || request.getHangThucNhan().size() > 1000)
      throw invalid("Danh sách hàng thực nhận không hợp lệ");
    if (request.getBangChungUrls() == null
        || request.getBangChungUrls().isEmpty()
        || request.getBangChungUrls().stream().anyMatch(this::blank)) {
      throw invalid("Vui lòng cung cấp bằng chứng tiếp nhận có đường dẫn hợp lệ");
    }
    for (var item : request.getHangThucNhan()) {
      if (item == null
          || item.getChiTietTraHangId() == null
          || item.getChiTietTraHangId() <= 0
          || (item.getThietBiId() != null && item.getThietBiId() <= 0)
          || item.getSoLuong() == null
          || item.getSoLuong() <= 0
          || blank(item.getTinhTrang())
          || item.getPhuKien() == null
          || item.getPhuKien().stream().anyMatch(this::blank)) {
        throw invalid(
            "Mục thực nhận phải đủ chi tiết phiếu, số lượng dương, tình trạng và phụ kiện hợp lệ");
      }
      if (item.getThietBiId() == null
          && blank(item.getSoSerial())
          && blank(item.getDauHieuNhanDang())) {
        throw invalid("Hàng chưa xác minh thiết bị phải có serial hoặc dấu hiệu nhận dạng thực tế");
      }
    }
  }

  private List<?> items(Map<String, Object> saved, String key) {
    Object value = saved.get(key);
    if (value == null) return List.of();
    if (value instanceof List<?> list) return list;
    throw inconsistent();
  }

  private String clean(String text) {
    return blank(text) ? null : text.strip();
  }

  private boolean blank(String text) {
    return text == null || text.isBlank();
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException inconsistent() {
    return new AppException(
        ErrorCode.CONFLICT,
        "id",
        "RETURN_CUSTODY_INCONSISTENT",
        "Dữ liệu hàng đang giữ không nhất quán; cần đối chiếu trước khi tiếp nhận thêm");
  }
}
