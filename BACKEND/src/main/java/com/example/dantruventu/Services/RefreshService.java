package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.RefreshResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshService {

  private final JwtService jwtService;
  private final RefreshTokenSessionService refreshTokenSessionService;
  private final NguoiDungRepository nguoiDungRepository;

  public RefreshResponse refresh(String refreshToken) {

    if (refreshToken == null
        || refreshToken.isBlank()
        || !jwtService.isRefreshTokenValid(refreshToken)) {

      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    if (!refreshTokenSessionService.isRefreshTokenActive(refreshToken)) {

      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    Long userId;

    try {

      userId = jwtService.getUserIdFromToken(refreshToken);

    } catch (RuntimeException exception) {

      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    NguoiDung nguoiDung =
        nguoiDungRepository
            .findById(userId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

    String accessToken = jwtService.generateAccessToken(nguoiDung);

    return RefreshResponse.builder().accessToken(accessToken).build();
  }
}
