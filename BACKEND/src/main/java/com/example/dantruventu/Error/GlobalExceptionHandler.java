package com.example.dantruventu.Error;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AppException.class)
  public ResponseEntity<ErrorResponse> handleAppException(AppException exception) {

    ErrorCode errorCode = exception.getErrorCode();

    ErrorResponse response =
        new ErrorResponse(errorCode.getStatus().value(), exception.getMessage());

    return ResponseEntity.status(errorCode.getStatus()).body(response);
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
  public ResponseEntity<ErrorResponse> handleInvalidRequest(Exception exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.INVALID_DATA.getStatus().value(), ErrorCode.INVALID_DATA.getMessage());

    return ResponseEntity.status(ErrorCode.INVALID_DATA.getStatus()).body(response);
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
  public ResponseEntity<ErrorResponse> handleDataIntegrityException(
      DataIntegrityViolationException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.CONFLICT.getStatus().value(), "Dữ liệu đã tồn tại hoặc vi phạm ràng buộc");

    return ResponseEntity.status(ErrorCode.CONFLICT.getStatus()).body(response);
  }

  @ExceptionHandler(PessimisticLockingFailureException.class)
  public ResponseEntity<ErrorResponse> handleConcurrentSale(
      PessimisticLockingFailureException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.CONFLICT.getStatus().value(),
            "Dữ liệu đang được xử lý đồng thời. " + "Vui lòng gửi lại cùng Idempotency-Key");

    return ResponseEntity.status(ErrorCode.CONFLICT.getStatus()).body(response);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.FORBIDDEN.getStatus().value(), ErrorCode.FORBIDDEN.getMessage());

    return ResponseEntity.status(ErrorCode.FORBIDDEN.getStatus()).body(response);
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
}
