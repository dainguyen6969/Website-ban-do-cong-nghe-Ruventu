package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyIntakeResultRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyIntakeResultResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import com.example.dantruventu.Repository.warranty.*;
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
public class AdminWarrantyIntakeResultService {
  private final WarrantyWorkflowRepository repository;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;

  private record Input(
      Long requestId,
      Long orderId,
      Long lineId,
      Long deviceId,
      String serial,
      String name,
      String phone,
      String result,
      String reason,
      String basis,
      List<String> evidence) {}

  private record Selection(Long orderId, Long lineId, Long deviceId, String serial) {}

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyIntakeResultResponse> save(
      AdminWarrantyIntakeResultRequest request, String key, Long actorId) {
    try {
      return execute(validate(request), key, actorId);
    } catch (AppException | PessimisticLockingFailureException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      log.error("Saving warranty pre-intake result failed", failure);
      throw new AppException(ErrorCode.WARRANTY_INTAKE_RESULT_FAILED);
    }
  }

  private ApiResponse<AdminWarrantyIntakeResultResponse> execute(
      Input input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-INTAKE-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/intake-results",
            input,
            AdminWarrantyIntakeResultResponse.class,
            ErrorCode.INVALID_WARRANTY_INTAKE_RESULT);
    if (replay.previous() != null) return replay.previous();

