package com.example.dantruventu.Services;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LogoutService {

  private final JwtService jwtService;
  private final RefreshTokenSessionService refreshTokenSessionService;

  public LogoutResult logout(String refreshToken) {
    if (refreshToken != null
        && !refreshToken.isBlank()
        && jwtService.isRefreshTokenValid(refreshToken)) {
      try {
        refreshTokenSessionService.revokeRefreshToken(refreshToken);
      } catch (DataAccessException exception) {
        return new LogoutResult(503, "Không thể thu hồi phiên, vui lòng thử lại.");
      }
    }

    return new LogoutResult(200, "Đăng xuất thành công");
  }

  public record LogoutResult(int status, String message) {}
}
