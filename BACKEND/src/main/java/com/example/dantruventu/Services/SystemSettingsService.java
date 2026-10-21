package com.example.dantruventu.Services;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemSettingsService {
  private final JdbcTemplate jdbc;

  private static final Set<String> FONTS =
      Set.of(
          "Inter",
          "Archivo",
          "Kanit",
          "Inter Tight",
          "Geist",
          "Asap Condensed",
          "Roboto Condensed",
          "Oswald",
          "Barlow Condensed",
          "Fjalla One",
          "Saira Condensed");

  public record Typography(String fontFamily, int fontSize) {}

  public boolean isMaintenance() {
    return Boolean.TRUE.equals(
        jdbc.queryForObject("SELECT bao_tri FROM cai_dat_he_thong WHERE id = 1", Boolean.class));
  }

  public void setMaintenance(boolean enabled) {
    if (jdbc.update("UPDATE cai_dat_he_thong SET bao_tri = ? WHERE id = 1", enabled) != 1) {
      throw new IllegalStateException("Thiếu dòng cấu hình hệ thống. Hãy chạy script SQL 007.");
    }
  }

  public static boolean isAdmin(NguoiDung user) {
    return user != null
        && user.getTrangThai() == TrangThaiCoBanEnum.HOAT_DONG
        && user.getVaiTro() != null
        && "ADMIN".equals(user.getVaiTro().getTenVaiTro());
  }

  public static AppException maintenanceError() {
    return new AppException(
        ErrorCode.SYSTEM_MAINTENANCE,
        null,
        "SYSTEM_MAINTENANCE",
        "Hệ thống đang bảo trì. Vui lòng quay lại sau.");
  }

  public void requireAccess(NguoiDung user) {
    if (isMaintenance() && !isAdmin(user)) throw maintenanceError();
  }

  public Typography getTypography(Long userId) {
    return jdbc.queryForObject(
        "SELECT COALESCE(n.font_family, 'Inter'), s.font_size FROM nguoi_dung n CROSS JOIN cai_dat_he_thong s WHERE n.id = ? AND s.id = 1",
        (row, index) -> new Typography(row.getString(1), row.getInt(2)),
        userId);
  }

  public int getProjectFontSize() {
    return jdbc.queryForObject(
        "SELECT font_size FROM cai_dat_he_thong WHERE id = 1", Integer.class);
  }

  @Transactional
  public Typography saveTypography(NguoiDung user, Typography value) {
    if (value == null
        || value.fontFamily() == null
        || !FONTS.contains(value.fontFamily())
        || value.fontSize() < 12
        || value.fontSize() > 20) {
      throw new AppException(
          ErrorCode.INVALID_DATA, "Chọn phông chữ trong danh sách và cỡ chữ từ 12 đến 20 px.");
    }
    if (!isAdmin(user) && value.fontSize() != getProjectFontSize()) {
      throw new AppException(
          ErrorCode.FORBIDDEN, "Chỉ quản trị viên được thay đổi cỡ chữ toàn hệ thống.");
    }
    if (jdbc.update(
            "UPDATE nguoi_dung SET font_family = ? WHERE id = ?", value.fontFamily(), user.getId())
        != 1) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }
    if (isAdmin(user)
        && jdbc.update("UPDATE cai_dat_he_thong SET font_size = ? WHERE id = 1", value.fontSize())
            != 1) {
      throw new IllegalStateException("Thiếu dòng cấu hình hệ thống. Hãy chạy script SQL 008.");
    }
    return value;
  }
}
