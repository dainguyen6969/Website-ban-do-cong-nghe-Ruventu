package com.example.dantruventu.Services;

import com.example.dantruventu.Config.PcBuilderProperties;
import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.PcBuilderOptionsResponse;
import com.example.dantruventu.DTO.Response.PcBuilderPreviewResponse;
import com.example.dantruventu.DTO.Response.PcBuilderProductsResponse;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.PcBuilderCategory;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PcBuilderService {
  private final DanhMucRepository categoryRepository;
  private final PcBuilderProperties properties;
  private final PhienBanSanPhamRepository variantRepository;
  private final SalesContext salesContext;
  private final PcBuilderSocketSupport socketSupport;
  private final PcBuilderStockSupport stockSupport;

  public PcBuilderPreviewResponse preview(PcBuilderPreviewRequest request) {
    try {
      List<Selection> selected = validateSelections(request);
      if (selected.isEmpty()) {
        return previewResponse(
            List.of(),
            BigDecimal.ZERO,
            0L,
            cpuMainCheck(Map.of()),
            new PcBuilderPreviewResponse.StockCheck(true, List.of()),
            List.of());
      }
      var demand =
          stockSupport.aggregateDemand(
              selected.stream()
                  .map(
                      item ->
                          new PcBuilderStockSupport.DemandInput(item.variantId(), item.quantity()))
                  .toList());
      var variants = validateVariants(selected);
      Map<PcBuilderCategory, PhienBanSanPham> variantBySlot =
          new EnumMap<>(PcBuilderCategory.class);
      for (Selection selection : selected) {
        var variant = variants.get(selection.variantId());
        variantBySlot.put(selection.category(), variant);
      }

      Long warehouseId = resolveWarehouse(ErrorCode.PC_BUILDER_PREVIEW_FAILED);
      var available = stockSupport.availableStock(demand.keySet(), warehouseId);
      var items = new ArrayList<PcBuilderPreviewResponse.Item>(selected.size());
      BigDecimal subtotal = BigDecimal.ZERO;
      long totalQuantity = 0L;
      for (Selection selection : selected) {
        var variant = variants.get(selection.variantId());
        BigDecimal unitPrice = variant.getGiaBanLe();
        BigDecimal amount = unitPrice.multiply(BigDecimal.valueOf(selection.quantity()));
        items.add(
            new PcBuilderPreviewResponse.Item(
                selection.category().name(),
                variant.getId(),
                variant.getSanPham().getTenSanPham(),
                variant.getTenPhienBan(),
                selection.quantity(),
                unitPrice,
                amount,
                available.get(variant.getId())));
        subtotal = subtotal.add(amount);
        totalQuantity = Math.addExact(totalQuantity, selection.quantity());
      }
      var stockDemands = new ArrayList<PcBuilderPreviewResponse.StockDemand>(demand.size());
      boolean stockValid = true;
      for (var entry : demand.entrySet()) {
        long stock = available.get(entry.getKey());
        stockDemands.add(
            new PcBuilderPreviewResponse.StockDemand(entry.getKey(), entry.getValue(), stock));
        if (entry.getValue() > stock) {
          stockValid = false;
        }
      }
      var compatibility = cpuMainCheck(variantBySlot);
      List<String> errors = new ArrayList<>();
      if ("KHONG_KHOP_SOCKET".equals(compatibility.trangThai())) {
        errors.add("Socket CPU và MAIN không khớp nhau.");
      } else if ("CHUA_DU_DU_LIEU".equals(compatibility.trangThai())) {
        errors.add("Thiếu thông tin socket CPU hoặc MAIN để kiểm tra tương thích.");
      }
      if (!stockValid) {
        errors.add("Số lượng lựa chọn vượt quá số lượng có thể bán.");
      }
      return previewResponse(
          items,
          subtotal,
          totalQuantity,
          compatibility,
          new PcBuilderPreviewResponse.StockCheck(stockValid, stockDemands),
          errors);
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không kiểm tra được cấu hình PC Builder", exception);
      throw new AppException(ErrorCode.PC_BUILDER_PREVIEW_FAILED);
    }
  }

  /** Dùng chung kiểm tra phiên bản/hạng mục cho preview và lần ghi giỏ. */
  public Map<Long, PhienBanSanPham> validateVariants(List<Selection> selected) {
    var mappings = resolveCategoryMappings(false);
    var ids = selected.stream().map(Selection::variantId).collect(Collectors.toSet());
    var variants =
        variantRepository.findPcBuilderPreviewVariants(ids).stream()
            .collect(Collectors.toMap(PhienBanSanPham::getId, Function.identity()));
    if (variants.size() != ids.size())
      throw new AppException(ErrorCode.PC_BUILDER_PREVIEW_VARIANT_NOT_FOUND);
    for (Selection selection : selected) {
      var variant = variants.get(selection.variantId());
      var product = variant.getSanPham();
      var category = mappings.get(selection.category());
      if (variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
          || product.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
          || product.getDanhMuc().getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
          || category.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
          || product.getLoaiSanPham() != LoaiSanPham.DON) {
        throw new AppException(ErrorCode.PC_BUILDER_PREVIEW_UNAVAILABLE);
      }
      if (!category.getId().equals(product.getDanhMuc().getId())) {
        throw invalidPreview("Phiên bản đặt sai hạng mục: " + selection.category().name() + ".");
      }
      if (variant.getGiaBanLe() == null || variant.getGiaBanLe().signum() < 0) {
        throw new AppException(ErrorCode.PC_BUILDER_PREVIEW_FAILED);
      }
    }
    return variants;
  }

  public List<Selection> validateSelections(PcBuilderPreviewRequest request) {
    if (request == null
        || request.items() == null
        || request.items().size() > PcBuilderCategory.values().length) {
      throw invalidPreview("items bắt buộc và tối đa 26 hạng mục.");
    }
    var slots = new LinkedHashSet<PcBuilderCategory>();
    List<Selection> selections = new ArrayList<>(request.items().size());
    for (var item : request.items()) {
      if (item == null) {
        throw invalidPreview("Phần tử items không được null.");
      }
      PcBuilderCategory category;
      try {
        category = parseCategory(item.maHangMuc());
      } catch (AppException exception) {
        throw invalidPreview(exception.getMessage());
      }
      if (!slots.add(category)) {
        throw invalidPreview("Hạng mục trùng: " + category.name() + ".");
      }
      long variantId = positiveJsonInteger(item.phienBanId(), "phien_ban_id");
      long quantity = positiveJsonInteger(item.soLuong(), "so_luong");
      if (quantity > Integer.MAX_VALUE) {
        throw invalidPreview("so_luong vượt giới hạn số nguyên.");
      }
      selections.add(new Selection(category, variantId, (int) quantity));
    }
    return selections;
  }

  private long positiveJsonInteger(Object value, String field) {
    try {
      long integer;
      if (value instanceof BigInteger bigInteger) {
        integer = bigInteger.longValueExact();
      } else if (value instanceof Byte
          || value instanceof Short
          || value instanceof Integer
          || value instanceof Long) {
        integer = ((Number) value).longValue();
      } else {
        throw invalidPreview(field + " phải là số nguyên dương.");
      }
      if (integer <= 0) {
        throw invalidPreview(field + " phải là số nguyên dương.");
      }
      return integer;
    } catch (ArithmeticException exception) {
      throw invalidPreview(field + " vượt giới hạn số nguyên.");
    }
  }

  private PcBuilderPreviewResponse.CpuMainCheck cpuMainCheck(
      Map<PcBuilderCategory, PhienBanSanPham> variants) {
    var cpu = variants.get(PcBuilderCategory.CPU);
    var main = variants.get(PcBuilderCategory.MAIN);
    String cpuSocket =
        cpu == null ? null : socketSupport.extractSocket(cpu.getSanPham().getThongSoKyThuat());
    String mainSocket =
        main == null ? null : socketSupport.extractSocket(main.getSanPham().getThongSoKyThuat());
    String status =
        cpu == null || main == null
            ? "CHUA_CHON_DU"
            : socketSupport.compare(cpuSocket, main.getSanPham().getThongSoKyThuat());
    return new PcBuilderPreviewResponse.CpuMainCheck(
        status,
        cpu == null ? null : cpu.getId(),
        main == null ? null : main.getId(),
        cpuSocket,
        mainSocket,
        "SOCKET_CPU_MAIN");
  }

  private PcBuilderPreviewResponse previewResponse(
      List<PcBuilderPreviewResponse.Item> items,
      BigDecimal subtotal,
      long totalQuantity,
      PcBuilderPreviewResponse.CpuMainCheck compatibility,
      PcBuilderPreviewResponse.StockCheck stock,
      List<String> errors) {
    // Cờ thêm giỏ chỉ xét cấu hình gửi lên; chưa cộng số lượng đang có trong giỏ.
    return new PcBuilderPreviewResponse(
        OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).truncatedTo(ChronoUnit.SECONDS),
        items.size(),
        PcBuilderCategory.values().length,
        totalQuantity,
        List.copyOf(items),
        subtotal,
        compatibility,
        stock,
        !items.isEmpty() && errors.isEmpty(),
        !items.isEmpty(),
        List.copyOf(errors));
  }

  public record Selection(PcBuilderCategory category, Long variantId, int quantity) {}

  private AppException invalidPreview(String message) {
    return new AppException(ErrorCode.INVALID_PC_BUILDER_PREVIEW, message);
  }

  public Long resolveWarehouse(ErrorCode failure) {
    Long warehouseId = salesContext.defaultWarehouseId();
    try {
      salesContext.warehouse(warehouseId);
      return warehouseId;
    } catch (AppException exception) {
      log.error("Cấu hình kho PC Builder không hợp lệ: {}", exception.getMessage());
      throw new AppException(failure);
    }
  }

  public PcBuilderProductsResponse getProducts(
      String rawCategory,
      String keyword,
      String rawBrandId,
      String rawMinPrice,
      String rawMaxPrice,
      String rawStockStatus,
      String rawSortMode,
      String rawPage,
      String rawLimit,
      String rawReferenceId,
      String rawSocketOnly) {
    try {
      PcBuilderCategory category = parseCategory(rawCategory);
      Long brandId = positiveId(rawBrandId, "thuong_hieu_id");
      Long referenceId = positiveId(rawReferenceId, "phien_ban_doi_chieu_id");
      BigDecimal minPrice = price(rawMinPrice);
      BigDecimal maxPrice = price(rawMaxPrice);
      if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
        throw invalidProducts("gia_tu không được lớn hơn gia_den.");
      }
      String stockStatus =
          option(rawStockStatus, "TAT_CA", Set.of("TAT_CA", "CON_HANG", "HET_HANG"));
      String sortMode = option(rawSortMode, "MAC_DINH", Set.of("MAC_DINH", "GIA_TANG", "GIA_GIAM"));
      int page = integer(rawPage);
      int limit = integer(rawLimit);
      if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
        throw invalidProducts("Phân trang không hợp lệ; page từ 0, limit từ 1 đến 100.");
      }
      boolean socketOnly = socketOnly(rawSocketOnly, referenceId != null);
      if (category != PcBuilderCategory.CPU
          && category != PcBuilderCategory.MAIN
          && (referenceId != null || rawSocketOnly != null)) {
        throw invalidProducts("Chỉ dùng đối chiếu socket cho hạng mục CPU/MAIN.");
      }
      if (socketOnly && referenceId == null) {
        throw invalidProducts("Bật lọc socket nhưng thiếu phiên bản đối chiếu.");
      }

      var mappings = resolveCategoryMappings();
      Long categoryId = mappings.get(category).getId();
      String referenceSocket = null;
      if (referenceId != null) {
        var reference =
            variantRepository
                .findById(referenceId)
                .orElseThrow(() -> new AppException(ErrorCode.PC_BUILDER_REFERENCE_NOT_FOUND));
        var product = reference.getSanPham();
        var opposite =
            category == PcBuilderCategory.CPU ? PcBuilderCategory.MAIN : PcBuilderCategory.CPU;
        if (!mappings.get(opposite).getId().equals(product.getDanhMuc().getId())) {
          throw invalidProducts("Phiên bản đối chiếu sai nhóm CPU/MAIN.");
        }
        if (reference.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
            || product.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
          throw new AppException(ErrorCode.PC_BUILDER_REFERENCE_DISCONTINUED);
        }
        if (product.getLoaiSanPham() != LoaiSanPham.DON) {
          throw invalidProducts("Phiên bản đối chiếu phải là sản phẩm đơn.");
        }
        referenceSocket = socketSupport.extractSocket(product.getThongSoKyThuat());
        if (referenceSocket == null) {
          throw new AppException(ErrorCode.PC_BUILDER_REFERENCE_SOCKET_MISSING);
        }
      }

      Long warehouseId = resolveWarehouse(ErrorCode.PC_BUILDER_PRODUCTS_FAILED);
      var result =
          variantRepository.findPcBuilderProducts(
              categoryId,
              warehouseId,
              keywordPattern(keyword),
              brandId,
              minPrice,
              maxPrice,
              stockStatus,
              socketOnly ? referenceSocket : null,
              sortMode,
              PageRequest.of(page, limit));
      var brands =
          variantRepository.findPcBuilderBrands(categoryId).stream()
              .map(row -> new PcBuilderProductsResponse.Brand(row.getId(), row.getTenThuongHieu()))
              .toList();
      String finalReferenceSocket = referenceSocket;
      var items =
          result.getContent().stream()
              .map(
                  row -> {
                    long stock = row.getTonCoTheBan() == null ? 0 : row.getTonCoTheBan();
                    return new PcBuilderProductsResponse.Item(
                        row.getSanPhamId(),
                        row.getPhienBanId(),
                        row.getMaSanPham(),
                        row.getMaVach(),
                        row.getTenSanPham(),
                        row.getTenPhienBan(),
                        row.getAnhDaiDien(),
                        row.getThuongHieuId() == null
                            ? null
                            : new PcBuilderProductsResponse.Brand(
                                row.getThuongHieuId(), row.getTenThuongHieu()),
                        row.getGiaBanLe(),
                        null,
                        stock,
                        stock > 0 ? "CON_HANG" : "HET_HANG",
                        socketSupport.mainSpecifications(row.getThongSoKyThuat()),
                        referenceId == null
                            ? null
                            : socketSupport.compare(finalReferenceSocket, row.getThongSoKyThuat()),
                        stock > 0);
                  })
              .toList();
      var pagination =
          PaginationResponse.builder()
              .page(result.getNumber())
              .limit(result.getSize())
              .totalElements(result.getTotalElements())
              .totalPages(result.getTotalPages())
              .build();
      return new PcBuilderProductsResponse(
          category.name(),
          new PcBuilderProductsResponse.CompatibilityFilter(
              socketOnly, referenceId, referenceSocket),
          brands,
          items,
          pagination);
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không truy vấn được phiên bản cho PC Builder", exception);
      throw new AppException(ErrorCode.PC_BUILDER_PRODUCTS_FAILED);
    }
  }

  private PcBuilderCategory parseCategory(String value) {
    if (value == null || value.isBlank()) {
      throw invalidProducts("ma_hang_muc bắt buộc.");
    }
    try {
      return PcBuilderCategory.valueOf(value.strip());
    } catch (IllegalArgumentException exception) {
      throw invalidProducts("Hạng mục không hợp lệ.");
    }
  }

  private Long positiveId(String value, String field) {
    if (value == null) {
      return null;
    }
    try {
      long id = Long.parseLong(value.strip());
      if (id <= 0) {
        throw new NumberFormatException();
      }
      return id;
    } catch (NumberFormatException exception) {
      throw invalidProducts(field + " phải là ID nguyên dương.");
    }
  }

  private int integer(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException exception) {
      throw invalidProducts("Phân trang không hợp lệ.");
    }
  }

  private BigDecimal price(String value) {
    if (value == null) {
      return null;
    }
    try {
      BigDecimal price = new BigDecimal(value.strip()).stripTrailingZeros();
      if (price.signum() < 0
          || price.scale() > 2
          || (long) price.precision() - price.scale() > 36) {
        throw new NumberFormatException();
      }
      return price;
    } catch (NumberFormatException | ArithmeticException exception) {
      throw invalidProducts("Giá lọc không hợp lệ.");
    }
  }

  private String option(String value, String fallback, Set<String> allowed) {
    String result = value == null ? fallback : value.strip();
    if (!allowed.contains(result)) {
      throw invalidProducts("Tình trạng hàng hoặc sắp xếp không hợp lệ.");
    }
    return result;
  }

  private boolean socketOnly(String value, boolean fallback) {
    if (value == null) {
      return fallback;
    }
    return switch (value.strip()) {
      case "true" -> true;
      case "false" -> false;
      default -> throw invalidProducts("chi_khop_socket chỉ nhận true hoặc false.");
    };
  }

  private String keywordPattern(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return "%"
        + value
            .strip()
            .toLowerCase(java.util.Locale.ROOT)
            .replace("!", "!!")
            .replace("%", "!%")
            .replace("_", "!_")
        + "%";
  }

  private AppException invalidProducts(String message) {
    return new AppException(ErrorCode.INVALID_PC_BUILDER_PRODUCTS_FILTER, message);
  }

  public PcBuilderOptionsResponse getOptions() {
    resolveCategoryMappings();
    var groups =
        Arrays.stream(PcBuilderCategory.Group.values())
            .map(
                group ->
                    new PcBuilderOptionsResponse.Group(
                        group.name(),
                        group.getDisplayName(),
                        Arrays.stream(PcBuilderCategory.values())
                            .filter(item -> item.getGroup() == group)
                            .map(
                                item ->
                                    new PcBuilderOptionsResponse.Item(
                                        item.name(), item.getDisplayName()))
                            .toList()))
            .toList();
    return new PcBuilderOptionsResponse(
        PcBuilderCategory.values().length,
        false,
        1,
        groups,
        java.util.List.of("TAT_CA", "CON_HANG", "HET_HANG"),
        java.util.List.of("MAC_DINH", "GIA_TANG", "GIA_GIAM"),
        "SOCKET_CPU_MAIN");
  }

  /** Dùng cùng mapping này cho các endpoint chọn sản phẩm/preview sau này. */
  public Map<PcBuilderCategory, DanhMuc> resolveCategoryMappings() {
    return resolveCategoryMappings(true);
  }

  private Map<PcBuilderCategory, DanhMuc> resolveCategoryMappings(boolean requireActive) {
    try {
      Map<PcBuilderCategory, String> slugs = new EnumMap<>(PcBuilderCategory.class);
      var invalid = new ArrayList<String>();
      for (PcBuilderCategory item : PcBuilderCategory.values()) {
        String slug =
            properties.getCategorySlugs() == null
                ? null
                : properties.getCategorySlugs().get(item.name());
        if (slug == null || slug.isBlank()) {
          invalid.add(item.name() + ": chưa cấu hình slug");
        } else {
          slugs.put(item, slug.strip());
        }
      }
      if (!invalid.isEmpty()) {
        log.error("Cấu hình PC Builder thiếu mapping: {}", invalid);
        throw new AppException(ErrorCode.PC_BUILDER_CONFIGURATION_INVALID);
      }
      Map<String, DanhMuc> categories =
          categoryRepository.findByDuongDanUrlIn(slugs.values()).stream()
              .collect(Collectors.toMap(DanhMuc::getDuongDanUrl, Function.identity()));
      Map<PcBuilderCategory, DanhMuc> resolved = new LinkedHashMap<>();
      for (PcBuilderCategory item : PcBuilderCategory.values()) {
        DanhMuc category = categories.get(slugs.get(item));
        if (category == null
            || (requireActive && category.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG)) {
          invalid.add(item.name() + " -> " + slugs.get(item));
        } else {
          resolved.put(item, category);
        }
      }
      if (!invalid.isEmpty()) {
        log.error("Danh mục PC Builder thiếu hoặc ngừng hoạt động: {}", invalid);
        throw new AppException(ErrorCode.PC_BUILDER_CONFIGURATION_INVALID);
      }
      return Map.copyOf(resolved);
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không tải được cấu hình danh mục PC Builder", exception);
      throw new AppException(ErrorCode.PC_BUILDER_CONFIGURATION_INVALID);
    }
  }
}
