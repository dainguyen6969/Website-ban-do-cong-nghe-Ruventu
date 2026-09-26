package com.example.dantruventu.Error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
  INVALID_DATA(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ"),

  INVALID_PARAM(HttpStatus.BAD_REQUEST, "Tham số không hợp lệ."),

  INVALID_ROLE_SEARCH_PARAM(
      HttpStatus.BAD_REQUEST, "Tham số tìm kiếm/phân trang không hợp lệ."),

  ROLE_NAME_REQUIRED(
      HttpStatus.BAD_REQUEST, "Tên vai trò để trống hoặc dữ liệu không hợp lệ."),

  INVALID_ID(HttpStatus.BAD_REQUEST, "ID không hợp lệ."),

  INVALID_CART_QUANTITY(
      HttpStatus.BAD_REQUEST, "Số lượng phải lớn hơn 0 và không được vượt quá 99"),

  UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập hoặc thông tin xác thực không hợp lệ"),

  UNAUTHORIZED_TOKEN(HttpStatus.UNAUTHORIZED, "Token thiếu, không hợp lệ hoặc hết hạn."),

  INVALID_OR_EXPIRED_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn"),

  FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),

  ACCOUNT_LOCKED_OR_FORBIDDEN(HttpStatus.FORBIDDEN, "Tài khoản bị khóa hoặc không có quyền"),

  NOT_FOUND(HttpStatus.NOT_FOUND, "Dữ liệu không tồn tại"),

  ADDRESS_NOT_FOUND_OR_NOT_OWNED(
      HttpStatus.NOT_FOUND, "Địa chỉ không tồn tại hoặc không thuộc user."),

  EMPLOYEE_NOT_FOUND_OR_CUSTOMER(
      HttpStatus.NOT_FOUND, "Nhân viên không tồn tại hoặc ID thuộc khách hàng."),

  ROLE_NOT_FOUND(HttpStatus.NOT_FOUND, "Vai trò không tồn tại."),

  ROLE_NOT_FOUND_OR_CUSTOMER(
      HttpStatus.NOT_FOUND, "Vai trò không tồn tại hoặc là vai trò Khách hàng ngoài phạm vi quản lý."),

  PRODUCT_VARIANT_NOT_FOUND(HttpStatus.NOT_FOUND, "Phiên bản sản phẩm không tồn tại"),

  CONFLICT(HttpStatus.CONFLICT, "Dữ liệu bị xung đột"),

  ROLE_NAME_EXISTS(HttpStatus.CONFLICT, "Tên vai trò đã tồn tại."),

  CANNOT_EDIT_PROTECTED_ROLE(
      HttpStatus.CONFLICT, "Không thể chỉnh sửa vai trò hệ thống mặc định."),

  EMAIL_OR_PHONE_EXISTS(HttpStatus.CONFLICT, "Email hoặc SĐT đã tồn tại."),

  PHONE_ALREADY_EXISTS(HttpStatus.CONFLICT, "SĐT đã được sử dụng bởi người dùng khác."),

  CANNOT_LOCK_OWN_ACCOUNT(HttpStatus.CONFLICT, "Không thể tự khóa tài khoản của chính mình."),

  CANNOT_DEMOTE_OWN_ACCOUNT(
      HttpStatus.CONFLICT, "Không thể tự hạ quyền quản trị viên của chính mình."),

  INSUFFICIENT_STOCK(HttpStatus.CONFLICT, "Tồn kho không đủ"),

  TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "Yêu cầu quá nhiều, vui lòng thử lại sau"),

  METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Phương thức không được phép"),

  UNPROCESSABLE_ENTITY(HttpStatus.valueOf(422), "Dữ liệu không thể xử lý"),

  INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống");

  private final HttpStatus status;
  private final String message;
}
