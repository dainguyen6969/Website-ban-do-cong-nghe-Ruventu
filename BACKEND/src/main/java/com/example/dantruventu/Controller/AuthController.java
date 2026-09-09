package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.RegisterRequest;
import com.example.dantruventu.DTO.Request.ResendOtpRequest;
import com.example.dantruventu.DTO.Request.VerifyOtpRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.RegisterResponse;
import com.example.dantruventu.DTO.Response.ResendOtpResponse;
import com.example.dantruventu.DTO.Response.VerifyOtpResponse;
import com.example.dantruventu.Services.AuthRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthRegistrationService authRegistrationService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {

        RegisterResponse data = authRegistrationService.register(request);

        ApiResponse<RegisterResponse> response =
                ApiResponse.<RegisterResponse>builder()
                        .status(HttpStatus.OK.value())
                        .message("Mã OTP đã được gửi")
                        .data(data)
                        .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/resend")
    public ResponseEntity<ApiResponse<ResendOtpResponse>> resendOtp(
            @Valid @RequestBody ResendOtpRequest request
    ) {

        ResendOtpResponse data =
                authRegistrationService.resendOtp(request);

        ApiResponse<ResendOtpResponse> response =
                ApiResponse.<ResendOtpResponse>builder()
                        .status(HttpStatus.OK.value())
                        .message("Mã OTP mới đã được gửi")
                        .data(data)
                        .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<VerifyOtpResponse>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {

        VerifyOtpResponse data =
                authRegistrationService.verifyOtp(request);

        ApiResponse<VerifyOtpResponse> response =
                ApiResponse.<VerifyOtpResponse>builder()
                        .status(HttpStatus.CREATED.value())
                        .message("Tạo tài khoản thành công")
                        .data(data)
                        .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(response);
    }
}