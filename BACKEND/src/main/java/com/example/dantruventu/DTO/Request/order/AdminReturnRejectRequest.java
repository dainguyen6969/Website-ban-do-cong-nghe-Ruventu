package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminReturnRejectRequest {

  @NotBlank(message = "Vui lòng nhập lý do từ chối")
  @JsonProperty("ly_do")
  private String lyDo;

  @NotBlank(message = "Vui lòng nhập căn cứ từ chối")
  @JsonProperty("can_cu")
  private String canCu;

  @JsonProperty("bang_chung_urls")
  private List<@NotBlank(message = "Đường dẫn bằng chứng không được để trống") String>
      bangChungUrls = List.of();

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
