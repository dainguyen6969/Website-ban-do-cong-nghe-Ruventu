package com.example.dantruventu.Services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LogoutService {

  private final JwtService jwtService;
  private final RefreshTokenSessionService refreshTokenSessionService;

  public LogoutResult logout(String refreshToken) {

    if (refreshToken == null
        || refreshToken.isBlank()
        || !jwtService.isRefreshTokenValid(refreshToken)) {

      return new LogoutResult(400, "Refresh Token không hợp lệ");
    }

    try {
      if (!refreshTokenSessionService.isRefreshTokenActive(refreshToken)) {

        return new LogoutResult(400, "Refresh Token không hợp lệ");
      }

      refreshTokenSessionService.revokeRefreshToken(refreshToken);

      if (refreshTokenSessionService.isRefreshTokenActive(refreshToken)) {

        return new LogoutResult(500, "Không thể thu hồi phiên");
      }

      return new LogoutResult(200, "Đăng xuất thành công");

    } catch (RuntimeException exception) {

      return new LogoutResult(500, "Không thể thu hồi phiên");
    }
  }

  public record LogoutResult(int status, String message) {}
}
