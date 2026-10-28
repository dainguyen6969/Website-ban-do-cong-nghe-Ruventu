package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyStatusResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.KetQuaXuLyBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import com.example.dantruventu.Repository.warranty.*;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminWarrantyStatusService {
  private final WarrantyWorkflowRepository repository;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;

  private record Input(
      String action,
      OffsetDateTime at,
      String note,
      String reason,
      Long deviceId,
      KetQuaXuLyBaoHanh result,
      String condition,
      List<Map<String, Object>> accessories,
      String basis,
      List<Long> resolvedDiscrepancies,
      Integer planVersion) {}

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyStatusResponse> update(
      String rawId, AdminWarrantyStatusRequest request, String key, Long actorId) {
    try {
      Long id = WarrantyReadValidation.id(rawId, ErrorCode.INVALID_WARRANTY_STATUS);
      return execute(id, validate(request), key, actorId);
    } catch (AppException | PessimisticLockingFailureException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      log.error("Updating warranty status failed", failure);
      throw new AppException(ErrorCode.WARRANTY_STATUS_FAILED);
    }
  }

  private ApiResponse<AdminWarrantyStatusResponse> execute(
      Long id, Input input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-STATUS-",
            key,
            actorId,
            "PATCH:/api/v1/admin/warranties/" + id + "/status",
            input,
            AdminWarrantyStatusResponse.class,
            ErrorCode.INVALID_WARRANTY_STATUS);
    if (replay.previous() != null) return replay.previous();
    var origin = repository.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    PhieuBaoHanh ticket = repository.lockTicket(id);
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
        || ticket.getKetQuaXuLy() == KetQuaXuLyBaoHanh.DOI_SAN_PHAM) throw transition();
    if (!Objects.equals(ticket.getDonHang().getId(), origin.orderId())
        || !Objects.equals(ticket.getThietBi().getChiTietDonHang().getId(), origin.lineId()))
      throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    Map<Long, ThietBiBaoHanh> devices = new TreeMap<>();
    devices.put(ticket.getThietBi().getId(), ticket.getThietBi());
    if (ticket.getThietBiThayThe() != null)
      devices.put(ticket.getThietBiThayThe().getId(), ticket.getThietBiThayThe());
    for (var device : devices.values()) {
      if (!Objects.equals(device.getChiTietDonHang().getId(), origin.lineId()))
        throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    }
    for (Long deviceId : new ArrayList<>(devices.keySet()))
      devices.put(deviceId, locks.lockDevice(deviceId));
    Set<Long> serialIds = new TreeSet<>();
    for (var device : devices.values())
      if (device.getSoSerial() != null) serialIds.add(device.getSoSerial().getId());
    for (Long serialId : serialIds) locks.lockSerial(serialId);
    List<LichSuBaoHanh> events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    if (events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien()))) throw transition();
    Map<String, Object> custody = history.latestSection(events, "noi_dang_giu");
    Long heldId = custody == null ? null : history.id(custody.get("thiet_bi_id"));
    if (custody == null
        || !"CUA_HANG".equals(history.text(custody.get("loai")))
        || heldId == null
        || !devices.containsKey(heldId)) throw notReady();
    if (!serialReady(ticket, devices.get(heldId))) throw notReady();
    OffsetDateTime at =
        input.at() == null ? OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")) : input.at();
    if (ticket.getNgayTiepNhan() == null
        || at.isBefore(WarrantyReadValidation.time(ticket.getNgayTiepNhan()))) throw transition();
    var latestStatus = history.latestSection(events, "trang_thai");
    if (latestStatus != null
        && latestStatus.get("thoi_diem") != null
        && at.isBefore(history.time(latestStatus.get("thoi_diem")))) throw transition();
    TrangThaiBaoHanh before = ticket.getTrangThaiXuLy();
    KetQuaXuLyBaoHanh resultBefore = ticket.getKetQuaXuLy();
    Long returning = null;
    String message;
    switch (input.action()) {
      case "BAT_DAU_KIEM_TRA" -> {
        if (before != TrangThaiBaoHanh.TIEP_NHAN
            || resultBefore != KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA) throw transition();
        if (!ticket.getThietBi().getId().equals(heldId)) throw notReady();
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DANG_KIEM_TRA);
        ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
        message = "Bắt đầu kiểm tra thiết bị";
      }
      case "KIEM_TRA_TIEP" -> {
        if (before != TrangThaiBaoHanh.DA_NHAN_LAI && before != TrangThaiBaoHanh.CHO_TRA_KHACH)
          throw transition();
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DANG_KIEM_TRA);
        ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
        message = "Quay lại kiểm tra trước bàn giao";
      }
      case "SAN_SANG_TRA" -> {
        if (before != TrangThaiBaoHanh.DANG_KIEM_TRA
            && before != TrangThaiBaoHanh.DA_NHAN_LAI
            && before != TrangThaiBaoHanh.DANG_BAO_HANH
            && before != TrangThaiBaoHanh.CHO_DOI_SAN_PHAM) throw transition();
        if (!devices.containsKey(input.deviceId())) {
          if (!repository.deviceExists(input.deviceId()))
            throw WarrantyReadException.notFound(
                ErrorCode.WARRANTY_DEVICE_NOT_FOUND,
                "thiet_bi_se_tra_id",
                "WARRANTY_DEVICE_NOT_FOUND");
          throw notReady();
        }
        returning = input.deviceId();
        ThietBiBaoHanh device = devices.get(returning);
        boolean replacement = ticket.getThietBiThayThe() != null;
        Long expected =
            replacement ? ticket.getThietBiThayThe().getId() : ticket.getThietBi().getId();
        if (!expected.equals(returning)
            || !returning.equals(heldId)
            || !Objects.equals(device.getChiTietDonHang().getId(), origin.lineId())
            || device.getChiTietTraHang() != null) throw notReady();
        if (!serialReady(ticket, device)) throw notReady();
        validateDiscrepancies(events, input.resolvedDiscrepancies(), returning);
        if (replacement) {
          validatePlan(ticket, events, input);
          message = "Sẵn sàng giao sản phẩm đổi";
        } else {
          if (input.planVersion() != null
              || input.result() == KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA
              || before == TrangThaiBaoHanh.CHO_DOI_SAN_PHAM) throw notReady();
          message =
              input.result() == KetQuaXuLyBaoHanh.SUA_THANH_CONG
                  ? "Sẵn sàng trả thiết bị đã sửa"
                  : "Sẵn sàng trả thiết bị không sửa";
        }
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.CHO_TRA_KHACH);
        // An exchange is finalized only by actual handover, never by readiness.
        ticket.setKetQuaXuLy(input.result());
      }
      default -> throw new AppException(ErrorCode.INVALID_WARRANTY_STATUS);
    }
    Map<String, Object> state = new LinkedHashMap<>();
    state.put("su_kien", input.action());
    state.put("thoi_diem", at.toString());
    state.put("trang_thai_truoc", before.name());
    state.put("trang_thai_sau", ticket.getTrangThaiXuLy().name());
    state.put("ket_qua_truoc", resultBefore == null ? null : resultBefore.name());
    state.put("ket_qua_sau", ticket.getKetQuaXuLy().name());
    state.put("thiet_bi_se_tra_id", returning);
    state.put("ghi_chu", input.note());
    state.put("ly_do", input.reason());
    state.put("tinh_trang", input.condition());
    state.put("phu_kien", input.accessories());
    state.put("can_cu_kiem_tra", input.basis());
    state.put("sai_lech_da_xu_ly", input.resolvedDiscrepancies());
    state.put("phien_ban_phuong_an", input.planVersion());
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("trang_thai", state);
    // Explicitly clear readiness when checking again; never erase previous evidence.
    payload.put("san_sang_tra", returning == null ? null : state);
    var event =
        repository.append(
            ticket, actorId, input.action(), message, mapper.writeValueAsString(payload));
    var data =
        new AdminWarrantyStatusResponse(
            id,
            input.action(),
            ticket.getTrangThaiXuLy(),
            ticket.getKetQuaXuLy(),
            returning,
            event.getId(),
            input.planVersion());
    // No invoice/payment checks here: ready is allowed before settlement; handover must recheck.
    return mutations.complete(replay, 200, message, data);
  }

  private void validatePlan(PhieuBaoHanh ticket, List<LichSuBaoHanh> events, Input input) {
    var plan = history.latestSection(events, "phuong_an_doi");
    if (plan == null
        || input.planVersion() == null
        || input.result() != KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA
        || !Boolean.TRUE.equals(plan.get("da_duyet"))
        || !Boolean.TRUE.equals(plan.get("khach_dong_y"))
        || Boolean.TRUE.equals(plan.get("da_huy"))
        || "HUY".equals(plan.get("trang_thai"))
        || Boolean.TRUE.equals(plan.get("da_ban_giao"))
        || !Objects.equals(history.id(plan.get("phien_ban")), input.planVersion().longValue())
        || !Objects.equals(history.id(plan.get("thiet_bi_cu_id")), ticket.getThietBi().getId())
        || !Objects.equals(history.id(plan.get("thiet_bi_thay_the_id")), input.deviceId())
        || history.time(plan.get("han_bao_hanh_ap_dung")) == null) throw notReady();
  }

  private boolean serialReady(PhieuBaoHanh ticket, ThietBiBaoHanh device) {
    if (device.getSoSerial() == null) return true;
    var state = device.getSoSerial().getTrangThai();
    // Hàng đổi chưa bàn giao vẫn bị giữ riêng, chưa chuyển sang quyền đã bán của khách.
    return state == TrangThaiSerial.DANG_BAO_HANH
        || ticket.getThietBiThayThe() != null
            && ticket.getThietBiThayThe().getId().equals(device.getId())
            && state == TrangThaiSerial.GIU_CHO_BAO_HANH;
  }

  private void validateDiscrepancies(
      List<LichSuBaoHanh> events, List<Long> resolving, Long returning) {
    Map<Long, Boolean> discrepancies = new LinkedHashMap<>();
    Map<Long, Long> deviceByDiscrepancy = new HashMap<>();
    for (var event : events) {
      var data = history.payload(event);
      var handover = history.object(data.get("giao_nhan"));
      // Approved contract: giao_nhan.sai_lech[] holds persisted {id, da_xu_ly, ...}.
      // A status event resolves only existing IDs; it cannot invent or delete a discrepancy.
      for (Object raw : history.array(handover == null ? null : handover.get("sai_lech"))) {
        var item = history.object(raw);
        Long id = item == null ? null : history.id(item.get("id"));
        if (id == null) throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
        Long deviceId = history.id(item.get("thiet_bi_id"));
        if (deviceId == null) deviceId = history.id(handover.get("thiet_bi_id"));
        if (deviceId != null) {
          Long oldDevice = deviceByDiscrepancy.putIfAbsent(id, deviceId);
          if (oldDevice != null && !oldDevice.equals(deviceId))
            throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
        }
        Object resolved = item.get("da_xu_ly");
        if (resolved != null && !(resolved instanceof Boolean))
          throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
        discrepancies.put(id, Boolean.TRUE.equals(resolved));
      }
      var status = history.object(data.get("trang_thai"));
      for (Object raw : history.array(status == null ? null : status.get("sai_lech_da_xu_ly"))) {
        Long id = history.id(raw);
        if (!discrepancies.containsKey(id))
          throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
        discrepancies.put(id, true);
      }
    }
    for (Long id : resolving) {
      if (!discrepancies.containsKey(id))
        throw new AppException(
            ErrorCode.INVALID_WARRANTY_STATUS,
            "ID sai lệch không thuộc lịch sử giao nhận của phiếu.");
      if (deviceByDiscrepancy.containsKey(id) && !returning.equals(deviceByDiscrepancy.get(id)))
        throw new AppException(
            ErrorCode.INVALID_WARRANTY_STATUS, "Sai lệch không thuộc thiết bị sẽ trả.");
      discrepancies.put(id, true);
    }
    for (var discrepancy : discrepancies.entrySet()) {
      // Old-device issues at the supplier must not masquerade as replacement handover issues.
      Long deviceId = deviceByDiscrepancy.get(discrepancy.getKey());
      if (!discrepancy.getValue() && (deviceId == null || returning.equals(deviceId)))
        throw notReady();
    }
  }

  private Input validate(AdminWarrantyStatusRequest r) {
    ErrorCode error = ErrorCode.INVALID_WARRANTY_STATUS;
    if (r == null) throw new AppException(error);
    String action = WarrantyWriteValidation.text(r.suKien(), true, 50, error);
    if (!Set.of("BAT_DAU_KIEM_TRA", "KIEM_TRA_TIEP", "SAN_SANG_TRA").contains(action))
      throw new AppException(error);
    if (!"SAN_SANG_TRA".equals(action)) {
      if (r.thietBiSeTraId() != null
          || r.ketQuaXuLy() != null
          || r.tinhTrang() != null
          || r.phuKien() != null
          || r.canCuKiemTra() != null
          || r.saiLechDaXuLy() != null
          || r.phienBanPhuongAn() != null) throw new AppException(error);
      if ("BAT_DAU_KIEM_TRA".equals(action)) {
        if (r.lyDo() != null) throw new AppException(error);
        return new Input(
            action,
            WarrantyWriteValidation.time(r.thoiDiem(), error),
            WarrantyWriteValidation.text(r.ghiChu(), false, 16000, error),
            null,
            null,
            null,
            null,
            List.of(),
            null,
            List.of(),
            null);
      }
      if (r.thoiDiem() != null || r.ghiChu() != null) throw new AppException(error);
      return new Input(
          action,
          null,
          null,
          WarrantyWriteValidation.text(r.lyDo(), true, 16000, error),
          null,
          null,
          null,
          List.of(),
          null,
          List.of(),
          null);
    }
    if (r.thoiDiem() != null
        || r.ghiChu() != null
        || r.phuKien() == null
        || r.saiLechDaXuLy() == null) throw new AppException(error);
    KetQuaXuLyBaoHanh result;
    try {
      result = KetQuaXuLyBaoHanh.valueOf(r.ketQuaXuLy() == null ? "" : r.ketQuaXuLy());
    } catch (IllegalArgumentException failure) {
      throw new AppException(error);
    }
    if (result == KetQuaXuLyBaoHanh.DOI_SAN_PHAM) throw new AppException(error);
    List<Map<String, Object>> accessories = new ArrayList<>();
    if (r.phuKien().size() > 100 || r.saiLechDaXuLy().size() > 1000) throw new AppException(error);
    for (var item : r.phuKien()) {
      if (item == null) throw new AppException(error);
      Long quantity = WarrantyWriteValidation.id(item.soLuong(), true, error);
      if (quantity > Integer.MAX_VALUE) throw new AppException(error);
      accessories.add(
          Map.of(
              "ten",
              WarrantyWriteValidation.text(item.ten(), true, 255, error),
              "so_luong",
              quantity));
    }
    List<Long> resolved =
        r.saiLechDaXuLy().stream().map(id -> WarrantyWriteValidation.id(id, true, error)).toList();
    if (new HashSet<>(resolved).size() != resolved.size()) throw new AppException(error);
    Long version = WarrantyWriteValidation.id(r.phienBanPhuongAn(), false, error);
    if (version != null && version > Integer.MAX_VALUE) throw new AppException(error);
    boolean notRepaired =
        result == KetQuaXuLyBaoHanh.KHONG_SUA_DUOC
            || result == KetQuaXuLyBaoHanh.KHONG_THUC_HIEN_SUA;
    return new Input(
        action,
        null,
        null,
        WarrantyWriteValidation.text(r.lyDo(), notRepaired, 16000, error),
        WarrantyWriteValidation.id(r.thietBiSeTraId(), true, error),
        result,
        WarrantyWriteValidation.text(r.tinhTrang(), true, 16000, error),
        List.copyOf(accessories),
        WarrantyWriteValidation.text(r.canCuKiemTra(), true, 16000, error),
        resolved,
        version == null ? null : version.intValue());
  }

  private AppException transition() {
    return new AppException(ErrorCode.WARRANTY_STATUS_TRANSITION_INVALID);
  }

  private WarrantyReadException notReady() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_HANDOVER_DEVICE_NOT_READY,
        "thiet_bi_se_tra_id",
        "HANDOVER_DEVICE_NOT_READY");
  }
}
