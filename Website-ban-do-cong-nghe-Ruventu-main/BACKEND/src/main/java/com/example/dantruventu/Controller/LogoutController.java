package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.Services.LogoutService;
import com.example.dantruventu.Services.RefreshTokenCookieService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class LogoutController {

    private final LogoutService logoutService;
    private final RefreshTokenCookieService refreshTokenCookieService;

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(
                    name = "refresh_token",
                    required = false
            ) String refreshToken
    ) {

        LogoutService.LogoutResult result =
                logoutService.logout(refreshToken);

        ApiResponse<Void> response =
                ApiResponse.<Void>builder()
                        .status(result.status())
                        .message(result.message())
                        .data(null)
                        .build();

        if (result.status() != 200) {
            return ResponseEntity
                    .status(result.status())
                    .body(response);
        }

        ResponseCookie clearCookie =
                refreshTokenCookieService
                        .clearRefreshTokenCookie();

        return ResponseEntity
                .ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        clearCookie.toString()
                )
                .body(response);
    }
}