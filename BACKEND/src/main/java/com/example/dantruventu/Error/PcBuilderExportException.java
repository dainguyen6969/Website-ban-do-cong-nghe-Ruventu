package com.example.dantruventu.Error;

import java.util.List;
import lombok.Getter;

@Getter
public class PcBuilderExportException extends AppException {
  private final List<FieldError> errors;

  public PcBuilderExportException(ErrorCode error, String field, String code, String detail) {
    super(error);
    errors = List.of(new FieldError(field, code, detail));
  }

  public record FieldError(String field, String code, String message) {}

  @Getter
  public static class Response extends ErrorResponse {
    private final List<FieldError> errors;

    public Response(PcBuilderExportException exception) {
      super(exception.getErrorCode().getStatus().value(), exception.getMessage());
      errors = exception.getErrors();
    }
  }
}
