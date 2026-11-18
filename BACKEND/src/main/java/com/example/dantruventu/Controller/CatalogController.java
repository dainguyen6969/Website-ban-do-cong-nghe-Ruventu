package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.CatalogOptionsResponse;
import com.example.dantruventu.Services.CatalogOptionsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog")
@RequiredArgsConstructor
public class CatalogController {
  private final CatalogOptionsService service;

  @GetMapping("/options")
  public ApiResponse<CatalogOptionsResponse> getOptions() {
    return ApiResponse.<CatalogOptionsResponse>builder()
        .status(200)
        .message("Lấy danh mục và thương hiệu thành công")
        .data(service.getOptions())
        .build();
  }
}
