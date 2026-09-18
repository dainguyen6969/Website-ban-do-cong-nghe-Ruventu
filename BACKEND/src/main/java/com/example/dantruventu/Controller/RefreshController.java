package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.RefreshResponse;
import com.example.dantruventu.Services.RefreshService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class RefreshController {

    private final RefreshService refreshService;

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshResponse>> refresh(
            @CookieValue(
                    name = "refresh_token",
                    required = false
            ) String refreshToken
    ) {

        RefreshResponse data =
                refreshService.refresh(refreshToken);

        ApiResponse<RefreshResponse> response =
                ApiResponse.<RefreshResponse>builder()
                        .status(200)
                        .message("Cấp lại Access Token thành công")
                        .data(data)
                        .build();

        return ResponseEntity.ok(response);
    }
}