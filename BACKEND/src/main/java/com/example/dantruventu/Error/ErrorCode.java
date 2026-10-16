package com.example.dantruventu.Error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
  INVALID_DATA(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ"),

  INVALID_PARAM(HttpStatus.BAD_REQUEST, "Tham số không hợp lệ."),

  INVALID_CUSTOMER_SEARCH_PARAM(HttpStatus.BAD_REQUEST, "Trạng thái hoặc phân trang không hợp lệ."),

  CUSTOMER_NAME_OR_PHONE_REQUIRED(
      HttpStatus.BAD_REQUEST, "Vui lòng nhập Tên khách hàng và số điện thoại"),

  INVALID_ROLE_SEARCH_PARAM(HttpStatus.BAD_REQUEST, "Tham số tìm kiếm/phân trang không hợp lệ."),

  ROLE_NAME_REQUIRED(HttpStatus.BAD_REQUEST, "Tên vai trò để trống hoặc dữ liệu không hợp lệ."),

  INVALID_ID(HttpStatus.BAD_REQUEST, "ID không hợp lệ."),

  INVALID_CART_QUANTITY(
      HttpStatus.BAD_REQUEST, "Số lượng phải lớn hơn 0 và không được vượt quá 99"),

  UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập."),

  UNAUTHORIZED_TOKEN(HttpStatus.UNAUTHORIZED, "Token thiếu, không hợp lệ hoặc hết hạn."),

  INVALID_OR_EXPIRED_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn"),

  FORBIDDEN(HttpStatus.FORBIDDEN, "Không có quyền."),

  INVALID_RECEIPT_SEARCH(HttpStatus.BAD_REQUEST, "Sai enum, khoảng ngày hoặc phân trang."),

  INVALID_DISBURSEMENT_SEARCH(
      HttpStatus.BAD_REQUEST, "Sai enum, ID lọc, khoảng ngày hoặc phân trang."),

  INVALID_CASHBOOK_FILTER(
      HttpStatus.BAD_REQUEST,
      "Thiếu/sai khoảng ngày, enum, ID, FK đối tượng hoặc phân trang không hợp lệ."),

  INVALID_CASHBOOK_EXPORT_FILTER(
      HttpStatus.BAD_REQUEST, "Bộ lọc không hợp lệ hoặc truyền tham số phân trang."),

  INVALID_CASHBOOK_OVERVIEW_FILTER(
      HttpStatus.BAD_REQUEST, "Khoảng ngày, enum hoặc định dạng ID không hợp lệ."),

  INVALID_CASH_FLOW_FILTER(HttpStatus.BAD_REQUEST, "Bộ lọc hoặc nhom_theo không hợp lệ."),

  INVALID_RECEIPT_PAYER_SEARCH(HttpStatus.BAD_REQUEST, "Thiếu nhóm, sai nhóm hoặc phân trang."),

  INVALID_DISBURSEMENT_PAYEE_SEARCH(
      HttpStatus.BAD_REQUEST, "Thiếu nhóm, sai nhóm hoặc phân trang không hợp lệ."),

  INVALID_RECEIPT_REQUEST(
      HttpStatus.BAD_REQUEST,
      "Thiếu trường, tiền không hợp lệ, sai enum, chọn loại CHI, hoặc gửi trường backend quản lý."),

  INVALID_DISBURSEMENT_REQUEST(
      HttpStatus.BAD_REQUEST,
      "Thiếu trường bắt buộc; tiền ≤ 0; sai enum/ngày; vượt giới hạn dữ liệu; chọn loại THU; gửi trường backend quản lý."),

  INVALID_RECEIPT_TYPE_REQUEST(
      HttpStatus.BAD_REQUEST,
      "Thiếu mã/tên, vượt độ dài hoặc gửi trường loai_phieu, trang_thai ngoài input cho phép."),

  INVALID_RECEIPT_TYPE_USAGE(
      HttpStatus.BAD_REQUEST, "dung_cho không hợp lệ; chỉ nhận TAT_CA hoặc THU_CONG."),

  INVALID_DISBURSEMENT_TYPE_SEARCH(
      HttpStatus.BAD_REQUEST, "Trạng thái ngoài 0/1 hoặc phân trang không hợp lệ."),

  INVALID_DISBURSEMENT_TYPE_STATUS(HttpStatus.BAD_REQUEST, "ID hoặc trạng thái không hợp lệ."),

  INVALID_RECEIPT_TYPE_STATUS(HttpStatus.BAD_REQUEST, "Thiếu hoặc sai trạng thái."),

  INVALID_RECEIPT_CANCEL_CONFIRMATION(
      HttpStatus.BAD_REQUEST, "Thiếu xác nhận hoặc xác nhận không hợp lệ."),

  INVALID_DISBURSEMENT_CANCEL_REQUEST(
      HttpStatus.BAD_REQUEST, "ID không hợp lệ; thiếu xác nhận hoặc xác nhận khác true."),

  ACCOUNT_LOCKED_OR_FORBIDDEN(HttpStatus.FORBIDDEN, "Tài khoản bị khóa hoặc không có quyền"),

  NOT_FOUND(HttpStatus.NOT_FOUND, "Dữ liệu không tồn tại"),

  ADDRESS_NOT_FOUND_OR_NOT_OWNED(
      HttpStatus.NOT_FOUND, "Địa chỉ không tồn tại hoặc không thuộc user."),

  EMPLOYEE_NOT_FOUND_OR_CUSTOMER(
      HttpStatus.NOT_FOUND, "Nhân viên không tồn tại hoặc ID thuộc khách hàng."),

  CUSTOMER_NOT_FOUND_OR_EMPLOYEE(
      HttpStatus.NOT_FOUND, "Khách hàng không tồn tại hoặc ID thuộc nhân viên."),

  ROLE_NOT_FOUND(HttpStatus.NOT_FOUND, "Vai trò không tồn tại."),

  ROLE_NOT_FOUND_OR_CUSTOMER(
      HttpStatus.NOT_FOUND,
      "Vai trò không tồn tại hoặc là vai trò Khách hàng ngoài phạm vi quản lý."),

  PRODUCT_VARIANT_NOT_FOUND(HttpStatus.NOT_FOUND, "Phiên bản sản phẩm không tồn tại"),

  RECEIPT_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "Loại thu không tồn tại."),

  DISBURSEMENT_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "Loại chi không tồn tại."),

  RECEIPT_TYPE_NOT_FOUND_OR_EXPENSE(HttpStatus.NOT_FOUND, "Không tồn tại hoặc là loại chi."),

  DISBURSEMENT_TYPE_NOT_FOUND_OR_RECEIPT(HttpStatus.NOT_FOUND, "Không tồn tại hoặc là loại thu."),

  CASHBOOK_FILTER_REFERENCE_NOT_FOUND(
      HttpStatus.NOT_FOUND, "Loại thu/chi, đối tượng hoặc người tạo được chọn không tồn tại."),

  CASHBOOK_EXPORT_REFERENCE_NOT_FOUND(HttpStatus.NOT_FOUND, "Đối tượng được chọn không tồn tại."),

  RECEIPT_DETAIL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tồn tại hoặc ID thuộc phiếu chi."),

  DISBURSEMENT_DETAIL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tồn tại hoặc ID thuộc phiếu thu."),

  RECEIPT_CANCEL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tồn tại hoặc là phiếu chi."),

  DISBURSEMENT_CANCEL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tồn tại hoặc thuộc phiếu thu."),

  CONFLICT(HttpStatus.CONFLICT, "Dữ liệu bị xung đột"),

  ROLE_NAME_EXISTS(HttpStatus.CONFLICT, "Tên vai trò đã tồn tại."),

  ROLE_HAS_EMPLOYEES(HttpStatus.CONFLICT, "Vai trò đang có nhân viên, không thể xóa."),

  CANNOT_EDIT_PROTECTED_ROLE(HttpStatus.CONFLICT, "Không thể chỉnh sửa vai trò hệ thống mặc định."),

  EMAIL_OR_PHONE_EXISTS(HttpStatus.CONFLICT, "Email hoặc SĐT đã tồn tại."),

  PHONE_OR_EMAIL_ALREADY_EXISTS(
      HttpStatus.CONFLICT, "Số điện thoại hoặc email này đã được đăng ký trên hệ thống"),

  PHONE_ALREADY_EXISTS(HttpStatus.CONFLICT, "SĐT đã được sử dụng bởi người dùng khác."),

  CANNOT_LOCK_OWN_ACCOUNT(HttpStatus.CONFLICT, "Không thể tự khóa tài khoản của chính mình."),

  CANNOT_DEMOTE_OWN_ACCOUNT(
      HttpStatus.CONFLICT, "Không thể tự hạ quyền quản trị viên của chính mình."),

  INSUFFICIENT_STOCK(HttpStatus.CONFLICT, "Tồn kho không đủ"),

  RECEIPT_CODE_EXISTS(HttpStatus.CONFLICT, "Mã phiếu thu đã tồn tại."),

  DISBURSEMENT_CODE_EXISTS(HttpStatus.CONFLICT, "Mã phiếu chi đã tồn tại."),

  RECEIPT_TYPE_INACTIVE(HttpStatus.CONFLICT, "Loại thu đã ngừng hoạt động."),

  DISBURSEMENT_TYPE_INACTIVE(HttpStatus.CONFLICT, "Loại chi đã ngừng hoạt động."),

  SYSTEM_DISBURSEMENT_TYPE_CANNOT_BE_DISABLED(
      HttpStatus.CONFLICT, "Không được ngừng hoạt động loại chi dành cho nghiệp vụ tự động."),

  RECEIPT_TYPE_CODE_EXISTS(HttpStatus.CONFLICT, "Mã loại đã tồn tại."),

  RECEIPT_ALREADY_AUTO_RECORDED(
      HttpStatus.CONFLICT, "Khoản thu này đã được hệ thống tự động ghi nhận."),

  DISBURSEMENT_ALREADY_AUTO_RECORDED(
      HttpStatus.CONFLICT, "Khoản chi này đã được hệ thống tự động ghi nhận."),

  RECEIPT_ALREADY_CANCELLED(HttpStatus.CONFLICT, "Phiếu thu đã được hủy."),

  DISBURSEMENT_ALREADY_CANCELLED(HttpStatus.CONFLICT, "Phiếu chi đã được hủy."),

  AUTOMATIC_RECEIPT_CANNOT_BE_CANCELLED(
      HttpStatus.CONFLICT, "Không thể hủy trực tiếp phiếu thu tự động."),

  AUTOMATIC_DISBURSEMENT_CANNOT_BE_CANCELLED(
      HttpStatus.CONFLICT, "Không thể hủy trực tiếp phiếu chi tự động."),

  TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "Yêu cầu quá nhiều, vui lòng thử lại sau"),

  METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Phương thức không được phép"),

  UNPROCESSABLE_ENTITY(HttpStatus.valueOf(422), "Dữ liệu không thể xử lý"),

  CUSTOMER_ROLE_NOT_CONFIGURED(
      HttpStatus.INTERNAL_SERVER_ERROR, "Thiếu cấu hình vai trò Khách hàng hoặc lỗi lưu dữ liệu."),

  CASHBOOK_EXPORT_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR, "Không truy vấn được dữ liệu hoặc không tạo được file."),

  CASHBOOK_OVERVIEW_AGGREGATION_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR, "Không tổng hợp được dữ liệu."),

  CASH_FLOW_AGGREGATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Không tổng hợp được biểu đồ."),

  PC_BUILDER_CONFIGURATION_INVALID(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không tải được cấu hình hạng mục hoặc cấu hình danh mục không hợp lệ."),

  INVALID_PC_BUILDER_PRODUCTS_FILTER(
      HttpStatus.BAD_REQUEST,
      "Hạng mục, giá, phân trang, sắp xếp hoặc đối chiếu socket không hợp lệ."),

  PC_BUILDER_REFERENCE_NOT_FOUND(HttpStatus.NOT_FOUND, "Phiên bản đối chiếu không tồn tại."),

  PC_BUILDER_REFERENCE_DISCONTINUED(HttpStatus.CONFLICT, "Phiên bản đối chiếu đã ngừng bán."),

  PC_BUILDER_REFERENCE_SOCKET_MISSING(HttpStatus.CONFLICT, "Thiếu socket để lọc chính xác."),

  PC_BUILDER_PRODUCTS_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống hoặc cấu hình kho."),

  INVALID_PC_BUILDER_PREVIEW(
      HttpStatus.BAD_REQUEST,
      "Sai cấu trúc, hạng mục trùng, phiên bản đặt sai hạng mục hoặc số lượng không phải số nguyên dương."),

  PC_BUILDER_PREVIEW_VARIANT_NOT_FOUND(HttpStatus.NOT_FOUND, "Phiên bản không tồn tại."),

  PC_BUILDER_PREVIEW_UNAVAILABLE(
      HttpStatus.CONFLICT,
      "Sản phẩm/phiên bản vừa ngừng hoạt động hoặc hạng mục không còn cho phép sản phẩm đó."),

  PC_BUILDER_PREVIEW_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Không kiểm tra được cấu hình."),

  INVALID_CART_PC_BUILD(
      HttpStatus.BAD_REQUEST,
      "Cấu hình rỗng, DTO sai, thiếu khóa chống lặp hoặc thiếu đơn giá đối chiếu."),
  CART_PC_BUILD_DISCONTINUED(HttpStatus.CONFLICT, "Sản phẩm hoặc phiên bản đã ngừng bán."),
  CART_PC_BUILD_PRICE_CHANGED(
      HttpStatus.CONFLICT, "Giá đã thay đổi. Vui lòng kiểm tra lại cấu hình."),
  CART_PC_BUILD_SOCKET_INVALID(
      HttpStatus.CONFLICT, "CPU và MAIN không khớp hoặc thiếu dữ liệu socket."),
  CART_PC_BUILD_INSUFFICIENT_STOCK(
      HttpStatus.CONFLICT, "Tổng số lượng sau cộng giỏ vượt số lượng có thể bán."),
  CART_PC_BUILD_IDEMPOTENCY_CONFLICT(
      HttpStatus.CONFLICT, "Cùng Idempotency-Key nhưng nội dung khác."),
  GUEST_CART_EXPIRED(HttpStatus.CONFLICT, "Phiên giỏ khách đã hết hạn. Vui lòng tải lại giỏ hàng."),
  CART_CONCURRENT_CHANGE(
      HttpStatus.CONFLICT,
      "Giỏ hàng đã thay đổi đồng thời. Vui lòng gửi lại với cùng Idempotency-Key."),
  CART_PC_BUILD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Không cập nhật được toàn bộ giỏ."),

  INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống");

  private final HttpStatus status;
  private final String message;
}
