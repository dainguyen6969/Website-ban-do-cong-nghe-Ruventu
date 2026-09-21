package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class LoginResponse {

  @JsonProperty("status")
  private int status;

  @JsonProperty("message")
  private String message;

  @JsonProperty("data")
  private LoginData data;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class LoginData {

    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("user")
    private UserData user;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class UserData {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("ho_ten")
    private String hoTen;

    @JsonProperty("anh_dai_dien")
    private String anhDaiDien;

    @JsonProperty("vai_tro_id")
    private Long vaiTroId;
  }
}
