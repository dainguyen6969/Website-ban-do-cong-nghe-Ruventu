package com.example.dantruventu.Services.documents;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class DocumentNumberService {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private final JdbcTemplate jdbc;

  @Transactional(propagation = Propagation.MANDATORY)
  public String next(String kind) {

    if (!TransactionSynchronizationManager.isActualTransactionActive()
        || TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
      throw new IllegalStateException("Cấp mã phải nằm trong giao dịch ghi.");
    }

    String[] source =
        switch (kind) {
          case "PT", "PC" -> new String[] {"so_quy_thu_chi", "ma_phieu"};
          case "DH" -> new String[] {"don_hang", "ma_don_hang"};
          case "DN" -> new String[] {"don_nhap_hang", "ma_don_nhap"};
          case "NK" -> new String[] {"rv_receipt", "code"};
          case "XK" -> new String[] {"rv_issue", "code"};
          default -> throw conflict("Loại chứng từ chưa được cấu hình.");
        };

    LocalDate day = LocalDate.now(ZONE);
    java.sql.Date sqlDay = java.sql.Date.valueOf(day);

    String prefix = kind + "-" + day.format(DateTimeFormatter.BASIC_ISO_DATE) + "-";

    jdbc.update(
        """
                INSERT INTO so_thu_tu_chung_tu (ma_loai, ngay_cap, so_cuoi)
                VALUES (?, ?, 0)
                ON DUPLICATE KEY UPDATE so_cuoi = so_cuoi
                """,
        kind,
        sqlDay);

    Long current =
        jdbc.queryForObject(
            """
                        SELECT so_cuoi
                        FROM so_thu_tu_chung_tu
                        WHERE ma_loai = ? AND ngay_cap = ?
                        FOR UPDATE
                        """,
            Long.class,
            kind,
            sqlDay);

    if (current == null || current < 0) {
      throw conflict("Bộ đếm chứng từ không hợp lệ.");
    }

    if (current == 0) {
      // Tên bảng và cột chỉ lấy từ switch cố định ở trên.
      String sql =
          "SELECT COALESCE(MAX(CAST(RIGHT("
              + source[1]
              + ", 6) AS UNSIGNED)), 0) FROM "
              + source[0]
              + " WHERE UPPER("
              + source[1]
              + ") LIKE ? AND UPPER("
              + source[1]
              + ") REGEXP ?";

      Long maximum = jdbc.queryForObject(sql, Long.class, prefix + "%", "^" + prefix + "[0-9]{6}$");

      current = maximum == null ? 0L : maximum;
    }

    if (current >= 999999L) {
      throw conflict("Đã hết số chứng từ của loại này trong ngày.");
    }

    long next = current + 1;

    int changed =
        jdbc.update(
            """
                        UPDATE so_thu_tu_chung_tu
                        SET so_cuoi = ?
                        WHERE ma_loai = ? AND ngay_cap = ?
                        """,
            next,
            kind,
            sqlDay);

    if (changed != 1) {
      throw conflict("Không cập nhật được bộ đếm chứng từ.");
    }

    return prefix + String.format(Locale.ROOT, "%06d", next);
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }
}
