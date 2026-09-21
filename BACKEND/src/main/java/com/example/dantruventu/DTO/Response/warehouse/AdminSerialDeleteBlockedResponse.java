package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class AdminSerialDeleteBlockedResponse {

  private int status;

  private String message;

  private Object data;
}
