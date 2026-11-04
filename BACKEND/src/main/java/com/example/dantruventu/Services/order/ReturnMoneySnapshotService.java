package com.example.dantruventu.Services.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnCreateRequest;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class ReturnMoneySnapshotService {

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;

  public record Allocation(
      @JsonProperty("chi_tiet_don_hang_id") Long lineId,
      @JsonProperty("so_luong") Integer quantity,
      @JsonProperty("gia_tri_truoc_vat") BigDecimal beforeVat,
      @JsonProperty("tien_vat") BigDecimal vat,
      @JsonProperty("gia_tri_sau_vat") BigDecimal afterVat) {}

  public record Original(int quantity, BigDecimal beforeVat, BigDecimal vat, BigDecimal afterVat) {}

  private static final class Previous {
    long quantity;
    BigDecimal beforeVat = ZERO;
    BigDecimal vat = ZERO;
    BigDecimal afterVat = ZERO;
  }

  public Original original(ChiTietDonHang line) {
    if (line == null
        || line.getId() == null
        || line.getSoLuong() == null
        || line.getSoLuong() <= 0) {
      throw unverified();
    }

    BigDecimal gross = exact(line.getThanhTien());
    BigDecimal discount = exact(line.getTienChietKhau());
    BigDecimal payable = exact(line.getThanhToanDong());

    if (discount.compareTo(gross) > 0) {
      throw unverified();
    }

    BigDecimal beforeVat = gross.subtract(discount);
    BigDecimal vat = payable.subtract(beforeVat);

    if (vat.signum() < 0) {
      throw unverified();
    }

    if (Boolean.TRUE.equals(line.getLaQuaTang())
        && (gross.signum() != 0 || discount.signum() != 0 || payable.signum() != 0)) {
      throw unverified();
    }

    return new Original(line.getSoLuong(), beforeVat, vat, payable);
  }

  public List<Allocation> plan(
      DonHang order,
      List<ChiTietDonHang> orderLines,
      List<AdminReturnCreateRequest.ReturnLine> requested) {

    Map<Long, ChiTietDonHang> originals = new HashMap<>();

    for (var line : orderLines) {
      originals.put(line.getId(), line);
    }

    var requestedIds = new HashSet<Long>();

    for (var input : requested) {
      if (input == null
          || input.getChiTietDonHangId() == null
          || input.getSoLuong() == null
          || input.getSoLuong() <= 0
          || !requestedIds.add(input.getChiTietDonHangId())
          || !originals.containsKey(input.getChiTietDonHangId())) {
        throw new AppException(ErrorCode.INVALID_DATA, "Dòng yêu cầu trả không hợp lệ");
      }
    }

    List<ChiTietTraHang> previousLines =
        entityManager
            .createQuery(
                """
                                select r
                                from ChiTietTraHang r
                                join fetch r.phieuTraHang p
                                join fetch r.chiTietDonHang l
                                where l.donHang.id = :orderId
                                  and p.trangThaiTraHang not in :closed
                                order by p.id, r.id
                                """,
                ChiTietTraHang.class)
            .setParameter("orderId", order.getId())
            .setParameter("closed", List.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI))
            .getResultList();

    Map<Long, Previous> totals = new HashMap<>();
    Map<Long, Map<Long, Allocation>> cachedSnapshots = new HashMap<>();

    for (var previousLine : previousLines) {
      Long lineId = previousLine.getChiTietDonHang().getId();

      if (!requestedIds.contains(lineId)) {
        continue;
      }

      PhieuTraHang slip = previousLine.getPhieuTraHang();

      Map<Long, Allocation> snapshot =
          cachedSnapshots.computeIfAbsent(slip.getId(), ignored -> read(slip.getDuLieuNhanHang()));

      Allocation saved = snapshot.get(lineId);

      if (saved == null
          || !Objects.equals(saved.quantity(), previousLine.getSoLuong())
          || saved.afterVat().compareTo(exact(previousLine.getThanhTienHoan())) != 0) {
        throw unverified();
      }

      Previous sum = totals.computeIfAbsent(lineId, ignored -> new Previous());

      sum.quantity += saved.quantity();
      sum.beforeVat = sum.beforeVat.add(saved.beforeVat());
      sum.vat = sum.vat.add(saved.vat());
      sum.afterVat = sum.afterVat.add(saved.afterVat());
    }

    List<Allocation> result = new ArrayList<>();

    for (var input : requested) {
      Long lineId = input.getChiTietDonHangId();
      Original source = original(originals.get(lineId));
      Previous previous = totals.getOrDefault(lineId, new Previous());

      long remaining = (long) source.quantity() - previous.quantity;

      if (remaining < 0 || input.getSoLuong() > remaining) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Số lượng trả vượt số lượng còn được trả");
      }

      BigDecimal beforeVat =
          allocate(
              source.beforeVat(),
              source.quantity(),
              input.getSoLuong(),
              remaining,
              previous.beforeVat);

      BigDecimal vat =
          allocate(source.vat(), source.quantity(), input.getSoLuong(), remaining, previous.vat);

      result.add(new Allocation(lineId, input.getSoLuong(), beforeVat, vat, beforeVat.add(vat)));
    }

    return List.copyOf(result);
  }

  public String createSnapshot(
      DonHang order, List<ChiTietDonHang> orderLines, List<Allocation> allocations) {

    Map<String, Object> root = new LinkedHashMap<>();

    root.put("nguon", "KHACH_TRA");
    root.put("don_hang_id", order.getId());
    root.put("phien_ban_phan_bo_tien", 1);
    root.put("phan_bo_tien", allocations);

    root.put(
        "can_cu_dong",
        orderLines.stream()
            .map(
                line -> {
                  Map<String, Object> item = new LinkedHashMap<>();

                  item.put("chi_tiet_don_hang_id", line.getId());

                  item.put("so_luong", line.getSoLuong());
                  item.put("thanh_tien", line.getThanhTien());

                  item.put("tien_chiet_khau", line.getTienChietKhau());

                  item.put("thanh_toan_dong", line.getThanhToanDong());

                  item.put("la_qua_tang", line.getLaQuaTang());

                  return item;
                })
            .toList());

    return objectMapper.writeValueAsString(root);
  }

  public String receivedSnapshot(
      PhieuTraHang slip,
      List<ChiTietTraHang> lines,
      OffsetDateTime receivedAt,
      Long actorId,
      Object evidence) {

    Map<String, Object> root = objectMapper.readValue(slip.getDuLieuNhanHang(), Map.class);
    if (root != null
        && !root.containsKey("phien_ban_phan_bo_tien")
        && root.containsKey("kiem_tra_chinh_sach_khi_lap")) {
      validateCreationPolicy(slip, lines, root);
      return addReceipt(root, receivedAt, actorId, evidence);
    }

    Map<Long, Allocation> allocations = read(slip.getDuLieuNhanHang());

    if (allocations.size() != lines.size()) {
      throw unverified();
    }

    BigDecimal total = ZERO;

    for (var line : lines) {
      Allocation saved = allocations.get(line.getChiTietDonHang().getId());

      if (saved == null
          || !Objects.equals(saved.quantity(), line.getSoLuong())
          || saved.afterVat().compareTo(exact(line.getThanhTienHoan())) != 0) {
        throw unverified();
      }

      total = total.add(saved.afterVat());
    }

    if (total.compareTo(exact(slip.getTongTienHoan())) != 0) {
      throw unverified();
    }

    return addReceipt(root, receivedAt, actorId, evidence);
  }

  private String addReceipt(
      Map<String, Object> root, OffsetDateTime receivedAt, Long actorId, Object evidence) {

    Map<String, Object> received = new LinkedHashMap<>();

    received.put("ngay_nhan_hang", receivedAt.toString());
    received.put("nguoi_nhan_hang_id", actorId);
    received.put("ket_qua_kiem_tra", evidence);

    root.put("nhan_hang", received);

    return objectMapper.writeValueAsString(root);
  }

  // TH05 records exact VND quotes and prior held rights, rather than a VAT allocation.
  // Validate that evidence without fabricating historical VAT components.
  private void validateCreationPolicy(
      PhieuTraHang slip, List<ChiTietTraHang> lines, Map<String, Object> root) {
    try {
      if (!(root.get("kiem_tra_chinh_sach_khi_lap") instanceof Map<?, ?> policy)
          || !Boolean.TRUE.equals(policy.get("du_dieu_kien"))
          || !(policy.get("chi_tiet") instanceof List<?> details)
          || details.isEmpty()
          || details.size() != lines.size()) {
        throw unverified();
      }
      Map<Long, Map<?, ?>> recorded = new HashMap<>();
      for (Object item : details) {
        if (!(item instanceof Map<?, ?> detail)) {
          throw unverified();
        }
        long lineId = integer(detail.get("chi_tiet_don_hang_id"));
        if (lineId <= 0 || recorded.putIfAbsent(lineId, detail) != null) {
          throw unverified();
        }
      }
      BigDecimal total = ZERO;
      Set<Long> seen = new HashSet<>();
      for (ChiTietTraHang line : lines) {
        ChiTietDonHang purchase = line.getChiTietDonHang();
        Map<?, ?> detail = recorded.get(purchase.getId());
        if (detail == null
            || !seen.add(purchase.getId())
            || line.getSoLuong() == null
            || integer(detail.get("so_luong_yeu_cau")) != line.getSoLuong()) {
          throw unverified();
        }
        var quote =
            ReturnRefundCalculator.quote(
                decimal(detail.get("thanh_toan_dong")),
                purchase.getSoLuong(),
                line.getSoLuong(),
                integer(detail.get("so_luong_da_yeu_cau_tra")),
                decimal(detail.get("tien_da_yeu_cau_tra")));
        if (quote.unitRefund().compareTo(exact(line.getDonGiaHoan())) != 0
            || quote.lineRefund().compareTo(exact(line.getThanhTienHoan())) != 0) {
          throw unverified();
        }
        total = total.add(quote.lineRefund());
      }
      if (total.compareTo(exact(slip.getTongTienHoan())) != 0) {
        throw unverified();
      }
    } catch (RuntimeException exception) {
      throw unverified();
    }
  }

  private long integer(Object value) {
    return decimal(value).longValueExact();
  }

  private BigDecimal decimal(Object value) {
    if (!(value instanceof Number number)) {
      throw unverified();
    }
    return new BigDecimal(number.toString());
  }

  public Map<Long, Allocation> read(String raw) {
    try {
      if (raw == null || raw.isBlank()) {
        throw unverified();
      }

      Map<?, ?> root = objectMapper.readValue(raw, Map.class);

      Object version = root.get("phien_ban_phan_bo_tien");

      if (version == null
          || new BigDecimal(version.toString()).compareTo(BigDecimal.ONE) != 0
          || !(root.get("phan_bo_tien") instanceof List<?> items)
          || items.isEmpty()) {
        throw unverified();
      }

      Map<Long, Allocation> result = new LinkedHashMap<>();

      for (Object item : items) {
        Allocation allocation = objectMapper.convertValue(item, Allocation.class);

        if (allocation.lineId() == null
            || allocation.lineId() <= 0
            || allocation.quantity() == null
            || allocation.quantity() <= 0) {
          throw unverified();
        }

        BigDecimal beforeVat = exact(allocation.beforeVat());

        BigDecimal vat = exact(allocation.vat());

        BigDecimal afterVat = exact(allocation.afterVat());

        if (beforeVat.add(vat).compareTo(afterVat) != 0
            || result.putIfAbsent(allocation.lineId(), allocation) != null) {
          throw unverified();
        }
      }

      return result;
    } catch (AppException exception) {
      throw exception;
    } catch (RuntimeException exception) {
      throw unverified();
    }
  }

  private BigDecimal allocate(
      BigDecimal original,
      int purchased,
      int requested,
      long remainingQuantity,
      BigDecimal allocatedBefore) {

    BigDecimal remainingMoney = original.subtract(allocatedBefore);

    if (remainingMoney.signum() < 0) {
      throw unverified();
    }

    BigDecimal amount =
        requested == remainingQuantity
            ? remainingMoney
            : original
                .divide(BigDecimal.valueOf(purchased), 2, RoundingMode.DOWN)
                .multiply(BigDecimal.valueOf(requested));

    if (amount.signum() < 0 || amount.compareTo(remainingMoney) > 0) {
      throw unverified();
    }

    return amount.setScale(2, RoundingMode.UNNECESSARY);
  }

  private BigDecimal exact(BigDecimal value) {
    try {
      if (value == null || value.signum() < 0) {
        throw unverified();
      }

      return value.setScale(2, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw unverified();
    }
  }

  private AppException unverified() {
    return new AppException(
        ErrorCode.UNPROCESSABLE_ENTITY,
        "chi_tiet_tra",
        "RETURN_FINANCIAL_HISTORY_UNVERIFIED",
        "Thiếu hoặc không nhất quán bản chụp tiền trả; cần đối soát dữ liệu nguồn");
  }
}
