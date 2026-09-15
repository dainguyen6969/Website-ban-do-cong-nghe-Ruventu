package com.example.dantruventu.Error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_DATA(
            HttpStatus.BAD_REQUEST,
            "Dữ liệu không hợp lệ"
    ),

    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "Chưa đăng nhập hoặc thông tin xác thực không hợp lệ"
    ),

    FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "Bạn không có quyền thực hiện thao tác này"
    ),

    NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Dữ liệu không tồn tại"
    ),

    CONFLICT(
            HttpStatus.CONFLICT,
            "Dữ liệu bị xung đột"
    ),

    TOO_MANY_REQUESTS(
            HttpStatus.TOO_MANY_REQUESTS,
            "Yêu cầu quá nhiều, vui lòng thử lại sau"
    ),

    METHOD_NOT_ALLOWED(
            HttpStatus.METHOD_NOT_ALLOWED,
            "Phương thức không được phép"
    ),

    INTERNAL_SERVER_ERROR(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Đã xảy ra lỗi hệ thống"
    );

    private final HttpStatus status;
    private final String message;
}