package com.example.dantruventu.Controller.dashboard;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.dashboard.AdminDashboardResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminDashboardService;
import com.example.dantruventu.Services.AdminRoleService;
import com.example.dantruventu.Services.dashboard.DashboardReadService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("@adminRoleService.hasModuleAction(principal, 'tong_quat', 'xem')")
public class AdminDashboardController {

  private final DashboardReadService reads;
  private final AdminDashboardService legacy;
  private final AdminRoleService adminRoleService;

  @GetMapping({
    "/summary",
    "/tasks",
    "/business-chart",
    "/top-products",
    "/inventory",
    "/customers",
    "/cashflow",
    "/after-sales",
    "/promotions"
  })
  public ApiResponse<Map<String, Object>> read(
      HttpServletRequest request,
      @RequestParam MultiValueMap<String, String> query,
      @AuthenticationPrincipal NguoiDung actor) {

    String path = request.getServletPath();

    String endpoint = path.substring(path.lastIndexOf('/') + 1);

    if (!canReadPanel(actor, endpoint)) {
      throw new AppException(ErrorCode.FORBIDDEN);
    }

    String message =
        switch (endpoint) {
          case "summary" -> "Lấy tổng quát thành công";
          case "tasks" -> "Lấy việc cần xử lý thành công";
          case "business-chart" -> "Lấy biểu đồ kinh doanh thành công";
          case "top-products" -> "Lấy sản phẩm bán chạy thành công";
          case "inventory" -> "Lấy tổng quát tồn kho thành công";
          case "customers" -> "Lấy tổng quát khách hàng thành công";
          case "cashflow" -> "Lấy tổng quát sổ quỹ thành công";
          case "after-sales" -> "Lấy tổng quát bảo hành và trả hàng thành công";
          case "promotions" -> "Lấy tổng quát khuyến mại thành công";
          default -> throw new AppException(ErrorCode.NOT_FOUND);
        };

    var data = reads.read(endpoint, parameters(query));

    if ("summary".equals(endpoint)) {
      if (!canView(actor, "so_quy")) {
        removeField(data, "kpi", "thuc_thu");
        removeField(data, "hien_tai", "so_du_quy");
      }
      if (!canView(actor, "bao_cao")) {
        removeField(data, "kinh_doanh", "gia_von_uoc_tinh");
        removeField(data, "kinh_doanh", "loi_nhuan_gop_uoc_tinh");
      }
      if (!adminRoleService.isSystemAdmin(actor)) {
        removeField(data, "hien_tai", "nhan_vien_dang_hoat_dong");
      }
    }

    return ok(message, data);
  }

  @GetMapping("/slow-moving-products")
  @PreAuthorize(
      "@adminRoleService.hasModuleAction(principal, 'tong_quat', 'xem')"
          + " and @adminRoleService.hasModuleAction(principal, 'kho_hang', 'xem')")
  public ApiResponse<AdminDashboardResponse.SlowMovingProducts> getSlowMovingProducts(
      @RequestParam(name = "so_ngay_khong_ban", defaultValue = "30") String days,
      @RequestParam(defaultValue = "5") String limit) {

    return ok("Lấy sản phẩm tồn lâu thành công", legacy.getSlowMovingProducts(days, limit));
  }

  @GetMapping("/purchases")
  @PreAuthorize(
      "@adminRoleService.hasModuleAction(principal, 'tong_quat', 'xem')"
          + " and @adminRoleService.hasModuleAction(principal, 'nhap_hang', 'xem')")
  public ApiResponse<AdminDashboardResponse.Purchases> getPurchases() {

    return ok("Lấy tổng quát nhập hàng thành công", legacy.getPurchases());
  }

  @GetMapping("/export")
  @PreAuthorize("@adminRoleService.isSystemAdmin(principal)")
  public ResponseEntity<byte[]> export(@RequestParam MultiValueMap<String, String> query) {

    var result = reads.export(parameters(query));

    return ResponseEntity.ok()
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment()
                .filename(result.filename(), StandardCharsets.UTF_8)
                .build()
                .toString())
        .contentLength(result.content().length)
        .body(result.content());
  }

  private boolean canView(NguoiDung actor, String module) {
    return adminRoleService.hasModuleAction(actor, module, "xem");
  }

  private boolean canReadPanel(NguoiDung actor, String endpoint) {
    return switch (endpoint) {
      case "summary" -> true;
      case "business-chart", "top-products" -> canView(actor, "bao_cao");
      case "tasks" ->
          canView(actor, "don_hang")
              && canView(actor, "giao_hang")
              && canView(actor, "khach_tra_hang")
              && canView(actor, "bao_hanh");
      case "inventory" -> canView(actor, "kho_hang");
      case "customers" -> canView(actor, "khach_hang");
      case "cashflow" -> canView(actor, "so_quy");
      case "after-sales" -> canView(actor, "bao_hanh") && canView(actor, "khach_tra_hang");
      case "promotions" -> canView(actor, "khuyen_mai");
      default -> false;
    };
  }

  private void removeField(Map<String, Object> data, String section, String field) {
    if (data.get(section) instanceof Map<?, ?> values) {
      values.remove(field);
    }
  }

  private Map<String, String> parameters(MultiValueMap<String, String> query) {

    Map<String, String> result = new LinkedHashMap<>();

    query.forEach(
        (key, values) -> {
          if (values == null || values.size() != 1) {
            throw new AppException(
                ErrorCode.INVALID_DATA,
                key,
                "DUPLICATE_QUERY_PARAMETER",
                "Mỗi tham số chỉ được xuất hiện một lần");
          }

          result.put(key, values.get(0));
        });

    return result;
  }

  private <T> ApiResponse<T> ok(String message, T data) {

    return ApiResponse.<T>builder().status(200).message(message).data(data).build();
  }
}
