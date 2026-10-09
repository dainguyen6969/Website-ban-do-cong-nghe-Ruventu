package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.PcBuilderOptionsResponse;
import com.example.dantruventu.DTO.Response.PcBuilderPreviewResponse;
import com.example.dantruventu.DTO.Response.PcBuilderProductsResponse;
import com.example.dantruventu.Services.PcBuilderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pc-builder")
@RequiredArgsConstructor
public class PcBuilderController {
  private final PcBuilderService service;

  @PostMapping("/preview")
  public ApiResponse<PcBuilderPreviewResponse> preview(
      @RequestBody(required = false) PcBuilderPreviewRequest request) {
    return ApiResponse.<PcBuilderPreviewResponse>builder()
        .status(200)
        .message("Kiểm tra cấu hình thành công")
        .data(service.preview(request))
        .build();
  }

  @GetMapping("/products")
  public ApiResponse<PcBuilderProductsResponse> getProducts(
      @RequestParam(name = "ma_hang_muc", required = false) String maHangMuc,
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "thuong_hieu_id", required = false) String thuongHieuId,
      @RequestParam(name = "gia_tu", required = false) String giaTu,
      @RequestParam(name = "gia_den", required = false) String giaDen,
      @RequestParam(name = "tinh_trang_hang", required = false) String tinhTrangHang,
      @RequestParam(name = "sap_xep", required = false) String sapXep,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit,
      @RequestParam(name = "phien_ban_doi_chieu_id", required = false) String phienBanDoiChieuId,
      @RequestParam(name = "chi_khop_socket", required = false) String chiKhopSocket) {
    return ApiResponse.<PcBuilderProductsResponse>builder()
        .status(200)
        .message("Lấy danh sách linh kiện thành công")
        .data(
            service.getProducts(
                maHangMuc,
                keyword,
                thuongHieuId,
                giaTu,
                giaDen,
                tinhTrangHang,
                sapXep,
                page,
                limit,
                phienBanDoiChieuId,
                chiKhopSocket))
        .build();
  }

  @GetMapping("/options")
  public ApiResponse<PcBuilderOptionsResponse> getOptions() {
    return ApiResponse.<PcBuilderOptionsResponse>builder()
        .status(200)
        .message("Lấy tùy chọn Build PC thành công")
        .data(service.getOptions())
        .build();
  }
}
