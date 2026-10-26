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

  public boolean counterInspectionClosed(Long orderId) {
    return entityManager
            .createQuery(
                """
                        SELECT COUNT(h) FROM LichSuXuLyDonHang h
                        WHERE h.donHang.id = :orderId
                          AND h.hanhDong = 'KET_THUC_KIEM_TRA_TAI_QUAY'
                        """,
                Long.class)
            .setParameter("orderId", orderId)
            .getSingleResult()
        > 0;
  }

  @SuppressWarnings("unchecked")
  public View read(DonHang order) {
    List<Map<String, Object>> originals = new ArrayList<>();
    List<Map<String, Object>> current = new ArrayList<>();
    List<String> warnings = new ArrayList<>();

    boolean inspectionClosed = counterInspectionClosed(order.getId());

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
      originalRow.put("kiem_tra_tai_quay_da_ket_thuc", inspectionClosed);
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

        List<Map<String, Object>> chain = replacementChain(device);

        Long terminalId =
            chain.isEmpty()
                ? device.getId()
                : (Long) chain.get(chain.size() - 1).get("thiet_bi_moi_id");

        if ((active == null && state.chiTietTraHangId() == null)
            || (active != null && !Objects.equals(active.getId(), terminalId))) {
          throw invalidReplacementHistory();
        }

        originalRow.put("chuoi_thay_the", chain);
        originalRow.put("thiet_bi_hien_hanh_id", active == null ? null : active.getId());
        originalRow.put("thiet_bi_cuoi_chuoi_da_tra", state.chiTietTraHangId() != null);

        if (active == null) continue;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("thiet_bi_id", active.getId());
        row.put("kiem_tra_tai_quay_da_ket_thuc", inspectionClosed);
        row.put("dau_hieu_nhan_dang", active.getDauHieuNhanDang());
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

  private List<Map<String, Object>> replacementChain(ThietBiBaoHanh original) {

    List<Map<String, Object>> result = new ArrayList<>();
    Set<Long> seen = new HashSet<>();
    ThietBiBaoHanh cursor = original;

    while (true) {
      if (!seen.add(cursor.getId())) {
        throw invalidReplacementHistory();
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
              .getResultList();

      if (tickets.isEmpty()) {
        return List.copyOf(result);
      }

      if (tickets.size() != 1) {
        throw invalidReplacementHistory();
      }

      PhieuBaoHanh ticket = tickets.get(0);
      ThietBiBaoHanh next = ticket.getThietBiThayThe();

      if (next == null
          || next.getChiTietDonHang() == null
          || !Objects.equals(next.getChiTietDonHang().getId(), original.getChiTietDonHang().getId())
          || !resolver.hasHandoverEvidence(ticket, next)) {
        throw invalidReplacementHistory();
      }

      Map<String, Object> edge = new LinkedHashMap<>();
      edge.put("lan_doi", result.size() + 1);
      edge.put("phieu_bao_hanh_id", ticket.getId());
      edge.put("ma_phieu_bao_hanh", ticket.getMaPhieu());
      edge.put("thiet_bi_cu_id", cursor.getId());
      edge.put("thiet_bi_moi_id", next.getId());
      edge.put("thiet_bi_cu", deviceIdentity(cursor));
      edge.put("thiet_bi_moi", deviceIdentity(next));
      edge.put("ly_do", ticket.getLyDoBaoHanh());
      edge.putAll(handoverDetails(ticket, next));

      result.add(edge);
      cursor = next;
    }
  }

  private Map<String, Object> deviceIdentity(ThietBiBaoHanh device) {
    Map<String, Object> row = new LinkedHashMap<>();

    row.put("thiet_bi_id", device.getId());
    row.put("ma_theo_doi", device.getMaTheoDoi());
    row.put("so_serial_id", device.getSoSerial() == null ? null : device.getSoSerial().getId());
    row.put("so_serial", device.getSoSerial() == null ? null : device.getSoSerial().getSoSerial());
    row.put("dau_hieu_nhan_dang", device.getDauHieuNhanDang());

    return row;
  }

  private Map<String, Object> handoverDetails(PhieuBaoHanh ticket, ThietBiBaoHanh replacement) {

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

      Long oldId = history.id(data.get("thiet_bi_cu_id"));

      if (oldId != null && !Objects.equals(oldId, ticket.getThietBi().getId())) {
        throw invalidReplacementHistory();
      }

      var exchange = history.object(payload.get("phuong_an_doi"));

      boolean matching =
          Objects.equals(history.id(data.get("thiet_bi_id")), replacement.getId())
              || Objects.equals(history.id(data.get("thiet_bi_thay_the_id")), replacement.getId())
              || (exchange != null
                  && Boolean.TRUE.equals(exchange.get("da_ban_giao"))
                  && Objects.equals(
                      history.id(exchange.get("thiet_bi_cu_id")), ticket.getThietBi().getId())
                  && Objects.equals(
                      history.id(exchange.get("thiet_bi_thay_the_id")), replacement.getId()));

      if (matching) {
        Map<String, Object> result = new LinkedHashMap<>();

        Object time = data.get("thoi_diem");
        if (time == null) time = data.get("ngay");

        result.put("ngay_ban_giao", time == null ? null : history.time(time));
        result.put(
            "nguoi_thuc_hien",
            event.getNguoiThucHien() == null ? null : event.getNguoiThucHien().getHoTen());

        return result;
      }
    }

    throw invalidReplacementHistory();
  }

  private AppException invalidReplacementHistory() {
    return new AppException(com.example.dantruventu.Error.ErrorCode.INVALID_WARRANTY_READ_DATA);
  }
}
