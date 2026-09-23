package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryDetailResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryLedgerListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryListResponse;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.warehouse.TonKhoMapper;
import com.example.dantruventu.Repository.warehouse.AdminTonKhoRepository;
import com.example.dantruventu.Repository.warehouse.KhoHangRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import com.example.dantruventu.Specification.TheKhoSpecification;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminInventoryService {

  private final AdminTonKhoRepository adminTonKhoRepository;
  private final KhoHangRepository khoHangRepository;
  private final TheKhoRepository theKhoRepository;
  private final TonKhoMapper tonKhoMapper;

  @Value("${ruventu.inventory.time-zone:Asia/Ho_Chi_Minh}")
  private String inventoryTimeZone;

  private static final Set<String> SORT_FIELDS =
      Set.of("doi_tuong_id", "ma_hien_thi", "ten_hien_thi", "ton_thuc_te", "ton_co_the_ban");

  public AdminInventoryListResponse getItems(
      String keyword,
      String loaiDoiTuong,
      Long khoHangId,
      boolean chiCanhBao,
      int page,
      int limit,
      String sort) {

    validatePagination(page, limit);
    validateOptionalId(khoHangId, "kho_hang_id");

    if (khoHangId != null && !khoHangRepository.existsById(khoHangId)) {
      throw invalid("Kho hàng trong bộ lọc không tồn tại");
    }

    String type = parseType(loaiDoiTuong, true);
    String pattern = keywordPattern(keyword);
    String[] sortParts = parseSort(sort);

    // Không truyền Sort vào Pageable:
    // SQL đã sắp xếp trên tập dữ liệu sau UNION ALL.
    var pageable = PageRequest.of(page, limit);

    var result =
        adminTonKhoRepository.findInventoryItems(
            pattern, type, khoHangId, chiCanhBao, sortParts[0], sortParts[1], pageable);

    var items = result.getContent().stream().map(tonKhoMapper::toItem).toList();

    return AdminInventoryListResponse.builder().items(items).pagination(pagination(result)).build();
  }

  public AdminInventoryDetailResponse getDetail(Long id, String loaiDoiTuong) {

    if (id == null || id <= 0) {
      throw invalid("ID phải là số nguyên dương");
    }

    String type = parseType(loaiDoiTuong, false);

    if ("PHIEN_BAN".equals(type)) {
      return getVariantDetail(id);
    }

    return getComboDetail(id);
  }

  private AdminInventoryDetailResponse getVariantDetail(Long id) {
    var phienBan =
        adminTonKhoRepository
            .findVariant(id, LoaiSanPham.DON)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản của sản phẩm đơn"));

    var stocks =
        adminTonKhoRepository.findVariantStocks(id, null).stream()
            .map(tonKhoMapper::toStock)
            .toList();

    return AdminInventoryDetailResponse.builder()
        .loaiDoiTuong("PHIEN_BAN")
        .doiTuongId(id)
        .phienBan(tonKhoMapper.toPhienBan(phienBan))
        .tonKhoTheoKho(stocks)
        .build();
  }

  private AdminInventoryDetailResponse getComboDetail(Long id) {
    var combo =
        adminTonKhoRepository
            .findCombo(id, LoaiSanPham.BO_PC)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy combo"));

    var stocks =
        adminTonKhoRepository.findComboStocks(id, null).stream()
            .map(tonKhoMapper::toStock)
            .toList();

    // Lấy tồn của toàn bộ linh kiện bằng một truy vấn.
    var componentStocks =
        adminTonKhoRepository.findComponentStocks(id, null).stream()
            .filter(row -> row.getKhoHangId() != null)
            .collect(
                Collectors.groupingBy(
                    AdminTonKhoRepository.ComponentStockProjection::getPhienBanId));

    var components =
        adminTonKhoRepository.findComponents(id, null).stream()
            .map(
                component -> {
                  var response = tonKhoMapper.toThanhPhan(component);

                  var rows = componentStocks.getOrDefault(component.getPhienBanId(), List.of());

                  response.setTonKhoTheoKho(rows.stream().map(tonKhoMapper::toStock).toList());

                  return response;
                })
            .toList();

    return AdminInventoryDetailResponse.builder()
        .loaiDoiTuong("COMBO")
        .doiTuongId(id)
        .combo(tonKhoMapper.toCombo(combo))
        .tonKhoTheoKho(stocks)
        .components(components)
        .build();
  }

  public AdminInventoryLedgerListResponse getLedger(
      Long khoHangId,
      Long phienBanId,
      String loaiGiaoDich,
      String tuNgay,
      String denNgay,
      int page,
      int limit) {

    validatePagination(page, limit);
    validateOptionalId(khoHangId, "kho_hang_id");
    validateOptionalId(phienBanId, "phien_ban_id");

    LoaiGiaoDichKho transactionType = parseTransactionType(loaiGiaoDich);

    LocalDate from = parseDate(tuNgay, "tu_ngay");
    LocalDate to = parseDate(denNgay, "den_ngay");

    if (from != null && to != null && from.isAfter(to)) {
      throw invalid("tu_ngay không được lớn hơn den_ngay");
    }

    var specification =
        TheKhoSpecification.build(
            khoHangId,
            phienBanId,
            transactionType,
            from == null ? null : from.atStartOfDay(),
            to == null ? null : to.plusDays(1).atStartOfDay());

    var pageable =
        PageRequest.of(
            page, limit, Sort.by("ngayTao").descending().and(Sort.by("id").descending()));

    var result = theKhoRepository.findAll(specification, pageable);

    ZoneId zoneId = ZoneId.of(inventoryTimeZone);

    var items =
        result.getContent().stream().map(theKho -> tonKhoMapper.toLedger(theKho, zoneId)).toList();

    return AdminInventoryLedgerListResponse.builder()
        .items(items)
        .pagination(pagination(result))
        .build();
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalid("Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }
  }

  private void validateOptionalId(Long id, String field) {
    if (id != null && id <= 0) {
      throw invalid(field + " phải là số nguyên dương");
    }
  }

  private String keywordPattern(String keyword) {
    String value = keyword == null ? "" : keyword.trim();

    if (value.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    return "%"
        + value.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_")
        + "%";
  }

  private String parseType(String value, boolean allowAll) {
    if (value == null || value.isBlank()) {
      throw invalid("Thiếu loai_doi_tuong");
    }

    String type = value.trim().toUpperCase(Locale.ROOT);

    if ("PHIEN_BAN".equals(type) || "COMBO".equals(type) || (allowAll && "ALL".equals(type))) {
      return type;
    }

    throw invalid(
        allowAll
            ? "loai_doi_tuong chỉ nhận PHIEN_BAN, COMBO hoặc ALL"
            : "loai_doi_tuong chỉ nhận PHIEN_BAN hoặc COMBO");
  }

  private String[] parseSort(String value) {
    String normalized = value == null ? "ten_hien_thi,asc" : value.trim();

    String[] parts = normalized.split(",", -1);

    if (parts.length != 2) {
      throw invalid("sort phải có dạng ten_hien_thi,asc");
    }

    String field = parts[0].trim().toLowerCase(Locale.ROOT);
    String direction = parts[1].trim().toLowerCase(Locale.ROOT);

    if (!SORT_FIELDS.contains(field)) {
      throw invalid(
          "Trường sort hợp lệ: doi_tuong_id, ma_hien_thi, "
              + "ten_hien_thi, ton_thuc_te, ton_co_the_ban");
    }

    if (!"asc".equals(direction) && !"desc".equals(direction)) {
      throw invalid("Chiều sắp xếp chỉ nhận asc hoặc desc");
    }

    return new String[] {field, direction};
  }

  private LoaiGiaoDichKho parseTransactionType(String value) {
    if (value == null) {
      return null;
    }

    try {
      return LoaiGiaoDichKho.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid(
          "loai_giao_dich chỉ nhận NHAP_HANG, XUAT_BAN, " + "KHACH_TRA, TRA_NCC, KIEM_KHO");
    }
  }

  private LocalDate parseDate(String value, String field) {
    if (value == null) {
      return null;
    }

    try {
      LocalDate date = LocalDate.parse(value.trim());

      if (date.getYear() < 1000 || date.getYear() > 9998) {
        throw invalid(field + " nằm ngoài khoảng ngày hỗ trợ");
      }

      return date;
    } catch (DateTimeParseException exception) {
      throw invalid(field + " phải có định dạng yyyy-MM-dd");
    }
  }

  private PaginationResponse pagination(Page<?> page) {
    return PaginationResponse.builder()
        .page(page.getNumber())
        .limit(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .build();
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }
}
