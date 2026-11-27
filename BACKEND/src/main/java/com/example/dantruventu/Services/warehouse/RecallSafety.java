package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Entity.TonKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import jakarta.persistence.EntityManager;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class RecallSafety {
  private final JdbcTemplate jdbc;
  private final EntityManager entityManager;

  private final Object transactionKey = new Object();

  private static final class Tracked {
    final Map<String, TonKho> stocks = new TreeMap<>();
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }

  private boolean yes(Object value) {
    return Boolean.TRUE.equals(value) || value instanceof Number number && number.intValue() != 0;
  }

  public boolean variantBlocked(Long variantId) {
    return jdbc.queryForObject(
            """
                SELECT COUNT(*)
                FROM rv_recall_item
                WHERE variant_id = ?
                  AND serial_id IS NULL
                  AND blocked = TRUE
                  AND status <> 'DA_GIAI_QUYET'
                """,
            Long.class,
            variantId)
        > 0;
  }

  public void requireVariantsClear(Collection<Long> variantIds) {
    for (Long variantId : new TreeSet<>(variantIds)) {
      if (variantBlocked(variantId)) {
        throw conflict(
            "Phiên bản " + variantId + " đang có phạm vi thu hồi chưa đối soát nguồn lô.");
      }
    }
  }

  public void requireSerialClear(SoSerialSanPham serial) {
    var rows =
        jdbc.queryForList(
            "SELECT bi_thu_hoi FROM so_serial_san_pham WHERE id = ? FOR UPDATE", serial.getId());

    if (Boolean.TRUE.equals(serial.getBiThuHoi())
        || rows.size() != 1
        || yes(rows.getFirst().get("bi_thu_hoi"))) {
      throw conflict(
          "Serial thuộc phạm vi thu hồi, chưa được phép bán hoặc bàn giao: "
              + serial.getSoSerial());
    }
  }

  public void requireOrderClear(Long orderId) {
    entityManager.flush();

    var variants =
        jdbc.queryForList(
            """
                        SELECT DISTINCT variant_id
                        FROM (
                          SELECT s.phien_ban_id AS variant_id
                          FROM so_serial_san_pham s
                          LEFT JOIN chi_tiet_don_hang ct
                            ON ct.id = s.chi_tiet_dong_goi_id
                          WHERE s.don_hang_id = ? OR ct.don_hang_id = ?

                          UNION

                          SELECT t.phien_ban_id
                          FROM thiet_bi_bao_hanh t
                          JOIN chi_tiet_don_hang ct
                            ON ct.id = t.chi_tiet_don_hang_id
                          WHERE ct.don_hang_id = ?
                        ) x
                        ORDER BY variant_id
                        """,
            Long.class,
            orderId,
            orderId,
            orderId);

    for (Long variantId : variants) {
      jdbc.queryForList(
          """
                    SELECT id FROM ton_kho
                    WHERE phien_ban_id = ?
                    ORDER BY id FOR UPDATE
                    """,
          variantId);
    }

    requireVariantsClear(variants);

    var serials =
        jdbc.queryForList(
            """
                        SELECT s.id, s.so_serial, s.bi_thu_hoi
                        FROM so_serial_san_pham s
                        LEFT JOIN chi_tiet_don_hang ct
                          ON ct.id = s.chi_tiet_dong_goi_id
                        WHERE s.don_hang_id = ? OR ct.don_hang_id = ?
                        ORDER BY s.id FOR UPDATE
                        """,
            orderId,
            orderId);

    for (var serial : serials) {
      if (yes(serial.get("bi_thu_hoi"))) {
        throw conflict(
            "Dừng xuất/bàn giao: serial " + serial.get("so_serial") + " thuộc phạm vi thu hồi.");
      }
    }
  }

  private int serialDemand(Long variantId) {
    long quantity =
        jdbc.queryForObject(
            """
                        SELECT COUNT(*)
                        FROM so_serial_san_pham
                        WHERE phien_ban_id = ?
                          AND bi_thu_hoi = TRUE
                          AND trang_thai = 'TRONG_KHO'
                          AND don_hang_id IS NULL
                        """,
            Long.class,
            variantId);

    if (quantity > Integer.MAX_VALUE) {
      throw conflict("Số lượng cách ly vượt giới hạn.");
    }

    return (int) quantity;
  }

  private int target(Long variantId, int available, int quarantined) {
    long freeAndQuarantine = (long) available + quarantined;

    long demand = variantBlocked(variantId) ? freeAndQuarantine : serialDemand(variantId);

    return (int) Math.min(freeAndQuarantine, demand);
  }

  private void reconcile(TonKho stock) {
    WarehouseSupport.numbers(stock);

    int current = stock.getSoLuongCachLyThuHoi();
    int next = target(stock.getPhienBan().getId(), stock.getTonCoTheBan(), current);

    stock.setTonCoTheBan(Math.toIntExact((long) stock.getTonCoTheBan() + current - next));

    stock.setSoLuongCachLyThuHoi(next);
  }

  public void track(TonKho stock) {
    if (!TransactionSynchronizationManager.isActualTransactionActive()
        || TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
      throw conflict("Cách ly thu hồi phải được cập nhật trong giao dịch ghi.");
    }

    Tracked state = (Tracked) TransactionSynchronizationManager.getResource(transactionKey);

    if (state == null) {
      state = new Tracked();
      Tracked captured = state;

      TransactionSynchronizationManager.bindResource(transactionKey, state);

      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void suspend() {
              TransactionSynchronizationManager.unbindResourceIfPossible(transactionKey);
            }

            @Override
            public void resume() {
              TransactionSynchronizationManager.bindResource(transactionKey, captured);
            }

            @Override
            public void beforeCommit(boolean readOnly) {
              entityManager.flush();

              for (TonKho current : captured.stocks.values()) {
                reconcile(current);
              }

              entityManager.flush();
            }

            @Override
            public void afterCompletion(int status) {
              TransactionSynchronizationManager.unbindResourceIfPossible(transactionKey);
            }
          });
    }

    state.stocks.put(stock.getKhoHang().getId() + ":" + stock.getPhienBan().getId(), stock);

    entityManager.flush();
    reconcile(stock);
  }

  public void reconcileJdbc(Long warehouseId, Long variantId) {
    entityManager.flush();

    var rows =
        jdbc.queryForList(
            """
                        SELECT *
                        FROM ton_kho
                        WHERE kho_hang_id = ? AND phien_ban_id = ?
                        FOR UPDATE
                        """,
            warehouseId,
            variantId);

    if (rows.isEmpty()) return;

    if (rows.size() != 1) {
      throw conflict("Tồn kho bị trùng khi cách ly thu hồi.");
    }

    var row = rows.getFirst();
    int available = ((Number) row.get("ton_co_the_ban")).intValue();
    int current = ((Number) row.get("so_luong_cach_ly_thu_hoi")).intValue();
    int next = target(variantId, available, current);

    jdbc.update(
        """
                UPDATE ton_kho
                SET ton_co_the_ban = ?, so_luong_cach_ly_thu_hoi = ?
                WHERE id = ?
                """,
        Math.toIntExact((long) available + current - next),
        next,
        row.get("id"));

    Tracked state = (Tracked) TransactionSynchronizationManager.getResource(transactionKey);

    if (state != null) {
      for (TonKho stock : state.stocks.values()) {
        if (Objects.equals(stock.getId(), ((Number) row.get("id")).longValue())) {
          entityManager.refresh(stock);
        }
      }
    }
  }
}
