package com.example.dantruventu.Controller.printing;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = AdminDocumentPrintController.class)
public class AdminPrintExceptionHandler {
  @ExceptionHandler(AppException.class)
  public ResponseEntity<ErrorResponse> business(AppException exception) {
    return response(exception.getErrorCode(), exception.getMessage());
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> denied(AccessDeniedException exception) {
    return response(ErrorCode.FORBIDDEN, ErrorCode.FORBIDDEN.getMessage());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> failed(Exception exception) {
    log.error("Không xử lý được yêu cầu in PDF", exception);
    return response(ErrorCode.PRINT_PDF_FAILED, ErrorCode.PRINT_PDF_FAILED.getMessage());
  }

  private ResponseEntity<ErrorResponse> response(ErrorCode code, String message) {
    return ResponseEntity.status(code.getStatus())
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .body(new ErrorResponse(code.getStatus().value(), message));
  }
}
