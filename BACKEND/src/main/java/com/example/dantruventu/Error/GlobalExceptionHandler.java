package com.example.dantruventu.Error;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AppException.class)
  public ResponseEntity<?> handleAppException(AppException exception) {
    ErrorCode errorCode = exception.getErrorCode();

    // Nhánh bảo hành trả response riêng.
    if (exception instanceof WarrantyReadException warrantyException) {
      WarrantyErrorResponse response =
          new WarrantyErrorResponse(
              errorCode.getStatus().value(), exception.getMessage(), warrantyException.getErrors());

      return ResponseEntity.status(errorCode.getStatus()).body(response);
    }

    // Các lỗi nghiệp vụ khác sử dụng Map.
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("status", errorCode.getStatus().value());
    response.put("message", exception.getMessage());
    response.put("data", null);

    if (exception.getCode() != null) {
      Map<String, Object> detail = new LinkedHashMap<>();
      detail.put("field", exception.getField());
      detail.put("code", exception.getCode());
      detail.put("message", exception.getMessage());

      response.put("errors", List.of(detail));
    }

    return ResponseEntity.status(errorCode.getStatus()).body(response);
  }

  @ExceptionHandler(MissingRequestHeaderException.class)
  public ResponseEntity<ErrorResponse> handleMissingHeader(
      MissingRequestHeaderException exception) {

    return ResponseEntity.badRequest()
        .body(new ErrorResponse(400, "Thiếu header: " + exception.getHeaderName()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidationException(
      MethodArgumentNotValidException exception) {

    String message =
        exception.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(error -> error.getDefaultMessage())
            .orElse(ErrorCode.INVALID_DATA.getMessage());

    ErrorResponse response = new ErrorResponse(ErrorCode.INVALID_DATA.getStatus().value(), message);

    return ResponseEntity.status(ErrorCode.INVALID_DATA.getStatus()).body(response);
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class
  })
  public ResponseEntity<?> handleInvalidRequest(Exception exception) {

    // Giữ thông báo nghiệp vụ nếu lỗi bị Jackson bọc lại.
    Throwable current = exception;

    for (int depth = 0; current != null && depth < 32; depth++) {
      if (current instanceof AppException appException) {
        return handleAppException(appException);
      }

      current = current.getCause();
    }

    if (exception instanceof MethodArgumentTypeMismatchException mismatch) {
      return ResponseEntity.badRequest()
          .body(new ErrorResponse(400, "Tham số không đúng kiểu dữ liệu: " + mismatch.getName()));
    }

    if (exception instanceof HttpMessageNotReadableException unreadable) {
      Throwable root = unreadable.getMostSpecificCause();

      log.warn("REQUEST_BODY_INVALID: {}", unreadable.getMessage());

      log.warn("REQUEST_BODY_ROOT [{}]: {}", root.getClass().getName(), root.getMessage());

      String message = "Body JSON không hợp lệ. Kiểm tra tên trường và kiểu dữ liệu.";

      // Hỗ trợ thông báo từ rejectUnknownField phiên bản cũ.
      if (root instanceof IllegalArgumentException
          && root.getMessage() != null
          && root.getMessage().startsWith("Trường không được hỗ trợ:")) {
        message = root.getMessage();
      }

      return ResponseEntity.badRequest().body(new ErrorResponse(400, message));
    }

    return ResponseEntity.badRequest().body(new ErrorResponse(400, "Dữ liệu không hợp lệ"));
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ErrorResponse> handleMissingParameter(
      MissingServletRequestParameterException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.INVALID_DATA.getStatus().value(),
            "Thiếu tham số: " + exception.getParameterName());

    return ResponseEntity.status(ErrorCode.INVALID_DATA.getStatus()).body(response);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ErrorResponse> handleMethodNotAllowed(
      HttpRequestMethodNotSupportedException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.METHOD_NOT_ALLOWED.getStatus().value(),
            ErrorCode.METHOD_NOT_ALLOWED.getMessage());

    return ResponseEntity.status(ErrorCode.METHOD_NOT_ALLOWED.getStatus()).body(response);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<?> handleDataIntegrityException(DataIntegrityViolationException exception) {

    Throwable rootCause = exception.getMostSpecificCause();
    log.error("Data integrity violation root cause: {}", rootCause.getMessage(), exception);

    String rootMsg = rootCause.getMessage();
    if (rootMsg != null) {
      String lowerMsg = rootMsg.toLowerCase();

      if (lowerMsg.contains("ma_vach")) {
        return handleCatalogException(
            CatalogException.conflict("ma_vach", "BARCODE_DUPLICATE", "Mã vạch đã được sử dụng"));
      }

      if (lowerMsg.contains("so_dien_thoai")
          || lowerMsg.contains("sodienthoai")
          || lowerMsg.contains("email")
          || lowerMsg.contains("phone")) {
        ErrorResponse response =
            new ErrorResponse(
                ErrorCode.PHONE_OR_EMAIL_ALREADY_EXISTS.getStatus().value(),
                ErrorCode.PHONE_OR_EMAIL_ALREADY_EXISTS.getMessage());
        return ResponseEntity.status(ErrorCode.PHONE_OR_EMAIL_ALREADY_EXISTS.getStatus())
            .body(response);
      }
    }

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.CONFLICT.getStatus().value(), "Dữ liệu đã tồn tại hoặc vi phạm ràng buộc");

    return ResponseEntity.status(ErrorCode.CONFLICT.getStatus()).body(response);
  }

  @ExceptionHandler(PessimisticLockingFailureException.class)
  public ResponseEntity<ErrorResponse> handleConcurrentSale(
      PessimisticLockingFailureException exception) {

    return ResponseEntity.status(409)
        .body(
            new ErrorResponse(
                409,
                "Dữ liệu đang được xử lý đồng thời. Vui lòng tải lại trạng thái; "
                    + "với yêu cầu tạo đơn/POS, giữ nguyên Idempotency-Key khi gửi lại."));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.FORBIDDEN.getStatus().value(), ErrorCode.FORBIDDEN.getMessage());

    return ResponseEntity.status(ErrorCode.FORBIDDEN.getStatus()).body(response);
  }

  @ExceptionHandler(RedisConnectionFailureException.class)
  public ResponseEntity<ErrorResponse> handleRedisUnavailable(
      RedisConnectionFailureException exception) {

    log.warn("Redis không khả dụng; request phụ thuộc Redis chưa thể xử lý");
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(new ErrorResponse(503, "Dịch vụ tạm thời không khả dụng, vui lòng thử lại."));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleException(Exception exception) {

    log.error("Đã xảy ra lỗi hệ thống chưa được xử lý", exception);

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.INTERNAL_SERVER_ERROR.getStatus().value(),
            ErrorCode.INTERNAL_SERVER_ERROR.getMessage());

    return ResponseEntity.status(ErrorCode.INTERNAL_SERVER_ERROR.getStatus()).body(response);
  }

  @ExceptionHandler(CatalogException.class)
  public ResponseEntity<?> handleCatalogException(CatalogException exception) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", exception.getErrorCode().getStatus().value());
    body.put("message", exception.getMessage());
    body.put("data", null);
    body.put(
        "errors",
        List.of(
            Map.of(
                "field", exception.getField(),
                "code", exception.getCode(),
                "message", exception.getMessage())));

    return ResponseEntity.status(exception.getErrorCode().getStatus()).body(body);
  }

  private CatalogException findCatalogException(Throwable throwable) {
    for (Throwable current = throwable; current != null; current = current.getCause()) {
      if (current instanceof CatalogException catalogException) {
        return catalogException;
      }
      if (current.getCause() == current) break;
    }
    return null;
  }
}
