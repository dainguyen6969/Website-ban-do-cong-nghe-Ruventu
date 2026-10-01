package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.customer.CreateCustomerRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.customer.CustomerListResponse;
import com.example.dantruventu.DTO.Response.customer.CustomerResponse;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Services.CustomerService;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/customers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CustomerController {

  private final CustomerService customerService;
  private final NguoiDungRepository nguoiDungRepository;
  private final DonHangRepository donHangRepository;
  private final PhieuGiaoHangRepository phieuGiaoHangRepository;

  @GetMapping
  public ApiResponse<CustomerListResponse> getCustomers(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) Integer trangThai,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {

    return ApiResponse.<CustomerListResponse>builder()
        .status(200)
        .message("Lấy danh sách khách hàng thành công")
        .data(customerService.getCustomers(keyword, trangThai, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<CustomerResponse> getCustomerDetail(@PathVariable Long id) {

    return ApiResponse.<CustomerResponse>builder()
        .status(200)
        .message("Lấy chi tiết khách hàng thành công")
        .data(customerService.getCustomerDetail(id))
        .build();
  }

  @GetMapping("/{id}/orders")
  public ApiResponse<Object> getCustomerOrders(
      @PathVariable Long id,
      @RequestParam(required = false) String keyword,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {

    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_ID, "ID không hợp lệ.");
    }

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(
          ErrorCode.INVALID_CUSTOMER_SEARCH_PARAM, "Trạng thái hoặc phân trang không hợp lệ.");
    }

    NguoiDung customer =
        nguoiDungRepository
            .findByIdWithVaiTro(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.CUSTOMER_NOT_FOUND_OR_EMPLOYEE,
                        "Khách hàng không tồn tại hoặc ID thuộc nhân viên."));

    if (!isCustomerRole(customer.getVaiTro())) {
      throw new AppException(
          ErrorCode.CUSTOMER_NOT_FOUND_OR_EMPLOYEE,
          "Khách hàng không tồn tại hoặc ID thuộc nhân viên.");
    }

    Specification<DonHang> spec =
        (root, query, cb) -> {
          List<Predicate> predicates = new ArrayList<>();
          predicates.add(cb.equal(root.get("khachHang").get("id"), id));

          if (keyword != null && !keyword.trim().isEmpty()) {
            String escaped =
                keyword
                    .trim()
                    .toLowerCase(Locale.ROOT)
                    .replace("!", "!!")
                    .replace("%", "!%")
                    .replace("_", "!_");
            String pattern = "%" + escaped + "%";
            predicates.add(cb.like(cb.lower(root.get("maDonHang")), pattern, '!'));
          }

          return cb.and(predicates.toArray(Predicate[]::new));
        };

    Pageable pageable =
        PageRequest.of(page, limit, Sort.by(Sort.Order.desc("ngayTao"), Sort.Order.desc("id")));

    Page<DonHang> orderPage = donHangRepository.findAll(spec, pageable);

    List<DonHang> orders = orderPage.getContent();
    List<Long> orderIds = orders.stream().map(DonHang::getId).toList();

    Map<Long, List<PhieuGiaoHang>> slipsMap = new HashMap<>();
    if (!orderIds.isEmpty()) {
      List<PhieuGiaoHang> slips = phieuGiaoHangRepository.findByDonHang_IdInOrderByIdAsc(orderIds);
      slipsMap = slips.stream().collect(Collectors.groupingBy(p -> p.getDonHang().getId()));
    }

    List<Map<String, Object>> items = new ArrayList<>();
    ZoneOffset vietnamOffset = ZoneOffset.ofHours(7);

    for (DonHang order : orders) {
      List<PhieuGiaoHang> orderSlips = slipsMap.getOrDefault(order.getId(), Collections.emptyList());

      List<Map<String, Object>> slipList =
          orderSlips.stream()
              .map(
                  slip -> {
                    Map<String, Object> slipMap = new LinkedHashMap<>();
                    slipMap.put("id", slip.getId());
                    slipMap.put("ma_phieu_giao_hang", slip.getMaPhieuGiaoHang());
                    slipMap.put("ma_van_don", slip.getMaVanDon());
                    slipMap.put(
                        "trang_thai_giao_hang",
                        slip.getTrangThaiGiaoHang() != null
                            ? slip.getTrangThaiGiaoHang().name()
                            : null);
                    slipMap.put(
                        "tien_thu_ho_cod",
                        slip.getTienThuHoCod() != null ? slip.getTienThuHoCod().longValue() : 0L);
                    slipMap.put(
                        "phi_tra_doi_tac",
                        slip.getPhiTraDoiTac() != null ? slip.getPhiTraDoiTac().longValue() : 0L);
                    slipMap.put(
                        "ngay_tao",
                        slip.getNgayTao() != null
                            ? slip.getNgayTao().atOffset(vietnamOffset).toString()
                            : null);
                    return slipMap;
                  })
              .toList();

      Map<String, Object> orderMap = new LinkedHashMap<>();
      orderMap.put("id", order.getId());
      orderMap.put("ma_don_hang", order.getMaDonHang());
      orderMap.put(
          "loai_don_hang",
          order.getLoaiDonHang() != null ? order.getLoaiDonHang().name() : null);
      orderMap.put(
          "trang_thai_don_hang",
          order.getTrangThaiDonHang() != null ? order.getTrangThaiDonHang().name() : null);
      orderMap.put(
          "trang_thai_thanh_toan",
          order.getTrangThaiThanhToan() != null ? order.getTrangThaiThanhToan().name() : null);
      orderMap.put(
          "tong_thanh_toan",
          order.getTongThanhToan() != null ? order.getTongThanhToan().longValue() : 0L);
      orderMap.put(
          "ngay_tao",
          order.getNgayTao() != null
              ? order.getNgayTao().atOffset(vietnamOffset).toString()
              : null);
      orderMap.put("phieu_giao_hang", slipList);

      items.add(orderMap);
    }

    long totalElements = orderPage.getTotalElements();
    int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / limit);

    Map<String, Object> pagination = new LinkedHashMap<>();
    pagination.put("page", orderPage.getNumber());
    pagination.put("limit", orderPage.getSize());
    pagination.put("total_elements", totalElements);
    pagination.put("total_pages", totalPages);

    Map<String, Object> data = new LinkedHashMap<>();
    data.put("items", items);
    data.put("pagination", pagination);

    return ApiResponse.<Object>builder()
        .status(200)
        .message("Lấy lịch sử mua hàng thành công")
        .data(data)
        .build();
  }

  @PatchMapping("/{id}/status")
  @Transactional
  public ApiResponse<Object> updateCustomerStatus(
      @PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {

    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_ID, "ID không hợp lệ.");
    }

    if (body == null || body.isEmpty() || !body.containsKey("trang_thai")) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái không được để trống.");
    }

    Object rawStatus = body.get("trang_thai");
    if (rawStatus == null) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái không được để trống.");
    }

    if (!(rawStatus instanceof Integer
        || rawStatus instanceof Long
        || rawStatus instanceof Short
        || rawStatus instanceof Byte)) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái không hợp lệ.");
    }

    long statusVal = ((Number) rawStatus).longValue();
    if (statusVal != 0L && statusVal != 1L) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái phải là 0 hoặc 1.");
    }

    int newStatusVal = (int) statusVal;

    NguoiDung customer =
        nguoiDungRepository
            .findByIdWithVaiTro(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.CUSTOMER_NOT_FOUND_OR_EMPLOYEE,
                        "Khách hàng không tồn tại hoặc ID thuộc nhân viên."));

    if (!isCustomerRole(customer.getVaiTro())) {
      throw new AppException(
          ErrorCode.CUSTOMER_NOT_FOUND_OR_EMPLOYEE,
          "Khách hàng không tồn tại hoặc ID thuộc nhân viên.");
    }

    int currentStatusVal =
        customer.getTrangThai() != null ? (int) customer.getTrangThai().getValue() : 1;

    ZoneOffset vietnamOffset = ZoneOffset.ofHours(7);
    String message =
        newStatusVal == 0
            ? "Khóa tài khoản khách hàng thành công"
            : "Mở tài khoản khách hàng thành công";

    if (newStatusVal == currentStatusVal) {
      String formattedNgayCapNhat =
          customer.getNgayCapNhat() != null
              ? customer.getNgayCapNhat().atOffset(vietnamOffset).toString()
              : (customer.getNgayTao() != null
                  ? customer.getNgayTao().atOffset(vietnamOffset).toString()
                  : LocalDateTime.now().atOffset(vietnamOffset).toString());

      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", customer.getId());
      data.put("ho_ten", customer.getHoTen());
      data.put("trang_thai", currentStatusVal);
      data.put("ngay_cap_nhat", formattedNgayCapNhat);

      return ApiResponse.<Object>builder().status(200).message(message).data(data).build();
    }

    LocalDateTime now = LocalDateTime.now();
    customer.setTrangThai(TrangThaiCoBanEnum.fromValue((short) newStatusVal));
    customer.setNgayCapNhat(now);
    nguoiDungRepository.save(customer);

    String formattedNgayCapNhat = now.atOffset(vietnamOffset).toString();

    Map<String, Object> data = new LinkedHashMap<>();
    data.put("id", customer.getId());
    data.put("ho_ten", customer.getHoTen());
    data.put("trang_thai", newStatusVal);
    data.put("ngay_cap_nhat", formattedNgayCapNhat);

    return ApiResponse.<Object>builder().status(200).message(message).data(data).build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
      @RequestBody CreateCustomerRequest request) {

    var response =
        ApiResponse.<CustomerResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Thêm khách hàng thành công")
            .data(customerService.createCustomer(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  private boolean isCustomerRole(VaiTro vaiTro) {
    if (vaiTro == null) {
      return false;
    }
    String roleName =
        vaiTro.getTenVaiTro() != null ? vaiTro.getTenVaiTro().toUpperCase(Locale.ROOT) : "";
    String roleDesc = vaiTro.getMoTa() != null ? vaiTro.getMoTa().toLowerCase(Locale.ROOT) : "";
    return "USER".equals(roleName)
        || "KHACH_HANG".equals(roleName)
        || "KHÁCH HÀNG".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || "KHACH HANG".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || roleDesc.contains("khách hàng")
        || roleDesc.contains("khach hang");
  }
}
