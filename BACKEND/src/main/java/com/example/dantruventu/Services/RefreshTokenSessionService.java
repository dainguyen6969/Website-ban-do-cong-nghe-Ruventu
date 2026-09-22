package com.example.dantruventu.Services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RefreshTokenSessionService {

    private static final String KEY_PREFIX = "auth:refresh:";

    private final StringRedisTemplate redisTemplate;
    private final JwtService jwtService;

    public void saveRefreshToken(String refreshToken) {
        System.out.println(">>> [DEV MODE] Đã bỏ qua bước lưu Token vào Redis vì máy chưa cài Redis.");
    }

    public boolean isRefreshTokenActive(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return false;
        }
        System.out.println(">>> [DEV MODE] Luôn trả về TRUE do đang tắt Redis.");
        return true;
    }

    public void revokeRefreshToken(String refreshToken) {
        System.out.println(">>> [DEV MODE] Bỏ qua xóa Redis.");
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