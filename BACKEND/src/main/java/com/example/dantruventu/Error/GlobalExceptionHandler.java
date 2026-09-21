package com.example.dantruventu.Error;

import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ErrorResponse> handleMethodNotAllowed(
      HttpRequestMethodNotSupportedException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.METHOD_NOT_ALLOWED.getStatus().value(),
            ErrorCode.METHOD_NOT_ALLOWED.getMessage());

    return ResponseEntity.status(ErrorCode.METHOD_NOT_ALLOWED.getStatus()).body(response);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleException(Exception exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.INTERNAL_SERVER_ERROR.getStatus().value(),
            ErrorCode.INTERNAL_SERVER_ERROR.getMessage());

    return ResponseEntity.status(ErrorCode.INTERNAL_SERVER_ERROR.getStatus()).body(response);
  }

  @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
  public ResponseEntity<ErrorResponse> handleDataIntegrityException(
      org.springframework.dao.DataIntegrityViolationException exception) {

    ErrorResponse response =
        new ErrorResponse(
            ErrorCode.CONFLICT.getStatus().value(), "Dữ liệu đã tồn tại hoặc vi phạm ràng buộc");

    return ResponseEntity.status(ErrorCode.CONFLICT.getStatus()).body(response);
  }

  @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDenied(
      org.springframework.security.access.AccessDeniedException exception) {

    return ResponseEntity.status(403)
        .body(new ErrorResponse(403, "Bạn không có quyền thực hiện thao tác này"));
  }

  @ExceptionHandler({
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
  })
  public ResponseEntity<ErrorResponse> handleInvalidRequest(Exception exception) {

    return ResponseEntity.badRequest()
        .body(new ErrorResponse(400, "Dữ liệu không hợp lệ hoặc sai kiểu dữ liệu"));
  }
}
