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

    INVALID_CART_QUANTITY(
            HttpStatus.BAD_REQUEST,
            "Số lượng phải lớn hơn 0 và không được vượt quá 99"
    ),

    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "Chưa đăng nhập hoặc thông tin xác thực không hợp lệ"
    ),

    INVALID_OR_EXPIRED_ACCESS_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "Token không hợp lệ/hết hạn"
    ),

    FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "Bạn không có quyền thực hiện thao tác này"
    ),

    NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Dữ liệu không tồn tại"
    ),

    PRODUCT_VARIANT_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Phiên bản sản phẩm không tồn tại"
    ),

    CONFLICT(
            HttpStatus.CONFLICT,
            "Dữ liệu bị xung đột"
    ),

    INSUFFICIENT_STOCK(
            HttpStatus.CONFLICT,
            "Tồn kho không đủ"
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