package com.example.dantruventu.Services.order;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnCancelRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnCancelResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminReturnCancelService {

  private static final String UUID_PATTERN =
      "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

  private final PhieuTraHangRepository returnRepository;
  private final SoQuyThuChiRepository cashRepository;
  private final CashbookService cashbookService;
  private final SalesProperties salesProperties;
  private final OrderEvents orderEvents;

  @Transactional
  public AdminReturnCancelResponse cancel(
      Long id, String key, AdminReturnCancelRequest request, NguoiDung actor) {
    if (actor == null || actor.getId() == null || actor.getId() <= 0) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }
    if (actor.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.FORBIDDEN, "Tài khoản đã bị khóa");
    }
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "ID phiếu trả không hợp lệ");
    }
    if (request == null || request.getLyDo() == null || request.getLyDo().isBlank()) {
      throw new AppException(ErrorCode.INVALID_DATA, "Vui lòng nhập lý do hủy");
    }
    if (key == null || !key.matches(UUID_PATTERN)) {
      throw new AppException(ErrorCode.INVALID_DATA, "Idempotency-Key phải là UUID hợp lệ");
    }
    return cashbookService.executeOnce(
        "TH-CANCEL-" + key.toLowerCase(Locale.ROOT),
        actor,
        List.of(id, request),
        AdminReturnCancelResponse.class,
        () -> doCancel(id, request.getLyDo().strip(), actor));
  }

  private AdminReturnCancelResponse doCancel(Long id, String reason, NguoiDung actor) {
    PhieuTraHang slip =
        returnRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));
    Map<String, Object> saved =
        slip.getDuLieuNhanHang() == null
            ? Map.of()
            : ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());
    if (saved == null) saved = Map.of();
    TrangThaiTraHang status = slip.getTrangThaiTraHang();
    if (status == TrangThaiTraHang.DA_NHAN_HANG
        || status == TrangThaiTraHang.HOAN_TAT
        || status == TrangThaiTraHang.DA_HOAN_TIEN
        || slip.getNgayNhanHang() != null
        || !savedItems(saved, "hang_da_nhan").isEmpty()
        || returnRepository.findRefundExpenseByReturnId(id).isPresent()
        // Support both the current business key/FK and legacy voucher naming.
        || cashRepository.findByBusinessKey("CHI-TH-" + id).isPresent()
        || cashRepository.findByMaPhieu("CHI-TH-" + id).isPresent()) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "id",
          "RETURN_ALREADY_ACCEPTED",
          "Phiếu đã chấp nhận nhập trả, không cho hủy hoặc từ chối bằng thao tác thường");
    }
    if (status != TrangThaiTraHang.CHO_TIEP_NHAN || slip.getNgayKetThuc() != null) {
      throw new AppException(
          ErrorCode.CONFLICT, "id", "RETURN_CANCEL_NOT_ALLOWED", "Phiếu không còn cho phép hủy");
    }

    boolean holding = !savedItems(saved, "hang_dang_giu").isEmpty();
    // A receipt timestamp without its item snapshot cannot prove that custody is empty.
    if (!holding
        && (slip.getNgayTiepNhanThucTe() != null
            || Boolean.TRUE.equals(saved.get("dang_giu_hang")))) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "id",
          "RETURN_CUSTODY_INCONSISTENT",
          "Phiếu đã tiếp nhận thực tế nhưng thiếu dữ liệu hàng đang giữ; cần đối chiếu trước khi hủy");
    }
    OffsetDateTime now = OffsetDateTime.now(salesProperties.zone()).withNano(0);
    Map<String, Object> updated = new LinkedHashMap<>(saved);
    updated.put("muc_dich_ket_thuc", "HUY");
    updated.put("dang_giu_hang", holding);
    updated.put(
        "yeu_cau_huy",
        Map.of("nguoi_thuc_hien_id", actor.getId(), "thoi_diem", now.toString(), "ly_do", reason));
    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(updated));
    slip.setLyDoKetThuc(reason);
    slip.setTrangThaiTraHang(holding ? TrangThaiTraHang.CHO_TRA_KHACH : TrangThaiTraHang.HUY);
    slip.setNgayKetThuc(holding ? null : now.toLocalDateTime());
    returnRepository.saveAndFlush(slip);
    if (slip.getDonHang() != null) orderEvents.changed(slip.getDonHang().getId(), "RETURN_UPDATED");

    // Existing quantity queries exclude HUY/TU_CHOI and retain CHO_TRA_KHACH.
    return new AdminReturnCancelResponse(
        id, slip.getTrangThaiTraHang(), "HUY", reason, holding, !holding, holding ? null : now);
  }

  private List<?> savedItems(Map<String, Object> saved, String field) {
    Object value = saved.get(field);
    if (value == null) {
      return List.of();
    }
    if (value instanceof List<?> items) {
      return items;
    }
    throw new AppException(
        ErrorCode.CONFLICT,
        "id",
        "RETURN_CUSTODY_INCONSISTENT",
        "Dữ liệu nhận hàng đã lưu không hợp lệ; cần đối chiếu trước khi hủy");
  }
}
