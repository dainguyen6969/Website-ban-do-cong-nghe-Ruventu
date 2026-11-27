package com.example.dantruventu.Services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenSessionService {

  private static final String KEY_PREFIX = "auth:refresh:";

  private final StringRedisTemplate redisTemplate;

  public void saveRefreshToken(String refreshToken, Date expiration) {
    long remainingTime = expiration.getTime() - System.currentTimeMillis();
    if (remainingTime <= 0) return;

    redisTemplate
        .opsForValue()
        .set(KEY_PREFIX + sessionId(refreshToken), "ACTIVE", Duration.ofMillis(remainingTime));
  }

  public boolean isRefreshTokenActive(String refreshToken) {
    return refreshToken != null
        && !refreshToken.isBlank()
        && isSessionActive(sessionId(refreshToken));
  }

  public boolean isSessionActive(String sessionId) {
    return sessionId != null
        && !sessionId.isBlank()
        && Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + sessionId));
  }

  public void revokeRefreshToken(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) return;
    redisTemplate.delete(KEY_PREFIX + sessionId(refreshToken));
  }

  static String sessionId(String token) {
    try {
      var digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("Không thể khởi tạo SHA-256", exception);
    }
  }
}
