package com.example.dantruventu.Services;

import com.example.dantruventu.Entity.NguoiDung;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthTokenService {

  private final JwtService jwtService;
  private final RefreshTokenSessionService refreshTokenSessionService;

  public TokenPair generateTokenPair(NguoiDung nguoiDung, boolean ghiNhoDangNhap) {
    String refreshToken = jwtService.generateRefreshToken(nguoiDung, ghiNhoDangNhap);
    String accessToken = jwtService.generateAccessToken(nguoiDung, refreshToken);
    refreshTokenSessionService.saveRefreshToken(
        refreshToken, jwtService.getExpirationFromToken(refreshToken));
    return new TokenPair(accessToken, refreshToken);
  }

  public record TokenPair(String accessToken, String refreshToken) {}
}
