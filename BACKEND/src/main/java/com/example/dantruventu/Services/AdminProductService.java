// Product application service for IntelliJ-backed admin list/detail/mutation endpoints.
package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.product.AdminProductCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminProductUpdateRequest;
import com.example.dantruventu.DTO.Request.product.ProductVariantCreateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.product.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.product.SanPhamMapper;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.product.SanPhamRepository;
import com.example.dantruventu.Repository.warehouse.AdminTonKhoRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import com.example.dantruventu.Specification.SanPhamSpecification;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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

  public AdminProductListResponse getProducts(
      String keyword,
      Long danhMucId,
      Long thuongHieuId,
      Short trangThai,
      LoaiSanPham loaiSanPham,
      int page,
      int limit,
      String sort) {

    TrangThaiCoBanEnum status = parseTrangThai(trangThai);

    Specification<SanPham> specification =
        SanPhamSpecification.build(keyword, danhMucId, thuongHieuId, status, loaiSanPham);

    Pageable pageable = createPageable(page, limit, sort);

    Page<SanPham> productPage = sanPhamRepository.findAll(specification, pageable);

    List<SanPham> products = productPage.getContent();
    List<Long> productIds = products.stream().map(SanPham::getId).toList();
    List<PhienBanSanPham> variants =
        productIds.isEmpty()
            ? List.of()
            : phienBanSanPhamRepository.findBySanPhamIdInOrderByIdAsc(productIds);
    Map<Long, List<PhienBanSanPham>> variantsByProduct =
        variants.stream().collect(Collectors.groupingBy(variant -> variant.getSanPham().getId()));
    Map<Long, Long> stockByVariant =
        getStockMap(variants.stream().map(PhienBanSanPham::getId).toList());
    Map<Long, String> primaryImages = getPrimaryImages(productIds);

    List<AdminProductListItemResponse> items =
        products.stream()
            .map(
                product -> {
                  List<PhienBanSanPham> productVariants =
                      variantsByProduct.getOrDefault(product.getId(), List.of());
                  AdminProductListItemResponse item = sanPhamMapper.toListItem(product);
                  item.setAnhChinh(primaryImages.get(product.getId()));
                  item.setSoPhienBan(productVariants.size());
                  item.setGiaBanThapNhat(
                      productVariants.stream()
                          .map(PhienBanSanPham::getGiaBanLe)
                          .filter(Objects::nonNull)
                          .min(Comparator.naturalOrder())
                          .orElse(null));
                  long stock =
                      productVariants.stream()
                          .mapToLong(variant -> stockByVariant.getOrDefault(variant.getId(), 0L))
                          .sum();
                  if (product.getLoaiSanPham() == LoaiSanPham.BO_PC) {
                    stock =
                        adminTonKhoRepository.findComboStocks(product.getId(), null).stream()
                            .mapToLong(row -> row.getTonCoTheBan())
                            .sum();
                  }
                  item.setTonCoTheBan(stock);
                  return item;
                })
            .toList();

    PaginationResponse pagination =
        PaginationResponse.builder()
            .page(productPage.getNumber())
            .limit(productPage.getSize())
            .totalElements(productPage.getTotalElements())
            .totalPages(productPage.getTotalPages())
            .build();

    return AdminProductListResponse.builder().items(items).pagination(pagination).build();
  }

  public AdminProductDetailResponse getProductDetail(Long id) {

    SanPham product = requireStandalone(id);

    AdminProductDetailResponse response = sanPhamMapper.toDetailResponse(product);

    List<AnhSanPham> images =
        Optional.ofNullable(product.getDanhSachAnhSanPham()).orElseGet(List::of);

    response.setAnhSanPham(
        images.stream()
            .sorted(
                Comparator.comparing(
                    AnhSanPham::getThuTuHienThi, Comparator.nullsLast(Integer::compareTo)))
            .map(sanPhamMapper::toImageResponse)
            .toList());

    List<PhienBanSanPham> variants =
        Optional.ofNullable(product.getDanhSachPhienBan()).orElseGet(List::of);

    List<Long> variantIds = variants.stream().map(PhienBanSanPham::getId).toList();

    final Map<Long, Long> stockMap;

    if (product.getLoaiSanPham() == LoaiSanPham.BO_PC) {
      if (variants.size() != 1) {
        throw new AppException(ErrorCode.CONFLICT, "Combo phải có đúng một phiên bản bán");
      }

      long comboStock =
          adminTonKhoRepository.findComboStocks(product.getId(), null).stream()
              .mapToLong(row -> row.getTonCoTheBan())
              .sum();

      stockMap = Map.of(variants.getFirst().getId(), comboStock);
    } else {
      stockMap = getStockMap(variantIds);
    }

    List<AdminProductDetailResponse.PhienBanData> variantResponses =
        variants.stream()
            .map(
                variant ->
                    AdminProductDetailResponse.PhienBanData.builder()
                        .id(variant.getId())
                        .tenPhienBan(variant.getTenPhienBan())
                        .maVach(variant.getMaVach())
                        .giaBanLe(variant.getGiaBanLe())
                        .giaNhap(variant.getGiaNhap())
                        .khoiLuong(variant.getKhoiLuong())
                        .trangThai(variant.getTrangThai().getValue())
                        .tonCoTheBan(stockMap.getOrDefault(variant.getId(), 0L))
                        .build())
            .toList();

    response.setDanhSachPhienBan(variantResponses);

    return response;
  }

  @Transactional
  public AdminProductCreateResponse createProduct(AdminProductCreateRequest request) {

    if (request.getLoaiSanPham() == LoaiSanPham.BO_PC) {
      throw new AppException(
          ErrorCode.INVALID_DATA, "Vui lòng dùng /api/v1/admin/combos để tạo combo");
    }

    String maSanPham = request.getMaSanPham().trim();

    if (sanPhamRepository.existsByMaSanPham(maSanPham)) {
      throw new AppException(ErrorCode.CONFLICT, "Mã sản phẩm đã tồn tại");
    }

    DanhMuc danhMuc = requireDanhMuc(request.getDanhMucId());

    ThuongHieu thuongHieu =
        request.getThuongHieuId() == null ? null : requireThuongHieu(request.getThuongHieuId());

    validateVariantBarcodes(request.getDanhSachPhienBan());

    SanPham product = sanPhamMapper.toEntity(request);

    product.setDanhMuc(danhMuc);
    product.setThuongHieu(thuongHieu);
    product.setMaSanPham(maSanPham);
    product.setTenSanPham(request.getTenSanPham().trim());

    product = sanPhamRepository.save(product);

    if (request.getAnhSanPham() != null) {

      SanPham savedProduct = product;

      List<AnhSanPham> images =
          request.getAnhSanPham().stream()
              .map(sanPhamMapper::toImageEntity)
              .peek(image -> image.setSanPham(savedProduct))
              .toList();

      anhSanPhamRepository.saveAll(images);
    }

    SanPham savedProduct = product;

    List<PhienBanSanPham> variants =
        request.getDanhSachPhienBan().stream()
            .map(sanPhamMapper::toVariantEntity)
            .peek(variant -> variant.setSanPham(savedProduct))
            .toList();

    variants = phienBanSanPhamRepository.saveAll(variants);

    return AdminProductCreateResponse.builder()
        .id(product.getId())
        .maSanPham(product.getMaSanPham())
        .danhSachPhienBan(variants.stream().map(PhienBanSanPham::getId).toList())
        .build();
  }

  @Transactional
  public AdminProductUpdateResponse updateProduct(Long id, AdminProductUpdateRequest request) {

    SanPham product = requireStandaloneForWrite(id);

    String maSanPham = request.getMaSanPham().trim();

    if (sanPhamRepository.existsByMaSanPhamAndIdNot(maSanPham, id)) {

      throw new AppException(ErrorCode.CONFLICT, "Mã sản phẩm đã tồn tại");
    }

    DanhMuc danhMuc = requireDanhMuc(request.getDanhMucId());

    ThuongHieu thuongHieu =
        request.getThuongHieuId() == null ? null : requireThuongHieu(request.getThuongHieuId());

    sanPhamMapper.updateEntity(request, product);

    product.setDanhMuc(danhMuc);
    product.setThuongHieu(thuongHieu);
    product.setMaSanPham(maSanPham);
    product.setTenSanPham(request.getTenSanPham().trim());

    SanPham savedProduct = sanPhamRepository.save(product);

    if (request.getAnhSanPham() != null) {
      anhSanPhamRepository.deleteBySanPhamId(id);
      List<AnhSanPham> images =
          request.getAnhSanPham().stream()
              .map(sanPhamMapper::toImageEntity)
              .peek(image -> image.setSanPham(savedProduct))
              .toList();
      anhSanPhamRepository.saveAll(images);
    }

    return sanPhamMapper.toUpdateResponse(savedProduct);
  }

  @Transactional
  public AdminProductVariantResponse addVariant(
      Long productId, ProductVariantCreateRequest request) {

    SanPham product = requireStandaloneForWrite(productId);

    String maVach = request.getMaVach().trim();

    if (phienBanSanPhamRepository.existsByMaVach(maVach)) {
      throw new AppException(ErrorCode.CONFLICT, "Mã vạch đã tồn tại");
    }

    PhienBanSanPham variant = sanPhamMapper.toVariantEntity(request);

    variant.setSanPham(product);
    variant.setMaVach(maVach);
    variant.setTenPhienBan(request.getTenPhienBan().trim());

    variant = phienBanSanPhamRepository.save(variant);

    return sanPhamMapper.toVariantResponse(variant);
  }

  @Transactional
  public AdminProductVariantResponse updateVariant(
      Long productId, Long variantId, ProductVariantCreateRequest request) {

    SanPham product = requireStandaloneForWrite(productId);
    PhienBanSanPham variant =
        phienBanSanPhamRepository
            .findByIdForSaleUpdate(variantId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản"));

    if (!variant.getSanPham().getId().equals(product.getId())) {
      throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản của sản phẩm");
    }

    String maVach = request.getMaVach().trim();
    if (phienBanSanPhamRepository.existsByMaVachAndIdNot(maVach, variantId)) {
      throw new AppException(ErrorCode.CONFLICT, "Mã vạch đã tồn tại");
    }

    variant.setTenPhienBan(request.getTenPhienBan().trim());
    variant.setMaVach(maVach);
    variant.setGiaBanLe(request.getGiaBanLe());
    variant.setGiaNhap(request.getGiaNhap());
    variant.setKhoiLuong(request.getKhoiLuong());
    variant.setTrangThai(parseTrangThai(request.getTrangThai()));

    return sanPhamMapper.toVariantResponse(phienBanSanPhamRepository.save(variant));
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

    Set<String> values = new HashSet<>();

    for (ProductVariantCreateRequest variant : variants) {

      String barcode = variant.getMaVach().trim();

      if (!values.add(barcode)) {
        throw new AppException(ErrorCode.CONFLICT, "Mã vạch bị trùng trong danh sách phiên bản");
      }
    }

    if (phienBanSanPhamRepository.existsByMaVachIn(values)) {
      throw new AppException(ErrorCode.CONFLICT, "Mã vạch đã tồn tại");
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
}