    Map<String, Object> previous =
        input.requestId() == null ? Map.of() : current(input.requestId());
    Selection selected = selection(input, previous);
    DonHang order = selected.orderId() == null ? null : locks.lockOrder(selected.orderId());
    if (selected.lineId() != null) locks.lockLine(selected.lineId());
    if (input.requestId() != null) {
      // Same lock order as actual intake: order -> line -> request -> device -> serial.
      locks.lockIntake(input.requestId());
      previous = current(input.requestId());
      if (!selected.equals(selection(input, previous)))
        throw new AppException(ErrorCode.WARRANTY_INTAKE_RESULT_CLOSED);
    }
    ThietBiBaoHanh device =
        selected.deviceId() == null ? null : locks.lockDevice(selected.deviceId());
    String serialText = selected.serial();
    SoSerialSanPham serial = null;
    if (device != null && device.getSoSerial() != null) {
      serial = locks.lockSerial(device.getSoSerial().getId());
      if (serialText != null && !serialText.equals(serial.getSoSerial())) throw mismatch();
      serialText = serial.getSoSerial();
    } else if (device != null && serialText != null) {
      throw mismatch();
    } else {
      Long serialId = repository.serialId(serialText);
      if (serialId != null) serial = locks.lockSerial(serialId);
    }
    if (serial != null
        && device != null
        && !Objects.equals(serial.getPhienBan().getId(), device.getPhienBan().getId()))
      throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    // A tracked replacement can inherit the original purchase through a completed exchange.
    // Only untracked serials must prove their order directly; never rewrite a serial's order.
    if (serial != null
        && order != null
        && device == null
        && (serial.getDonHang() == null || !order.getId().equals(serial.getDonHang().getId())))
      throw mismatch();
    if (serial != null && selected.lineId() != null && device == null) {
      ChiTietDonHang line = locks.lockLine(selected.lineId());
      if (!Objects.equals(line.getPhienBan().getId(), serial.getPhienBan().getId()))
        throw mismatch();
    }
    Long serialId = serial == null ? null : serial.getId();
    Long broadLine = device == null && serialId == null ? selected.lineId() : null;
    if ((serial != null && serial.getTrangThai() == TrangThaiSerial.DANG_BAO_HANH)
        || repository.hasOpenCustody(selected.deviceId(), serialId, broadLine)) throw inCustody();

    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("don_hang_id", selected.orderId());
    snapshot.put("chi_tiet_don_hang_id", selected.lineId());
    snapshot.put("thiet_bi_id", selected.deviceId());
    snapshot.put("so_serial", serialText);
    snapshot.put("ma_don_hang", order == null ? null : order.getMaDonHang());
    snapshot.put("ma_theo_doi", device == null ? null : device.getMaTheoDoi());
    snapshot.put("ten_nguoi_lien_he", input.name());
    snapshot.put("sdt_nguoi_lien_he", input.phone());
    snapshot.put("ket_qua_tiep_nhan", input.result());
    snapshot.put("ly_do", input.reason());
    snapshot.put("can_cu", input.basis());
    snapshot.put("bang_chung_urls", input.evidence());
    Map<String, Object> payload = new LinkedHashMap<>();
    if (input.requestId() != null) payload.put("yeu_cau_tiep_nhan_id", input.requestId());
    payload.put("yeu_cau_tiep_nhan", snapshot);
    LichSuBaoHanh event =
        repository.append(
            null,
            actorId,
            input.requestId() == null ? "YEU_CAU_TIEP_NHAN" : "KET_QUA_TIEP_NHAN",
            input.reason(),
            mapper.writeValueAsString(payload));
    Long groupId = input.requestId() == null ? event.getId() : input.requestId();
    // A serial supplied as unverified text is NOT an authorization to attach its purchase.
    String serialStatus = serial == null || order == null ? null : serial.getTrangThai().name();
    var data =
        new AdminWarrantyIntakeResultResponse(
            groupId,
            event.getId(),
            input.result(),
            null,
            serialStatus,
            WarrantyReadValidation.time(event.getNgayTao()),
            selected.orderId(),
            selected.deviceId(),
            false);
    String message =
        "CHO_XAC_MINH".equals(input.result())
            ? "Lưu yêu cầu chờ xác minh"
            : input.requestId() == null
                ? "Lưu từ chối trước tiếp nhận"
                : "Lưu quyết định từ chối của yêu cầu " + groupId;
    return mutations.complete(replay, 201, message, data);
  }

  private Map<String, Object> current(Long rootId) {
    histories
        .findIntakeById(rootId)
        .orElseThrow(
            () ->
                WarrantyReadException.notFound(
                    ErrorCode.INTAKE_REQUEST_NOT_FOUND,
                    "yeu_cau_tiep_nhan_id",
                    "INTAKE_REQUEST_NOT_FOUND"));
    List<LichSuBaoHanh> events = histories.findIntakeEvents(rootId);
    if (events.stream().anyMatch(event -> event.getPhieuBaoHanh() != null)) throw inCustody();
    Map<String, Object> latest = history.latestSection(events, "yeu_cau_tiep_nhan");
    if (latest == null) throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
    String result = history.text(latest.get("ket_qua_tiep_nhan"));
    if ("CHAP_NHAN".equals(result)) throw inCustody();
    if (!"CHO_XAC_MINH".equals(result))
      throw new AppException(ErrorCode.WARRANTY_INTAKE_RESULT_CLOSED);
    return latest;
  }

  private Selection selection(Input input, Map<String, Object> previous) {
    if (input.orderId() != null) repository.requireOrder(input.orderId());
    if (input.lineId() != null) locks.origin(null, input.lineId());
    Long orderId = merge(input.orderId(), history.id(previous.get("don_hang_id")));
    Long lineId = merge(input.lineId(), history.id(previous.get("chi_tiet_don_hang_id")));
    Long deviceId = merge(input.deviceId(), history.id(previous.get("thiet_bi_id")));
    String oldSerial = history.text(previous.get("so_serial"));
    if (input.serial() != null
        && oldSerial != null
        && !input.serial().equals(oldSerial)
        && history.id(previous.get("thiet_bi_id")) != null) throw mismatch();
    if (deviceId != null || lineId != null) {
      var origin = locks.origin(deviceId, lineId);
      lineId = merge(lineId, origin.lineId());
      orderId = merge(orderId, origin.orderId());
    }
    if (orderId != null) repository.requireOrder(orderId);
    return new Selection(
        orderId, lineId, deviceId, input.serial() == null ? oldSerial : input.serial());
  }

  private Long merge(Long first, Long second) {
    if (first != null && second != null && !first.equals(second)) throw mismatch();
    return first == null ? second : first;
  }

  private Input validate(AdminWarrantyIntakeResultRequest r) {
    ErrorCode error = ErrorCode.INVALID_WARRANTY_INTAKE_RESULT;
    if (r == null) throw new AppException(error);
    String result = WarrantyWriteValidation.text(r.ketQuaTiepNhan(), true, 50, error);
    if (!Set.of("CHO_XAC_MINH", "TU_CHOI").contains(result)) throw new AppException(error);
    return new Input(
        WarrantyWriteValidation.id(r.yeuCauTiepNhanId(), false, error),
        WarrantyWriteValidation.id(r.donHangId(), false, error),
        WarrantyWriteValidation.id(r.chiTietDonHangId(), false, error),
        WarrantyWriteValidation.id(r.thietBiId(), false, error),
        WarrantyWriteValidation.text(r.soSerial(), false, 100, error),
        WarrantyWriteValidation.text(r.tenNguoiLienHe(), true, 100, error),
        WarrantyWriteValidation.phone(r.sdtNguoiLienHe(), error),
        result,
        WarrantyWriteValidation.text(r.lyDo(), true, 16000, error),
        WarrantyWriteValidation.text(r.canCu(), true, 16000, error),
        WarrantyWriteValidation.urls(r.bangChungUrls(), error));
  }

  private AppException mismatch() {
    return new AppException(ErrorCode.WARRANTY_INTAKE_LINK_MISMATCH);
  }

  private WarrantyReadException inCustody() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_DEVICE_ALREADY_IN_CUSTODY,
        "ket_qua_tiep_nhan",
        "DEVICE_ALREADY_IN_CUSTODY");
  }
}
