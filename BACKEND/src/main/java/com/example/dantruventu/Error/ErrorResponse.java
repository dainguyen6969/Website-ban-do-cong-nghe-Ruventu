package com.example.dantruventu.Error;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ErrorResponse {

  private int status;
  private String message;

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public Object getData() {
    return null;
  }
}
