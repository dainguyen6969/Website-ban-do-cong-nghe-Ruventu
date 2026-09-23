package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaginationResponse {

  private int page;

  private int limit;

  @JsonProperty("total_elements")
  private long totalElements;

  @JsonProperty("total_pages")
  private int totalPages;
}
