package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.LoginRequest;
import com.example.dantruventu.DTO.Response.LoginResponse;
import com.example.dantruventu.Services.LoginService;
import com.example.dantruventu.Services.RefreshTokenCookieService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class LoginController {

    private final LoginService loginService;
    private final RefreshTokenCookieService refreshTokenCookieService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {

        LoginService.LoginResult result =
                loginService.login(request);

        LoginResponse response = result.response();

        if (result.refreshToken() == null) {
            return ResponseEntity
                    .status(response.getStatus())
                    .body(response);
        }

        ResponseCookie refreshTokenCookie =
                refreshTokenCookieService
                        .createRefreshTokenCookie(
                                result.refreshToken()
                        );

        return ResponseEntity
                .status(response.getStatus())
                .header(
                        HttpHeaders.SET_COOKIE,
                        refreshTokenCookie.toString()
                )
                .body(response);
    }
}