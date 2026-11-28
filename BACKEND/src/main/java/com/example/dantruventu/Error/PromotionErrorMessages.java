package com.example.dantruventu.Error;

import java.util.Locale;
import java.util.regex.Pattern;
import tools.jackson.core.JacksonException;

/** User-facing wording for UC028. Never echo submitted field names or values in messages. */
public final class PromotionErrorMessages {
  public static final String INVALID_CONTENT =
      "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại và thử lại.";
  public static final String UNSUPPORTED_CONTENT =
      "Có thông tin khuyến mại không được hỗ trợ. Vui lòng kiểm tra lại và thử lại.";
  public static final String REQUEST_CONFIRMATION =
      "Không thể xác nhận yêu cầu. Vui lòng tải lại trang và thử lại.";

  private static final Pattern TECHNICAL =
      Pattern.compile(
          "[a-zA-Z][a-zA-Z0-9]*_[a-zA-Z0-9_]+|\\b(?:UUID|JSON|Idempotency-Key|header|page|limit|API|KM0[1-8])\\b|kiểu"
              + " dữ liệu",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern VIETNAMESE = Pattern.compile("[À-ỹĐđ]");

  private PromotionErrorMessages() {}

  public static String invalidField(String field) {
    return switch (normalize(field)) {
      case "trangthaiapdung", "trangthaihienthi" ->
          "Trạng thái lọc không hợp lệ. Vui lòng chọn lại.";
      case "trangthai" -> "Trạng thái khuyến mại không hợp lệ. Vui lòng chọn bật hoặc tạm dừng.";
      case "phuongthuckhuyenmai" ->
          "Hình thức khuyến mại không hợp lệ. Vui lòng chọn giảm giá hoặc tặng quà.";
      case "doituongkhuyenmai" -> "Phạm vi áp dụng khuyến mại không hợp lệ. Vui lòng chọn lại.";
      case "loaichietkhau" ->
          "Cách giảm giá không hợp lệ. Vui lòng chọn giảm theo phần trăm hoặc số tiền.";
      case "loaiapdung" ->
          "Vai trò của sản phẩm không hợp lệ. Vui lòng chọn sản phẩm mua hoặc quà tặng.";
      case "id", "khuyenmaiid" -> "Khuyến mại được chọn không hợp lệ. Vui lòng chọn lại.";
      case "danhmucid" -> "Danh mục được chọn không hợp lệ. Vui lòng chọn lại.";
      case "thuonghieuid" -> "Thương hiệu được chọn không hợp lệ. Vui lòng chọn lại.";
      case "phienbanid" -> "Sản phẩm được chọn không hợp lệ. Vui lòng chọn lại.";
      case "page" -> "Số trang không hợp lệ. Vui lòng chọn lại trang cần xem.";
      case "limit" -> "Số kết quả mỗi trang phải từ 1 đến 100. Vui lòng chọn lại.";
      case "tungay" -> "Ngày bắt đầu lọc không hợp lệ. Vui lòng chọn lại ngày.";
      case "denngay" -> "Ngày kết thúc lọc không hợp lệ. Vui lòng chọn lại ngày.";
      case "ngaybatdau" -> "Ngày bắt đầu khuyến mại không hợp lệ. Vui lòng chọn lại ngày.";
      case "ngayketthuc" -> "Ngày kết thúc khuyến mại không hợp lệ. Vui lòng chọn lại ngày.";
      case "soluongapdung" -> "Số lượt áp dụng không hợp lệ. Vui lòng nhập số nguyên lớn hơn 0.";
      case "soluongmuatoithieu" ->
          "Số lượng mua tối thiểu không hợp lệ. Vui lòng nhập số nguyên từ 0 trở lên.";
      case "soluong" -> "Số lượng sản phẩm không hợp lệ. Vui lòng nhập số nguyên lớn hơn 0.";
      case "phienbancauhinhxacnhan", "confirmedversion" ->
          "Thông tin xác nhận đã thay đổi hoặc không hợp lệ. Vui lòng tải lại chương trình.";
      case "giatrikhuyenmai" ->
          "Mức giảm giá không hợp lệ. Vui lòng nhập số tiền hoặc tỷ lệ giảm phù hợp.";
      case "giatrihangtoithieu" ->
          "Giá trị đơn hàng tối thiểu không hợp lệ. Vui lòng nhập số tiền từ 0 trở lên.";
      case "mucgiamtoida" -> "Mức giảm tối đa không hợp lệ. Vui lòng nhập số tiền lớn hơn 0.";
      case "machuongtrinh" -> "Mã chương trình không hợp lệ. Vui lòng kiểm tra lại.";
      case "tenchuongtrinh" -> "Tên chương trình không hợp lệ. Vui lòng kiểm tra lại.";
      case "chitietkhuyenmai" ->
          "Danh sách sản phẩm khuyến mại không hợp lệ. Vui lòng kiểm tra lại.";
      case "mota" -> "Mô tả khuyến mại không hợp lệ. Vui lòng kiểm tra lại.";
      case "keyword" -> "Từ khóa tìm kiếm không hợp lệ. Vui lòng nhập lại.";
      case "khohangid" -> "Kho hàng được chọn không hợp lệ. Vui lòng chọn lại.";
      default -> INVALID_CONTENT;
    };
  }

  public static String validation(String field, String defaultMessage) {
    // Explicit Vietnamese bean-validation messages already describe the user's input.
    // The fallback replaces default English container-element messages as well.
    if (defaultMessage != null
        && VIETNAMESE.matcher(defaultMessage).find()
        && !TECHNICAL.matcher(defaultMessage).find()) {
      return defaultMessage;
    }
    return invalidField(field);
  }

  public static String unreadable(Throwable exception) {
    String field = null;
    for (Throwable current = exception; current != null; current = current.getCause()) {
      if (current instanceof JacksonException jackson) {
        for (var reference : jackson.getPath()) {
          if (reference.getPropertyName() != null) {
            field = reference.getPropertyName();
          }
        }
      }
      String message = current.getMessage();
      if (UNSUPPORTED_CONTENT.equals(message)
          || (message != null && message.startsWith("Trường không được hỗ trợ:"))) {
        return UNSUPPORTED_CONTENT;
      }
      if (current.getCause() == current) break;
    }
    return invalidField(field);
  }

  public static String application(String message) {
    if (message == null || message.isBlank()) return INVALID_CONTENT;
    if (message.contains("UUID") || message.contains("Idempotency-Key")) {
      return message.contains("yêu cầu khác")
          ? "Yêu cầu này đã được dùng cho nội dung khác. Vui lòng tải lại trang và thử lại."
          : REQUEST_CONFIRMATION;
    }
    if (message.startsWith("ID khuyến mại")) return invalidField("id");
    if (message.startsWith("ID danh mục")) return invalidField("danh_muc_id");
    if (message.startsWith("ID thương hiệu")) return invalidField("thuong_hieu_id");
    if (TECHNICAL.matcher(message).find() || !VIETNAMESE.matcher(message).find()) {
      return INVALID_CONTENT;
    }
    return message;
  }

  private static String normalize(String field) {
    if (field == null) return "";
    String leaf = field.substring(field.lastIndexOf('.') + 1);
    return leaf.replaceAll("\\[.*?]", "").replace("_", "").toLowerCase(Locale.ROOT);
  }
}
