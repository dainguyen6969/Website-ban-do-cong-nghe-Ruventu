package com.example.dantruventu.Services;

import com.example.dantruventu.Entity.NguoiDung;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private static final String TOKEN_TYPE_CLAIM = "token_type";
    private static final String ACCESS_TOKEN_TYPE = "ACCESS";
    private static final String REFRESH_TOKEN_TYPE = "REFRESH";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${jwt.refresh-token-remember-expiration}")
    private long refreshTokenRememberExpiration;

    public String generateAccessToken(NguoiDung nguoiDung) {

        Date now = new Date();
        Date expiration =
                new Date(now.getTime() + accessTokenExpiration);

        return Jwts.builder()
                .subject(String.valueOf(nguoiDung.getId()))
                .claim("email", nguoiDung.getEmail())
                .claim(
                        "vai_tro",
                        nguoiDung.getVaiTro().getTenVaiTro()
                )
                .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
                .issuedAt(now)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(
            NguoiDung nguoiDung,
            boolean ghiNhoDangNhap
    ) {

        Date now = new Date();

        long expirationTime = ghiNhoDangNhap
                ? refreshTokenRememberExpiration
                : refreshTokenExpiration;

        Date expiration =
                new Date(now.getTime() + expirationTime);

        return Jwts.builder()
                .subject(String.valueOf(nguoiDung.getId()))
                .claim(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE)
                .issuedAt(now)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public boolean isAccessTokenValid(String token) {

        try {

            Claims claims = extractClaims(token);

            return ACCESS_TOKEN_TYPE.equals(
                    claims.get(TOKEN_TYPE_CLAIM, String.class)
            );

        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    public boolean isRefreshTokenValid(String token) {

        try {

            Claims claims = extractClaims(token);

            return REFRESH_TOKEN_TYPE.equals(
                    claims.get(TOKEN_TYPE_CLAIM, String.class)
            );

        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    public Long getUserIdFromToken(String token) {

        Claims claims = extractClaims(token);

        return Long.valueOf(claims.getSubject());
    }

    public Date getExpirationFromToken(String token) {

        Claims claims = extractClaims(token);

        return claims.getExpiration();
    }

    private Claims extractClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {

        return Keys.hmacShaKeyFor(
                jwtSecret.getBytes(StandardCharsets.UTF_8)
        );
    }
}