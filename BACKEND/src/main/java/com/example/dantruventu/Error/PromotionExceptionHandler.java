package com.example.dantruventu.Error;

import com.example.dantruventu.Controller.promotion.AdminPromotionController;
import com.example.dantruventu.Controller.promotion.AdminPromotionOrdersController;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Keep the shared error contract, with user-facing messages scoped to UC028 controllers. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(
    assignableTypes = {AdminPromotionController.class, AdminPromotionOrdersController.class})
public class PromotionExceptionHandler extends GlobalExceptionHandler {

  @Override
  public ResponseEntity<?> handleAppException(AppException exception) {
    return super.handleAppException(
        new AppException(
            exception.getErrorCode(),
            exception.getField(),
            exception.getCode(),
            PromotionErrorMessages.application(exception.getMessage())));
  }

  @Override
  public ResponseEntity<?> handleCatalogException(CatalogException exception) {
    return handleAppException(exception);
  }

  @Override
  public ResponseEntity<ErrorResponse> handleMissingHeader(
      MissingRequestHeaderException exception) {
    return badRequest(PromotionErrorMessages.REQUEST_CONFIRMATION);
  }

  @Override
  public ResponseEntity<?> handleValidationException(MethodArgumentNotValidException exception) {
    var errors =
        exception.getBindingResult().getFieldErrors().stream()
            .map(
                error ->
                    Map.of(
                        "field", error.getField(),
                        "code", error.getCode() == null ? "INVALID_DATA" : error.getCode(),
                        "message",
                            PromotionErrorMessages.validation(
                                error.getField(), error.getDefaultMessage())))
            .toList();
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", 400);
    body.put(
        "message",
        errors.isEmpty()
            ? PromotionErrorMessages.INVALID_CONTENT
            : errors.getFirst().get("message"));
    body.put("data", null);
    body.put("errors", errors);
    return ResponseEntity.badRequest().body(body);
  }

  @Override
  public ResponseEntity<?> handleInvalidRequest(Exception exception) {
    for (Throwable current = exception; current != null; current = current.getCause()) {
      if (current instanceof AppException app) return handleAppException(app);
      if (current.getCause() == current) break;
    }
    if (exception instanceof MethodArgumentTypeMismatchException mismatch) {
      return badRequest(PromotionErrorMessages.invalidField(mismatch.getName()));
    }
    return badRequest(PromotionErrorMessages.unreadable(exception));
  }

  @Override
  public ResponseEntity<ErrorResponse> handleMissingParameter(
      MissingServletRequestParameterException exception) {
    return badRequest(PromotionErrorMessages.invalidField(exception.getParameterName()));
  }

  @Override
  public ResponseEntity<?> handleDataIntegrityException(DataIntegrityViolationException exception) {
    return ResponseEntity.status(409)
        .body(
            new ErrorResponse(
                409,
                "Chưa thể lưu khuyến mại vì thông tin bị trùng hoặc không còn phù hợp. Vui lòng tải"
                    + " lại và kiểm tra."));
  }

  @Override
  public ResponseEntity<ErrorResponse> handleConcurrentSale(
      PessimisticLockingFailureException exception) {
    return ResponseEntity.status(409)
        .body(
            new ErrorResponse(
                409, "Khuyến mại đang được cập nhật. Vui lòng tải lại và thử lại sau."));
  }

  private ResponseEntity<ErrorResponse> badRequest(String message) {
    return ResponseEntity.badRequest().body(new ErrorResponse(400, message));
  }
}
