package com.example.dantruventu.Services.order.sales;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.LichSuBaoHanh;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.KetQuaXuLyBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Services.warranty.WarrantyDeviceResolver;
import com.example.dantruventu.Services.warranty.WarrantyHistorySupport;
import jakarta.persistence.EntityManager;
import java.time.ZoneId;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderDeviceHistoryService {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;
  private final SoldDeviceService soldDevices;
  private final WarrantyDeviceResolver resolver;
  private final WarrantyHistorySupport history;

  public record View(
      List<Map<String, Object>> originals,
      List<Map<String, Object>> current,
      boolean needsVerification,
      List<String> warnings) {}

  @SuppressWarnings("unchecked")
  public View read(DonHang order) {
    List<Map<String, Object>> originals = new ArrayList<>();
    List<Map<String, Object>> current = new ArrayList<>();
    List<String> warnings = new ArrayList<>();

    var saved = soldDevices.details(order.getId());
    String exportWarning = soldDevices.warning(order);

    if (exportWarning != null) warnings.add(exportWarning);

    if (order.getTrangThaiDonHang() == TrangThaiDonHang.HOAN_THANH
        && order.getNgayHoanThanh() == null) {
      warnings.add("Đơn cũ chưa có căn cứ thời điểm khách thực nhận.");
    }

    for (var original : saved) {
      Map<String, Object> originalRow =
          new LinkedHashMap<>(objectMapper.convertValue(original, Map.class));

      originalRow.put("chi_tiet_tra_hang_id", null);
      originals.add(originalRow);

      try {
        ThietBiBaoHanh device = entityManager.find(ThietBiBaoHanh.class, original.thietBiId());

        if (device == null
            || !Objects.equals(device.getChiTietDonHang().getId(), original.chiTietDonHangId())
            || !Objects.equals(device.getChiTietDonHang().getDonHang().getId(), order.getId())
            || !Objects.equals(device.getPhienBan().getId(), original.phienBanId())) {
          warnings.add("Thiếu liên kết thiết bị gốc #" + original.thietBiId());
          continue;
        }

        originalRow.put(
            "chi_tiet_tra_hang_id",
            device.getChiTietTraHang() == null ? null : device.getChiTietTraHang().getId());

        // Xuất kho chưa đồng nghĩa khách đã nhận hàng.
        if (order.getNgayHoanThanh() == null) continue;

        var state = resolver.resolve(device);

        boolean unverified =
            state.lyDoChan().stream()
                .anyMatch(
                    reason ->
                        Set.of(
                                "RETURN_LINK_UNVERIFIED",
                                "MISSING_HANDOVER_EVIDENCE",
                                "SERIAL_RIGHT_UNVERIFIED",
                                "DEVICE_NOT_HANDED_OVER")
                            .contains(reason.code()));

        if (unverified) {
          state.lyDoChan().forEach(reason -> warnings.add(reason.message()));
          continue;
        }

        ThietBiBaoHanh active = state.thietBiHienHanh();

        // Thiết bị đã được nhận trả không còn là thiết bị hiện hành của đơn.
        if (active == null) continue;

        List<Map<String, Object>> chain = replacementChain(device, active);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("thiet_bi_id", active.getId());
        row.put("thiet_bi_goc_id", device.getId());
        row.put("chi_tiet_don_hang_id", active.getChiTietDonHang().getId());
        row.put("phien_ban_id", active.getPhienBan().getId());
        row.put("ma_theo_doi", active.getMaTheoDoi());
        row.put("so_serial_id", active.getSoSerial() == null ? null : active.getSoSerial().getId());
        row.put(
            "so_serial", active.getSoSerial() == null ? null : active.getSoSerial().getSoSerial());
        row.put("chi_tiet_tra_hang_id", state.chiTietTraHangId());
        row.put(
            "ngay_kich_hoat",
            active.getNgayKichHoat() == null
                ? null
                : active.getNgayKichHoat().atZone(ZONE).toOffsetDateTime());
        row.put(
            "han_bao_hanh",
            active.getHanBaoHanh() == null
                ? null
                : active.getHanBaoHanh().atZone(ZONE).toOffsetDateTime());
        row.put("chuoi_thay_the", chain);

        current.add(row);
      } catch (AppException exception) {
        if (exception.getErrorCode().getStatus().is5xxServerError()) {
          throw exception;
        }

        warnings.add("Chưa xác minh được lịch sử thiết bị #" + original.thietBiId());
      }
    }

    return new View(
        List.copyOf(originals),
        List.copyOf(current),
        !warnings.isEmpty(),
        List.copyOf(new LinkedHashSet<>(warnings)));
  }

  private List<Map<String, Object>> replacementChain(
      ThietBiBaoHanh original, ThietBiBaoHanh active) {

    List<Map<String, Object>> result = new ArrayList<>();
    Set<Long> seen = new HashSet<>();
    ThietBiBaoHanh cursor = original;

    while (!Objects.equals(cursor.getId(), active.getId())) {
      if (!seen.add(cursor.getId())) {
        throw new AppException(com.example.dantruventu.Error.ErrorCode.INVALID_WARRANTY_READ_DATA);
      }

      var tickets =
          entityManager
              .createQuery(
                  """
              SELECT p FROM PhieuBaoHanh p
              WHERE p.thietBi.id = :deviceId
                AND p.trangThaiXuLy = :completed
                AND p.ketQuaXuLy = :exchanged
              ORDER BY p.id
              """,
                  PhieuBaoHanh.class)
              .setParameter("deviceId", cursor.getId())
              .setParameter("completed", TrangThaiBaoHanh.HOAN_TAT)
              .setParameter("exchanged", KetQuaXuLyBaoHanh.DOI_SAN_PHAM)
              .getResultList()
              .stream()
              .filter(
                  p ->
                      p.getThietBiThayThe() != null
                          && resolver.hasHandoverEvidence(p, p.getThietBiThayThe()))
              .toList();

      if (tickets.size() != 1) {
        throw new AppException(com.example.dantruventu.Error.ErrorCode.INVALID_WARRANTY_READ_DATA);
      }

      var ticket = tickets.getFirst();
      var replacement = ticket.getThietBiThayThe();

      Map<String, Object> edge = new LinkedHashMap<>();
      edge.put("phieu_bao_hanh_id", ticket.getId());
      edge.put("thiet_bi_cu_id", cursor.getId());
      edge.put("thiet_bi_moi_id", replacement.getId());
      edge.put("ngay_ban_giao", handoverTime(ticket, replacement));

      result.add(edge);
      cursor = replacement;
    }

    return List.copyOf(result);
  }

  private Object handoverTime(PhieuBaoHanh ticket, ThietBiBaoHanh replacement) {

    var events =
        entityManager
            .createQuery(
                """
            SELECT e FROM LichSuBaoHanh e
            WHERE e.phieuBaoHanh.id = :id
              AND e.loaiSuKien = 'HANDOVER'
            ORDER BY e.ngayTao, e.id
            """,
                LichSuBaoHanh.class)
            .setParameter("id", ticket.getId())
            .getResultList();

    for (var event : events) {
      var payload = history.payload(event);
      var data = history.object(payload.get("giao_nhan"));
      if (data == null) data = history.object(payload.get("ban_giao"));
      if (data == null) data = payload;

      Long handed = history.id(data.get("thiet_bi_id"));
      Long changed = history.id(data.get("thiet_bi_thay_the_id"));

      if (Objects.equals(handed, replacement.getId())
          || Objects.equals(changed, replacement.getId())) {
        return data.get("thoi_diem") == null ? null : history.time(data.get("thoi_diem"));
      }
    }

    // Không dùng ngay_cap_nhat/ngày GET làm thời điểm bàn giao.
    return null;
  }
}
