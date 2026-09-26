package com.example.dantruventu.DTO.Response.employee;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeRoleResponse {

  private Long id;

  @JsonProperty("ten_vai_tro")
  private String tenVaiTro;
}
