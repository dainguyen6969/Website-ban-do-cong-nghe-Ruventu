package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.LoginRequest;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Repository.NguoiDungRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;

class SystemSettingsServiceTest {
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private final SystemSettingsService settings = new SystemSettingsService(jdbc);

  private NguoiDung user(String role) {
    return NguoiDung.builder()
        .id(5L)
        .matKhau("hash")
        .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
        .vaiTro(VaiTro.builder().id(1L).tenVaiTro(role).build())
        .build();
  }

  private void maintenance() {
    when(jdbc.queryForObject("SELECT bao_tri FROM cai_dat_he_thong WHERE id = 1", Boolean.class))
        .thenReturn(true);
  }

  @Test
  void typographyReadsTheSharedConfigurationWithoutAnAccount() {
    var saved = new SystemSettingsService.Typography("Asap Condensed", 16);
    when(jdbc.queryForObject(
            eq("SELECT font_family, font_size FROM cai_dat_he_thong WHERE id = 1"),
            org.mockito.ArgumentMatchers.<RowMapper<SystemSettingsService.Typography>>any()))
        .thenReturn(saved);
    assertEquals(saved, settings.getTypography());
    verify(jdbc)
        .queryForObject(
            eq("SELECT font_family, font_size FROM cai_dat_he_thong WHERE id = 1"),
            org.mockito.ArgumentMatchers.<RowMapper<SystemSettingsService.Typography>>any());
    verifyNoMoreInteractions(jdbc);
  }

  @Test
  void typographyRejectsUnknownFontsAndInvalidSizesBeforeWriting() {
    for (int size : new int[] {0, 11, 21, 100}) {
      assertThrows(
          AppException.class,
          () ->
              settings.saveTypography(
                  user("ADMIN"), new SystemSettingsService.Typography("Inter", size)));
    }
    assertThrows(
        AppException.class,
        () ->
            settings.saveTypography(
                user("ADMIN"), new SystemSettingsService.Typography("unknown", 14)));
    assertThrows(AppException.class, () -> settings.saveTypography(user("ADMIN"), null));
    verifyNoInteractions(jdbc);
    when(jdbc.update(
            "UPDATE cai_dat_he_thong SET font_family = ?, font_size = ? WHERE id = 1", "Inter", 20))
        .thenReturn(1);
    assertEquals(
        20,
        settings
            .saveTypography(user("ADMIN"), new SystemSettingsService.Typography("Inter", 20))
            .fontSize());
    verify(jdbc)
        .update(
            "UPDATE cai_dat_he_thong SET font_family = ?, font_size = ? WHERE id = 1", "Inter", 20);
  }

  @Test
  void ordinaryAccountCannotWriteProjectFontOrSize() {
    var denied =
        assertThrows(
            AppException.class,
            () ->
                settings.saveTypography(
                    user("USER"), new SystemSettingsService.Typography("Archivo", 20)));
    assertEquals(403, denied.getErrorCode().getStatus().value());
    assertThrows(
        AppException.class,
        () ->
            settings.saveTypography(
                user("USER"), new SystemSettingsService.Typography("Archivo", 18)));
    verifyNoInteractions(jdbc);
  }

  @Test
  void correctUserPasswordCannotIssueTokensDuringMaintenanceButAdminCan() {
    maintenance();
    var users = mock(NguoiDungRepository.class);
    var passwords = mock(PasswordEncoder.class);
    var tokens = mock(AuthTokenService.class);
    var login = new LoginService(users, passwords, tokens, settings);
    var request =
        LoginRequest.builder().taiKhoan("person@example.test").matKhau("password").build();
    when(passwords.matches("password", "hash")).thenReturn(true);
    when(users.findByEmailOrSoDienThoai(anyString(), anyString()))
        .thenReturn(Optional.of(user("USER")));
    assertThrows(AppException.class, () -> login.login(request));
    verifyNoInteractions(tokens);
    var admin = user("ADMIN");
    when(users.findByEmailOrSoDienThoai(anyString(), anyString())).thenReturn(Optional.of(admin));
    when(tokens.generateTokenPair(admin, false))
        .thenReturn(new AuthTokenService.TokenPair("access", "refresh"));
    assertEquals(200, login.login(request).response().getStatus());
    admin.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    assertFalse(SystemSettingsService.isAdmin(admin));
  }

  @Test
  void activeRefreshSessionCannotBypassMaintenance() {
    maintenance();
    var jwt = mock(JwtService.class);
    var sessions = mock(RefreshTokenSessionService.class);
    var users = mock(NguoiDungRepository.class);
    when(jwt.isRefreshTokenValid("refresh")).thenReturn(true);
    when(sessions.isRefreshTokenActive("refresh")).thenReturn(true);
    when(jwt.getUserIdFromToken("refresh")).thenReturn(5L);
    when(users.findById(5L)).thenReturn(Optional.of(user("USER")));
    var refresh = new RefreshService(jwt, sessions, users, settings);
    assertThrows(AppException.class, () -> refresh.refresh("refresh"));
    verify(jwt, never()).generateAccessToken(any());
    var admin = user("ADMIN");
    when(users.findById(5L)).thenReturn(Optional.of(admin));
    when(jwt.generateAccessToken(admin)).thenReturn("new-access");
    assertNotNull(refresh.refresh("refresh"));
  }
}
