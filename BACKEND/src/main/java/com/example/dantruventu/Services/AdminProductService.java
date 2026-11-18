// Product application service for IntelliJ-backed admin list/detail/mutation endpoints.
package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.product.AdminProductCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminProductUpdateRequest;
import com.example.dantruventu.DTO.Request.product.ProductVariantCreateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.product.*;
import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.CatalogException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.product.SanPhamMapper;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.product.SanPhamRepository;
import com.example.dantruventu.Repository.warehouse.AdminTonKhoRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Specification.SanPhamSpecification;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminProductService {

  private static final Map<String, String> SORT_FIELDS =
      Map.of(
          "id", "id",
          "ma_san_pham", "maSanPham",
          "ten_san_pham", "tenSanPham",
          "loai_san_pham", "loaiSanPham",
          "trang_thai", "trangThai");

  private final SanPhamRepository sanPhamRepository;
  private final PhienBanSanPhamRepository phienBanSanPhamRepository;
  private final AnhSanPhamRepository anhSanPhamRepository;
  private final TonKhoRepository tonKhoRepository;

  private final DanhMucRepository danhMucRepository;
  private final ThuongHieuRepository thuongHieuRepository;

  private final SanPhamMapper sanPhamMapper;
  private final AdminTonKhoRepository adminTonKhoRepository;

  private final CatalogSupport catalog;

  public AdminProductListResponse getProducts(
      String keyword,
      Long danhMucId,
      Long thuongHieuId,
      Short trangThai,
      LoaiSanPham loaiSanPham,
      int page,
      int limit,
      String sort) {

    var result =
        sanPhamRepository.findAll(
            SanPhamSpecification.build(
                keyword, danhMucId, thuongHieuId, parseTrangThai(trangThai), loaiSanPham),
            createPageable(page, limit, sort));

    var products = result.getContent();
    var productIds = products.stream().map(SanPham::getId).toList();

    var variants =
        productIds.isEmpty()
            ? List.<PhienBanSanPham>of()
            : phienBanSanPhamRepository.findBySanPhamIdInOrderByIdAsc(productIds);

    var components = catalog.components(productIds);
    var stocks = catalog.stocks(catalog.ids(variants, components));
    var images = catalog.primaryImages(productIds);

    var variantsByProduct =
        variants.stream().collect(Collectors.groupingBy(v -> v.getSanPham().getId()));

    var partsByProduct =
        components.stream().collect(Collectors.groupingBy(c -> c.getSanPhamCombo().getId()));

    var items =
        products.stream()
            .map(
                product -> {
                  var productVariants = variantsByProduct.getOrDefault(product.getId(), List.of());
                  var parts = partsByProduct.getOrDefault(product.getId(), List.of());

                  var item = sanPhamMapper.toListItem(product);
                  item.setAnhChinh(images.get(product.getId()));
                  item.setSoPhienBan(productVariants.size());

                  item.setGiaBanThapNhat(
                      productVariants.stream()
                          .map(PhienBanSanPham::getGiaBanLe)
                          .filter(Objects::nonNull)
                          .min(Comparator.naturalOrder())
                          .orElse(null));

                  boolean combo = product.getLoaiSanPham() == LoaiSanPham.BO_PC;

                  item.setTonCoTheBan(
                      combo
                          ? null
                          : productVariants.stream()
                              .mapToLong(
                                  v ->
                                      stocks
                                          .getOrDefault(v.getId(), CatalogSupport.Stock.ZERO)
                                          .available())
                              .sum());

                  item.setTonThucTe(
                      combo
                          ? null
                          : productVariants.stream()
                              .mapToLong(
                                  v ->
                                      stocks
                                          .getOrDefault(v.getId(), CatalogSupport.Stock.ZERO)
                                          .actual())
                              .sum());

                  catalog.metadata(item, product, productVariants, parts, stocks);
                  return item;
                })
            .toList();

    return AdminProductListResponse.builder()
        .items(items)
        .pagination(
            PaginationResponse.builder()
                .page(result.getNumber())
                .limit(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build())
        .build();
  }

  public AdminProductDetailResponse getProductDetail(Long id) {
    SanPham product = requireProduct(id, false);

    var variants = phienBanSanPhamRepository.findBySanPhamIdInOrderByIdAsc(List.of(id));
    var parts = catalog.components(List.of(id));
    var stocks = catalog.stocks(catalog.ids(variants, parts));

    var variantIds = variants.stream().map(PhienBanSanPham::getId).toList();
    var attributes = catalog.attributes(variantIds);
    var lockedModes = catalog.lockedSerialModes(variantIds);

    boolean combo = product.getLoaiSanPham() == LoaiSanPham.BO_PC;
    var response = sanPhamMapper.toDetailResponse(product);

    response.setAnhSanPham(
        Optional.ofNullable(product.getDanhSachAnhSanPham()).orElseGet(List::of).stream()
            .sorted(
                Comparator.comparing(
                    AnhSanPham::getThuTuHienThi, Comparator.nullsLast(Integer::compareTo)))
            .map(sanPhamMapper::toImageResponse)
            .toList());

    response.setDanhSachPhienBan(
        variants.stream()
            .map(
                variant -> {
                  var stock = stocks.getOrDefault(variant.getId(), CatalogSupport.Stock.ZERO);

                  return AdminProductDetailResponse.PhienBanData.builder()
                      .id(variant.getId())
                      .tenPhienBan(variant.getTenPhienBan())
                      .maVach(variant.getMaVach())
                      .giaBanLe(variant.getGiaBanLe())
                      .giaNhap(variant.getGiaNhap())
                      .khoiLuong(variant.getKhoiLuong())
                      .trangThai(variant.getTrangThai().getValue())
                      .coQuanLySerial(variant.getCoQuanLySerial())
                      .cheDoSerialBiKhoa(lockedModes.contains(variant.getId()))
                      .tonCoTheBan(combo ? null : stock.available())
                      .tonThucTe(combo ? null : stock.actual())
                      .hangLoi(combo ? null : stock.damaged())
                      .soLuongGiuChoBaoHanh(combo ? null : stock.warrantyHeld())
                      .conHang(!combo && catalog.active(variant) && stock.available() > 0)
                      .thuocTinhPhienBan(attributes.getOrDefault(variant.getId(), List.of()))
                      .build();
                })
            .toList());

    response.setTonThucTe(
        combo
            ? null
            : variants.stream()
                .mapToLong(v -> stocks.getOrDefault(v.getId(), CatalogSupport.Stock.ZERO).actual())
                .sum());

    response.setTonCoTheBan(
        combo
            ? null
            : variants.stream()
                .mapToLong(
                    v -> stocks.getOrDefault(v.getId(), CatalogSupport.Stock.ZERO).available())
                .sum());

    response.setThanhPhan(catalog.componentResponses(parts, stocks));
    catalog.metadata(response, product, variants, parts, stocks);

    return response;
  }

  @Transactional
  public AdminProductCreateResponse createProduct(AdminProductCreateRequest request) {

    int warranty = catalog.warranty(request, request.getLoaiSanPham());
    boolean combo = request.getLoaiSanPham() == LoaiSanPham.BO_PC;

    if (combo
        && (request.getDanhSachPhienBan().size() != 1
            || !Boolean.FALSE.equals(request.getDanhSachPhienBan().get(0).getCoQuanLySerial()))) {
      throw CatalogException.bad(
          "danh_sach_phien_ban",
          "INVALID_COMBO_VARIANT",
          "Bộ PC phải có đúng một phiên bản bán và co_quan_ly_serial=false");
    }

    String code = request.getMaSanPham().trim();

    if (sanPhamRepository.existsByMaSanPhamIgnoreCase(code)) {
      throw CatalogException.conflict(
          "ma_san_pham", "PRODUCT_CODE_DUPLICATE", "Mã sản phẩm đã tồn tại");
    }

    validateVariantBarcodes(request.getDanhSachPhienBan());
    catalog.validateImages(request.getAnhSanPham());

    if (request.getThongSoKyThuat() != null && !request.getThongSoKyThuat().isObject()) {
      throw CatalogException.bad(
          "thong_so_ky_thuat", "INVALID_SPECIFICATIONS", "Thông số kỹ thuật phải là JSON object");
    }

    SanPham product = sanPhamMapper.toEntity(request);
    product.setDanhMuc(requireDanhMuc(request.getDanhMucId()));
    product.setThuongHieu(
        request.getThuongHieuId() == null ? null : requireThuongHieu(request.getThuongHieuId()));
    product.setMaSanPham(code);
    product.setTenSanPham(request.getTenSanPham().trim());
    product.setThoiHanBaoHanhThang(warranty);
    product.setThueVat(request.getThueVat() == null ? BigDecimal.ZERO : request.getThueVat());

    product = sanPhamRepository.save(product);

    if (request.getAnhSanPham() != null) {
      List<AnhSanPham> images = new ArrayList<>();
      for (var input : request.getAnhSanPham()) {
        var image = sanPhamMapper.toImageEntity(input);
        image.setSanPham(product);
        image.setDuongDanAnh(input.getDuongDanAnh().trim());
        images.add(image);
      }
      anhSanPhamRepository.saveAll(images);
    }

    List<PhienBanSanPham> variants = new ArrayList<>();
    List<AdminProductVariantResponse> variantResponses = new ArrayList<>();

    for (var input : request.getDanhSachPhienBan()) {
      var variant = sanPhamMapper.toVariantEntity(input);
      variant.setSanPham(product);
      variant.setTenPhienBan(input.getTenPhienBan().trim());
      variant.setMaVach(cleanBarcode(input.getMaVach()));
      variant.setKhoiLuong(input.getKhoiLuong() == null ? BigDecimal.ZERO : input.getKhoiLuong());
      variant.setCoQuanLySerial(input.getCoQuanLySerial());

      variant = phienBanSanPhamRepository.save(variant);
      variants.add(variant);

      var attributes = catalog.replaceAttributes(variant, input.getThuocTinhPhienBan());
      var output = sanPhamMapper.toVariantResponse(variant);
      output.setThuocTinhPhienBan(attributes);
      variantResponses.add(output);
    }

    sanPhamRepository.flush();

    var response =
        AdminProductCreateResponse.builder()
            .id(product.getId())
            .maSanPham(product.getMaSanPham())
            .loaiSanPham(product.getLoaiSanPham())
            .danhSachPhienBan(variantResponses)
            .build();

    catalog.metadata(response, product, variants, List.of(), Map.of());
    return response;
  }

  @Transactional
  public AdminProductUpdateResponse updateProduct(Long id, AdminProductUpdateRequest request) {

    SanPham product = requireProduct(id, true);
    int warranty = catalog.warranty(request, product.getLoaiSanPham());

    String code = request.getMaSanPham().trim();

    if (sanPhamRepository.existsByMaSanPhamIgnoreCaseAndIdNot(code, id)) {
      throw CatalogException.conflict(
          "ma_san_pham", "PRODUCT_CODE_DUPLICATE", "Mã sản phẩm đã tồn tại");
    }

    catalog.validateImages(request.getAnhSanPham());

    if (request.getThongSoKyThuat() != null && !request.getThongSoKyThuat().isObject()) {
      throw CatalogException.bad(
          "thong_so_ky_thuat", "INVALID_SPECIFICATIONS", "Thông số kỹ thuật phải là JSON object");
    }

    sanPhamMapper.updateEntity(request, product);
    product.setDanhMuc(requireDanhMuc(request.getDanhMucId()));
    product.setThuongHieu(
        request.getThuongHieuId() == null ? null : requireThuongHieu(request.getThuongHieuId()));
    product.setMaSanPham(code);
    product.setTenSanPham(request.getTenSanPham().trim());
    product.setThoiHanBaoHanhThang(warranty);
    product.setThueVat(request.getThueVat() == null ? BigDecimal.ZERO : request.getThueVat());

    if (request.getAnhSanPham() != null) {
      anhSanPhamRepository.deleteBySanPhamId(id);

      List<AnhSanPham> images = new ArrayList<>();
      for (var input : request.getAnhSanPham()) {
        var image = sanPhamMapper.toImageEntity(input);
        image.setSanPham(product);
        image.setDuongDanAnh(input.getDuongDanAnh().trim());
        images.add(image);
      }
      anhSanPhamRepository.saveAll(images);
    }

    sanPhamRepository.flush();

    var variants = phienBanSanPhamRepository.findBySanPhamIdInOrderByIdAsc(List.of(id));
    var parts = catalog.components(List.of(id));

    var response = sanPhamMapper.toUpdateResponse(product);
    response.setLoaiSanPham(product.getLoaiSanPham());
    catalog.metadata(
        response, product, variants, parts, catalog.stocks(catalog.ids(variants, parts)));

    return response;
  }

  @Transactional
  public AdminProductVariantResponse addVariant(
      Long productId, ProductVariantCreateRequest request) {

    SanPham product = requireStandaloneForWrite(productId);
    String barcode = cleanBarcode(request.getMaVach());

    if (barcode != null && phienBanSanPhamRepository.existsByMaVach(barcode)) {
      throw CatalogException.conflict("ma_vach", "BARCODE_DUPLICATE", "Mã vạch đã được sử dụng");
    }

    var variant = sanPhamMapper.toVariantEntity(request);
    variant.setSanPham(product);
    variant.setTenPhienBan(request.getTenPhienBan().trim());
    variant.setMaVach(barcode);
    variant.setCoQuanLySerial(request.getCoQuanLySerial());
    variant.setKhoiLuong(request.getKhoiLuong() == null ? BigDecimal.ZERO : request.getKhoiLuong());

    variant = phienBanSanPhamRepository.save(variant);

    var attributes = catalog.replaceAttributes(variant, request.getThuocTinhPhienBan());
    var response = sanPhamMapper.toVariantResponse(variant);
    response.setThuocTinhPhienBan(attributes);

    phienBanSanPhamRepository.flush();
    return response;
  }

  @Transactional
  public AdminProductVariantResponse updateVariant(
      Long productId, Long variantId, ProductVariantCreateRequest request) {

    requireStandaloneForWrite(productId);

    var variant =
        phienBanSanPhamRepository
            .findByIdForSaleUpdate(variantId)
            .filter(v -> Objects.equals(v.getSanPham().getId(), productId))
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Phiên bản không thuộc sản phẩm"));

    if (!Objects.equals(variant.getCoQuanLySerial(), request.getCoQuanLySerial())
        && catalog.lockedSerialModes(List.of(variantId)).contains(variantId)) {
      throw CatalogException.conflict(
          "co_quan_ly_serial",
          "SERIAL_MODE_LOCKED",
          "Không được đổi chế độ serial sau khi đã có tồn, serial hoặc lịch sử giao dịch");
    }

    String barcode = cleanBarcode(request.getMaVach());

    if (barcode != null && phienBanSanPhamRepository.existsByMaVachAndIdNot(barcode, variantId)) {
      throw CatalogException.conflict("ma_vach", "BARCODE_DUPLICATE", "Mã vạch đã được sử dụng");
    }

    variant.setTenPhienBan(request.getTenPhienBan().trim());
    variant.setMaVach(barcode);
    variant.setGiaBanLe(request.getGiaBanLe());
    variant.setGiaNhap(request.getGiaNhap());
    variant.setKhoiLuong(request.getKhoiLuong() == null ? BigDecimal.ZERO : request.getKhoiLuong());
    variant.setTrangThai(parseTrangThai(request.getTrangThai()));
    variant.setCoQuanLySerial(request.getCoQuanLySerial());

    phienBanSanPhamRepository.flush();

    var response = sanPhamMapper.toVariantResponse(variant);
    response.setThuocTinhPhienBan(
        catalog.attributes(List.of(variantId)).getOrDefault(variantId, List.of()));
    return response;
  }

  @Transactional
  public AdminProductStatusResponse softDelete(Long id) {

    SanPham product = requireStandaloneForWrite(id);

    if (product.getTrangThai() == TrangThaiCoBanEnum.NGUNG_HOAT_DONG) {

      throw new AppException(ErrorCode.CONFLICT, "Sản phẩm đã ngừng kinh doanh");
    }

    product.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);

    product = sanPhamRepository.save(product);

    return sanPhamMapper.toStatusResponse(product);
  }

  private DanhMuc requireDanhMuc(Long id) {

    return danhMucRepository
        .findById(id)
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy danh mục"));
  }

  private ThuongHieu requireThuongHieu(Long id) {

    return thuongHieuRepository
        .findById(id)
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy thương hiệu"));
  }

  private TrangThaiCoBanEnum parseTrangThai(Short value) {

    if (value == null) {
      return null;
    }

    try {
      return TrangThaiCoBanEnum.fromValue(value);
    } catch (IllegalArgumentException exception) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái sản phẩm không hợp lệ");
    }
  }

  private void validateVariantBarcodes(List<ProductVariantCreateRequest> variants) {
    Set<String> barcodes = new HashSet<>();

    for (var variant : variants) {
      String barcode = cleanBarcode(variant.getMaVach());
      if (barcode == null) continue;

      if (!barcodes.add(barcode.toLowerCase(Locale.ROOT))
          || phienBanSanPhamRepository.existsByMaVach(barcode)) {
        throw CatalogException.conflict(
            "ma_vach", "BARCODE_DUPLICATE", "Mã vạch đã được sử dụng hoặc bị trùng trong yêu cầu");
      }
    }
  }

  private Map<Long, Long> getStockMap(List<Long> variantIds) {

    if (variantIds.isEmpty()) {
      return Map.of();
    }

    return tonKhoRepository.tongTonCoTheBanTheoPhienBan(variantIds).stream()
        .collect(
            Collectors.toMap(
                TonKhoRepository.TonPhienBanProjection::getPhienBanId,
                TonKhoRepository.TonPhienBanProjection::getTonCoTheBan));
  }

  private Pageable createPageable(int page, int limit, String sort) {

    if (page < 0 || limit < 1 || limit > 100) {
      throw new AppException(ErrorCode.INVALID_DATA, "Thông tin phân trang không hợp lệ");
    }

    String sortField = "id";
    Sort.Direction direction = Sort.Direction.DESC;

    if (sort != null && !sort.isBlank()) {

      String[] parts = sort.split(",");

      String requestedField = parts[0].trim();

      sortField = SORT_FIELDS.getOrDefault(requestedField, "id");

      if (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim())) {

        direction = Sort.Direction.ASC;
      }
    }

    return PageRequest.of(page, limit, Sort.by(direction, sortField));
  }

  private SanPham requireStandaloneForWrite(Long id) {
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "ID sản phẩm phải lớn hơn 0");
    }

    SanPham product =
        sanPhamRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy sản phẩm"));

    if (product.getLoaiSanPham() == LoaiSanPham.BO_PC) {
      throw new AppException(
          ErrorCode.CONFLICT, "Vui lòng dùng /api/v1/admin/combos để thao tác với combo");
    }

    return product;
  }

  /** Selects one deterministic list thumbnail, preferring the image marked as primary. */
  private Map<Long, String> getPrimaryImages(List<Long> productIds) {
    if (productIds.isEmpty()) {
      return Map.of();
    }
    Map<Long, List<AnhSanPham>> grouped =
        anhSanPhamRepository.findBySanPhamIdInOrderByThuTuHienThiAscIdAsc(productIds).stream()
            .collect(Collectors.groupingBy(image -> image.getSanPham().getId()));
    Map<Long, String> result = new HashMap<>();
    grouped.forEach(
        (productId, images) ->
            images.stream()
                .filter(image -> Boolean.TRUE.equals(image.getLaAnhChinh()))
                .findFirst()
                .or(() -> images.stream().findFirst())
                .map(AnhSanPham::getDuongDanAnh)
                .ifPresent(url -> result.put(productId, url)));
    return result;
  }

  private SanPham requireStandalone(Long id) {
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "ID sản phẩm phải lớn hơn 0");
    }
    SanPham product =
        sanPhamRepository
            .findById(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy sản phẩm"));
    if (product.getLoaiSanPham() == LoaiSanPham.BO_PC) {
      throw new AppException(
          ErrorCode.CONFLICT, "Vui lòng dùng /api/v1/admin/combos để thao tác với combo");
    }
    return product;
  }

  @Transactional
  public CatalogFields.AttributesResponse replaceVariantAttributes(
      Long productId, Long variantId, CatalogFields.AttributesRequest request) {

    requireProduct(productId, true);

    var variant =
        phienBanSanPhamRepository
            .findByIdForSaleUpdate(variantId)
            .filter(v -> Objects.equals(v.getSanPham().getId(), productId))
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Phiên bản không thuộc sản phẩm"));

    var attributes = catalog.replaceAttributes(variant, request.thuocTinhPhienBan());

    return new CatalogFields.AttributesResponse(variantId, productId, attributes);
  }

  private SanPham requireProduct(Long id, boolean lock) {
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "ID sản phẩm phải lớn hơn 0");
    }

    return (lock ? sanPhamRepository.findByIdForUpdate(id) : sanPhamRepository.findById(id))
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy sản phẩm"));
  }

  private String cleanBarcode(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
