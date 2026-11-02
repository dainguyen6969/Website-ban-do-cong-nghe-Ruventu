package com.example.dantruventu.Error;

import java.util.List;
import lombok.Getter;

@Getter
public class WarrantyReadException extends AppException {
  private final List<FieldError> errors;
  private final Object data;

  private WarrantyReadException(ErrorCode error, List<FieldError> errors) {
    this(error, errors, null);
  }

  private WarrantyReadException(ErrorCode error, List<FieldError> errors, Object data) {
    super(error);
    this.errors = errors;
    this.data = data;
  }

  public static WarrantyReadException notFound(ErrorCode error, String field, String code) {
    return of(error, field, code);
  }

  public static WarrantyReadException of(ErrorCode error, String field, String code) {
    return new WarrantyReadException(
        error, List.of(new FieldError(field, code, error.getMessage())));
  }

  public record FieldError(String field, String code, String message) {}

  public static WarrantyReadException withData(
      ErrorCode error, String field, String code, Object data) {
    return new WarrantyReadException(
        error, List.of(new FieldError(field, code, error.getMessage())), data);
  }
}
