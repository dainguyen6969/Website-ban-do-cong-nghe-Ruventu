package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyLookupResponse.BlockReason;
import com.example.dantruventu.Entity.LichSuBaoHanh;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.KetQuaXuLyBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.warranty.WarrantyHistoryRepository;
import com.example.dantruventu.Repository.warranty.WarrantyLookupRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WarrantyDeviceResolver {
  private final WarrantyLookupRepository repository;
  private final WarrantyHistoryRepository historyRepository;
  private final WarrantyHistorySupport history;

  public record DeviceState(
      boolean hienHanh,
      ThietBiBaoHanh thietBiHienHanh,
      Long chiTietTraHangId,
      List<BlockReason> lyDoChan) {}

  public DeviceState resolve(ThietBiBaoHanh device) {
    if (device == null || device.getId() == null || device.getChiTietDonHang() == null) {
      throw invalidData();
    }
    Long purchaseLineId = device.getChiTietDonHang().getId();
    List<PhieuBaoHanh> incoming = repository.findIncomingReplacementTickets(device.getId());
    int committedIncoming = 0;
    for (PhieuBaoHanh ticket : incoming) {
      if (ticket.getThietBi() == null
          || !Objects.equals(ticket.getThietBi().getChiTietDonHang().getId(), purchaseLineId)) {
        throw invalidData();
      }
      if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
          && ticket.getKetQuaXuLy() == KetQuaXuLyBaoHanh.DOI_SAN_PHAM
          && hasHandoverEvidence(ticket, device)) committedIncoming++;
    }
    if (committedIncoming > 1) throw invalidData();
    if (!incoming.isEmpty() && committedIncoming == 0) {
      return new DeviceState(
          false,
          null,
          null,
          List.of(
              new BlockReason(
                  "DEVICE_NOT_HANDED_OVER",
                  "Thiết bị thay thế chưa có bằng chứng đã bàn giao cho khách")));
    }
    Set<Long> seen = new HashSet<>();
    ThietBiBaoHanh current = device;
    while (true) {
      if (!seen.add(current.getId())
          || !Objects.equals(current.getChiTietDonHang().getId(), purchaseLineId)) {
        throw invalidData();
      }
      if (current.getChiTietTraHang() != null) {
        if (!Objects.equals(
            current.getChiTietTraHang().getChiTietDonHang().getId(), purchaseLineId)) {
          throw invalidData();
        }
        TrangThaiTraHang returnedStatus =
            current.getChiTietTraHang().getPhieuTraHang().getTrangThaiTraHang();
        if (returnedStatus != TrangThaiTraHang.DA_NHAN_HANG
            && returnedStatus != TrangThaiTraHang.DA_HOAN_TIEN
            && returnedStatus != TrangThaiTraHang.HOAN_TAT) {
          return new DeviceState(
              Objects.equals(device.getId(), current.getId()),
              current,
              null,
              List.of(
                  new BlockReason(
                      "RETURN_LINK_UNVERIFIED",
                      "Liên kết trả hàng chưa có căn cứ đã chấp nhận nhập trả")));
        }
        return new DeviceState(
            false,
            null,
            current.getChiTietTraHang().getId(),
            List.of(
                new BlockReason("WARRANTY_RIGHT_RETURNED", "Thiết bị đã được chấp nhận nhập trả")));
      }
      List<ThietBiBaoHanh> replacements = new ArrayList<>();
      boolean missingHandover = false;
      for (PhieuBaoHanh ticket : repository.findReplacementTickets(current.getId())) {
        if (ticket.getTrangThaiXuLy() != TrangThaiBaoHanh.HOAN_TAT
            || ticket.getKetQuaXuLy() != KetQuaXuLyBaoHanh.DOI_SAN_PHAM) {
          continue;
        }
        ThietBiBaoHanh replacement = ticket.getThietBiThayThe();
        if (replacement == null
            || replacement.getChiTietDonHang() == null
            || !Objects.equals(replacement.getChiTietDonHang().getId(), purchaseLineId)) {
          throw invalidData();
        }
        if (hasHandoverEvidence(ticket, replacement)) {
          replacements.add(replacement);
        } else {
          missingHandover = true;
        }
      }
      if (replacements.size() > 1) {
        throw invalidData();
      }
      if (replacements.isEmpty()) {
        boolean unchanged = Objects.equals(device.getId(), current.getId());
        if (current.getSoSerial() != null) {
          TrangThaiSerial status = current.getSoSerial().getTrangThai();
          if (status == TrangThaiSerial.DA_THAY_THE_BAO_HANH) {
            return new DeviceState(
                false,
                null,
                null,
                List.of(
                    new BlockReason(
                        "DEVICE_REPLACED",
                        "Serial đã được thay thế nhưng chưa có đủ căn cứ xác định thiết bị hiện hành")));
          }
          if (status != TrangThaiSerial.DA_BAN && status != TrangThaiSerial.DANG_BAO_HANH) {
            return new DeviceState(
                false,
                null,
                null,
                List.of(
                    new BlockReason(
                        "SERIAL_RIGHT_UNVERIFIED",
                        "Chưa có căn cứ serial đang thuộc quyền của khách tại giao dịch này")));
          }
          if (unchanged && status == TrangThaiSerial.DANG_BAO_HANH) {
            return new DeviceState(
                true,
                current,
                null,
                List.of(
                    new BlockReason("WARRANTY_DEVICE_LOCKED", "Serial đang được xử lý bảo hành")));
          }
        }
        if (missingHandover) {
          return new DeviceState(
              unchanged,
              current,
              null,
              List.of(
                  new BlockReason(
                      "MISSING_HANDOVER_EVIDENCE",
                      "Chưa có đủ bằng chứng bàn giao để xác định quyền sau đổi")));
        }
        return new DeviceState(
            unchanged,
            current,
            null,
            unchanged
                ? List.of()
                : List.of(
                    new BlockReason(
                        "DEVICE_REPLACED", "Quyền đã chuyển sang " + current.getMaTheoDoi())));
      }
      current = replacements.getFirst();
    }
  }

  public boolean hasHandoverEvidence(PhieuBaoHanh ticket, ThietBiBaoHanh replacement) {
    for (LichSuBaoHanh event :
        historyRepository.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(ticket.getId())) {
      if (!"HANDOVER".equals(event.getLoaiSuKien())) {
        continue;
      }
      Map<String, Object> payload = history.payload(event);
      Map<String, Object> handover = history.object(payload.get("giao_nhan"));
      if (handover == null) {
        handover = history.object(payload.get("ban_giao"));
      }
      if (handover == null) {
        handover = payload;
      }
      Long handedDevice = history.id(handover.get("thiet_bi_id"));
      Long replacementId = history.id(handover.get("thiet_bi_thay_the_id"));
      Long oldDeviceId = history.id(handover.get("thiet_bi_cu_id"));
      if (oldDeviceId != null && !Objects.equals(oldDeviceId, ticket.getThietBi().getId())) {
        throw invalidData();
      }
      if (Objects.equals(handedDevice, replacement.getId())
          || Objects.equals(replacementId, replacement.getId())) {
        return true;
      }
      Map<String, Object> exchange = history.object(payload.get("phuong_an_doi"));
      if (exchange != null
          && Boolean.TRUE.equals(exchange.get("da_ban_giao"))
          && Objects.equals(history.id(exchange.get("thiet_bi_cu_id")), ticket.getThietBi().getId())
          && Objects.equals(
              history.id(exchange.get("thiet_bi_thay_the_id")), replacement.getId())) {
        return true;
      }
    }
    return false;
  }

  private AppException invalidData() {
    return new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
  }
}
