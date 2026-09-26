package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SetDefaultAddressResponse {

  @JsonProperty("id")
  private Long id;

  @JsonProperty("la_mac_dinh")
  private Boolean laMacDinh;
}
