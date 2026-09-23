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
  private final JwtService jwtService;

  public void saveRefreshToken(String refreshToken) {

    Date expiration = jwtService.getExpirationFromToken(refreshToken);

    long remainingTime = expiration.getTime() - System.currentTimeMillis();

    if (remainingTime <= 0) {
      return;
    }

    String key = buildKey(refreshToken);

    redisTemplate.opsForValue().set(key, "ACTIVE", Duration.ofMillis(remainingTime));
  }

  public boolean isRefreshTokenActive(String refreshToken) {

    if (refreshToken == null || refreshToken.isBlank()) {
      return false;
    }

    String key = buildKey(refreshToken);

    return Boolean.TRUE.equals(redisTemplate.hasKey(key));
  }

  public void revokeRefreshToken(String refreshToken) {

    if (refreshToken == null || refreshToken.isBlank()) {
      return;
    }

    redisTemplate.delete(buildKey(refreshToken));
  }

  private String buildKey(String refreshToken) {
    return KEY_PREFIX + hashToken(refreshToken);
  }

  private String hashToken(String token) {

    try {

      MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");

      byte[] hash = messageDigest.digest(token.getBytes(StandardCharsets.UTF_8));

      return HexFormat.of().formatHex(hash);

    } catch (NoSuchAlgorithmException exception) {

      throw new IllegalStateException("Không thể khởi tạo SHA-256", exception);
    }
  }
}
