package com.example.dantruventu.DTO.Response.customer;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {

  private Long id;

  @JsonProperty("ho_ten")
  private String hoTen;

  private String email;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  @JsonProperty("trang_thai")
  private Integer trangThai;

  @JsonProperty("ngay_tao")
  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
  private OffsetDateTime ngayTao;

  @JsonProperty("ngay_cap_nhat")
  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
  private OffsetDateTime ngayCapNhat;

  @JsonProperty("dia_chi_mac_dinh")
  private CustomerDefaultAddressResponse diaChiMacDinh;
}
