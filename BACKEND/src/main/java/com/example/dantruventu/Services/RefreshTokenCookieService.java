package com.example.dantruventu.Services;

import java.time.Duration;
import java.util.Date;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenCookieService {

  private static final String COOKIE_NAME = "refresh_token";

  private final JwtService jwtService;

  @Value("${auth.cookie.secure:false}")
  private boolean secure;

  public ResponseCookie createRefreshTokenCookie(String refreshToken) {

    Date expiration = jwtService.getExpirationFromToken(refreshToken);

    long remainingTime = expiration.getTime() - System.currentTimeMillis();

    if (remainingTime < 0) {
      remainingTime = 0;
    }

    return ResponseCookie.from(COOKIE_NAME, refreshToken)
        .httpOnly(true)
        .secure(secure)
        .sameSite("Lax")
        .path("/api/v1/auth")
        .maxAge(Duration.ofMillis(remainingTime))
        .build();
  }

  public ResponseCookie clearRefreshTokenCookie() {

    return ResponseCookie.from(COOKIE_NAME, "")
        .httpOnly(true)
        .secure(secure)
        .sameSite("Lax")
        .path("/api/v1/auth")
        .maxAge(Duration.ZERO)
        .build();
  }
}
