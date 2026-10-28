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

  INVALID_WARRANTY_SEARCH(
      HttpStatus.BAD_REQUEST, "Enum, khoảng ngày hoặc phân trang bảo hành không hợp lệ."),

  INVALID_WARRANTY_FINANCIAL_DATA(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Dữ liệu hóa đơn hoặc giao dịch tiền bảo hành không hợp lệ."),

  INVALID_WARRANTY_LOOKUP(
      HttpStatus.BAD_REQUEST, "Thiếu tiêu chí tra cứu, ID hoặc phân trang không hợp lệ."),

  INVALID_WARRANTY_DETAIL(
      HttpStatus.BAD_REQUEST, "ID hoặc phân trang lịch sử bảo hành không hợp lệ."),

  WARRANTY_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu bảo hành"),

  INTAKE_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu tiếp nhận"),

  INVALID_WARRANTY_HISTORY(
      HttpStatus.INTERNAL_SERVER_ERROR, "Dữ liệu lịch sử bảo hành không hợp lệ."),

  INVALID_WARRANTY_READ_DATA(
      HttpStatus.INTERNAL_SERVER_ERROR, "Dữ liệu thiết bị hoặc quyền bảo hành không nhất quán."),

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

  INVALID_WARRANTY_CREATE(HttpStatus.BAD_REQUEST, "Thông tin tiếp nhận bảo hành không hợp lệ."),
  WARRANTY_DEVICE_NOT_FOUND(HttpStatus.NOT_FOUND, "Thiết bị không tồn tại."),
  WARRANTY_PURCHASE_LINE_NOT_FOUND(HttpStatus.NOT_FOUND, "Dòng mua không tồn tại."),
  WARRANTY_OR_RETURN_LOCKED(HttpStatus.CONFLICT, "Không thể tiếp nhận do xung đột xử lý"),
  WARRANTY_IDEMPOTENCY_KEY_REUSED(HttpStatus.CONFLICT, "Idempotency-Key đã dùng với nội dung khác"),
  WARRANTY_ORIGIN_UNVERIFIED(
      HttpStatus.CONFLICT,
      "Chưa đủ căn cứ xác minh thiết bị đã giao và quyền bảo hành còn hợp lệ."),
  WARRANTY_FREE_CONDITION_UNVERIFIED(
      HttpStatus.CONFLICT, "Chưa đủ căn cứ hoặc hạn bảo hành để xác nhận đủ điều kiện miễn phí."),
  WARRANTY_PC_COMPONENT_UNSUPPORTED(
      HttpStatus.CONFLICT,
      "Chưa hỗ trợ tạo hồ sơ thành phần bộ PC vì chưa có quy ước và luồng lưu bản chụp linh kiện thực tế đã giao."),
  WARRANTY_CREATE_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không thể tiếp nhận bảo hành; toàn bộ thay đổi đã được hủy."),

  INVALID_WARRANTY_INTAKE_RESULT(
      HttpStatus.BAD_REQUEST, "Thông tin kết quả tiếp nhận không hợp lệ."),
  WARRANTY_INTAKE_LINK_MISMATCH(
      HttpStatus.BAD_REQUEST, "Các liên kết tiếp nhận không thuộc cùng thiết bị hoặc giao dịch."),
  WARRANTY_DEVICE_ALREADY_IN_CUSTODY(
      HttpStatus.CONFLICT, "Thiết bị đã được cửa hàng giữ, phải theo dõi tới bàn giao"),
  WARRANTY_INTAKE_RESULT_CLOSED(
      HttpStatus.CONFLICT, "Yêu cầu tiếp nhận đã kết thúc hoặc đã thay đổi; vui lòng tải lại."),
  WARRANTY_INTAKE_RESULT_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không lưu được kết quả tiếp nhận; toàn bộ thay đổi đã được hủy."),
  INVALID_WARRANTY_STATUS(
      HttpStatus.BAD_REQUEST, "Sự kiện hoặc thông tin cập nhật trạng thái không hợp lệ."),
  WARRANTY_STATUS_TRANSITION_INVALID(
      HttpStatus.CONFLICT, "Không được chuyển trạng thái bảo hành theo sự kiện này."),
  WARRANTY_HANDOVER_DEVICE_NOT_READY(HttpStatus.CONFLICT, "Chưa có thiết bị đúng để bàn giao"),
  INVALID_WARRANTY_HANDOVER(HttpStatus.BAD_REQUEST, "Thông tin thiết bị, người nhận hoặc xác nhận bàn giao không hợp lệ."),
  WARRANTY_HANDOVER_NOT_READY(HttpStatus.CONFLICT, "Chưa có đúng thiết bị hoặc phụ kiện để giao"),
  WARRANTY_HANDOVER_PAYMENT_REQUIRED(HttpStatus.CONFLICT, "Chưa đủ điều kiện thanh toán trước bàn giao"),
  WARRANTY_HANDOVER_ALREADY_COMPLETED(HttpStatus.CONFLICT, "Phiếu đã bàn giao, không được bàn giao lại."),
  WARRANTY_HANDOVER_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Không hoàn tất được bàn giao bảo hành; toàn bộ thay đổi đã được hủy."),
  WARRANTY_STATUS_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không cập nhật được trạng thái bảo hành; toàn bộ thay đổi đã được hủy."),

  INVALID_WARRANTY_EVENT(
      HttpStatus.BAD_REQUEST, "Sự kiện hoặc thông tin sự kiện bảo hành không hợp lệ."),
  WARRANTY_EVENT_TRANSITION_INVALID(
      HttpStatus.CONFLICT, "Sự kiện không phù hợp trạng thái hoặc nơi giữ thiết bị."),
  WARRANTY_ALREADY_COMPLETED(HttpStatus.CONFLICT, "Phiếu đã hoàn tất, không mở lại xử lý thiết bị"),
  WARRANTY_PAID_WORK_NOT_AUTHORIZED(
      HttpStatus.CONFLICT, "Chưa được phép thực hiện công việc có phí"),
  WARRANTY_EVENT_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không lưu được sự kiện bảo hành; toàn bộ thay đổi đã được hủy."),
  INVALID_WARRANTY_QUOTE(
      HttpStatus.BAD_REQUEST,
      "Thông tin phí, số lượng, thời hạn hoặc đặt cọc báo giá không hợp lệ."),
  WARRANTY_QUOTE_SOURCE_INVALID(
      HttpStatus.CONFLICT, "Phiên bản nguồn hoặc kết luận không còn phù hợp; vui lòng tải lại."),
  APPROVED_FEE_REMOVAL_UNJUSTIFIED(
      HttpStatus.CONFLICT, "Không được bỏ khoản phí đã được khách chấp thuận"),
  WARRANTY_QUOTE_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR, "Không lập được báo giá; toàn bộ thay đổi đã được hủy."),
  INVALID_WARRANTY_QUOTE_EVENT(
      HttpStatus.BAD_REQUEST, "Hành động, kênh, thời gian hoặc bằng chứng báo giá không hợp lệ."),
  WARRANTY_QUOTE_EVENT_TRANSITION_INVALID(
      HttpStatus.CONFLICT, "Báo giá chưa được gửi hoặc không phải phạm vi đang áp dụng."),
  WARRANTY_QUOTE_EXPIRED(HttpStatus.CONFLICT, "Báo giá đã hết hiệu lực, không nhận quyết định mới"),
  WARRANTY_QUOTE_ALREADY_DECIDED(
      HttpStatus.CONFLICT, "Không được thu hồi để ghi đè quyết định đã xảy ra"),
  WARRANTY_QUOTE_EVENT_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không xử lý được sự kiện báo giá; toàn bộ thay đổi đã được hủy."),
  INVALID_WARRANTY_INVOICE(
      HttpStatus.BAD_REQUEST, "Hành động, số tiền, thời hạn hoặc căn cứ hóa đơn không hợp lệ."),
  WARRANTY_INVOICE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy hóa đơn thuộc phiếu bảo hành."),
  WARRANTY_INVOICE_INACTIVE(HttpStatus.CONFLICT, "Hóa đơn không còn hiệu lực."),
  WARRANTY_QUOTE_NOT_APPROVED(
      HttpStatus.CONFLICT, "Chưa có chấp thuận hợp lệ cho phiên bản áp dụng"),
  WARRANTY_FINANCIAL_APPROVAL_FORBIDDEN(
      HttpStatus.FORBIDDEN, "Không có quyền phê duyệt miễn giảm hoặc công nợ"),
  WARRANTY_INVOICE_AMOUNT_EXCEEDED(
      HttpStatus.CONFLICT, "Số tiền điều chỉnh hoặc công nợ vượt mức hợp lệ của hóa đơn."),
  WARRANTY_INVOICE_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không cập nhật được hóa đơn bảo hành; toàn bộ thay đổi đã được hủy."),
  INVALID_WARRANTY_REPLACEMENT_ITEMS(
      HttpStatus.BAD_REQUEST, "Dữ liệu cấp hoặc nhận lại hàng đổi không hợp lệ."),
  INVALID_WARRANTY_SUPPLIER_SETTLEMENT(
      HttpStatus.BAD_REQUEST, "Dữ liệu nghĩa vụ, số lượng hoặc căn cứ đối soát không hợp lệ."),
  WARRANTY_SUPPLIER_SETTLEMENT_CONFLICT(
      HttpStatus.CONFLICT, "Nghĩa vụ, thiết bị hoặc nguồn đối soát không còn phù hợp."),
  SUPPLIER_SETTLEMENT_ALREADY_RESOLVED(
      HttpStatus.CONFLICT, "Khoản bù đã giải quyết, không ghi thêm hàng hoặc tiền"),
  WARRANTY_SUPPLIER_OWNERSHIP_UNVERIFIED(
      HttpStatus.CONFLICT, "Chưa đủ căn cứ sở hữu hoặc điều kiện nhập kho hàng bù."),
  WARRANTY_SUPPLIER_APPROVAL_FORBIDDEN(
      HttpStatus.FORBIDDEN, "Không có quyền quyết định phương án đối soát đơn vị bảo hành."),
  WARRANTY_SUPPLIER_SETTLEMENT_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không cập nhật được đối soát bảo hành; toàn bộ thay đổi đã được hủy."),
  WARRANTY_REPLACEMENT_ITEMS_CONFLICT(
      HttpStatus.CONFLICT, "Hàng đổi, nguồn cấp hoặc phương án không còn phù hợp với thao tác."),
  WARRANTY_REPLACEMENT_STOCK_UNAVAILABLE(
      HttpStatus.CONFLICT, "Hàng cửa hàng không còn khả dụng để giữ/cấp"),
  WARRANTY_REPLACEMENT_ITEMS_HANDED_OVER(
      HttpStatus.CONFLICT, "Hàng đã bàn giao, không được hoàn xuất thông thường"),
  WARRANTY_REPLACEMENT_ITEMS_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không cập nhật được hàng đổi bảo hành; toàn bộ thay đổi đã được hủy."),
  INVALID_WARRANTY_REPLACEMENT(
      HttpStatus.BAD_REQUEST,
      "Hành động, phiên bản, căn cứ, nguồn hoặc hạn bảo hành không hợp lệ."),
  WARRANTY_REPLACEMENT_NOT_APPROVED(
      HttpStatus.CONFLICT, "Khách đồng ý nhưng phương án chưa được duyệt"),
  WARRANTY_REPLACEMENT_ALREADY_HANDED_OVER(
      HttpStatus.CONFLICT, "Không thể hủy phương án đã bàn giao"),
  WARRANTY_REPLACEMENT_CONFLICT(
      HttpStatus.CONFLICT, "Phương án đổi đã thay đổi, đã kết thúc hoặc còn hàng cần xử lý."),
  WARRANTY_REPLACEMENT_POLICY_INVALID(
      HttpStatus.CONFLICT, "Chưa đủ căn cứ chính sách, kết luận hoặc hạn bảo hành để đổi."),
  WARRANTY_REPLACEMENT_QUOTE_NOT_APPROVED(
      HttpStatus.CONFLICT, "Khoản phí của phương án đổi chưa được khách chấp thuận hợp lệ."),
  WARRANTY_REPLACEMENT_APPROVAL_FORBIDDEN(
      HttpStatus.FORBIDDEN, "Không có quyền duyệt phương án đổi hoặc xác nhận hạn mới."),
  WARRANTY_REPLACEMENT_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR, "Không cập nhật được phương án đổi bảo hành."),
  INVALID_WARRANTY_MONEY(
      HttpStatus.BAD_REQUEST,
      "Loại giao dịch, số tiền, thời điểm hoặc chứng từ bảo hành không hợp lệ."),
  WARRANTY_MONEY_EXCEEDS_OUTSTANDING(HttpStatus.CONFLICT, "Khoản tiền vượt nghĩa vụ còn lại"),
  WARRANTY_MONEY_SOURCE_INVALID(
      HttpStatus.CONFLICT, "Căn cứ tiền bảo hành chưa được xác nhận hoặc không còn phù hợp."),
  WARRANTY_MONEY_REFERENCE_DUPLICATED(HttpStatus.CONFLICT, "Chứng từ tiền đã được ghi nhận."),
  WARRANTY_MONEY_CONFIGURATION(
      HttpStatus.INTERNAL_SERVER_ERROR, "Chưa cấu hình đúng loại thu chi bảo hành."),
  WARRANTY_MONEY_FAILED(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Không ghi nhận được giao dịch bảo hành. Cần đối soát tiền thực tế trước khi gửi lại."),
  INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống");

  private final HttpStatus status;
  private final String message;
}
