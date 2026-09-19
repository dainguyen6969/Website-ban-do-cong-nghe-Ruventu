package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.product.AdminBrandRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.product.*;
import com.example.dantruventu.Entity.ThuongHieu;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.product.ThuongHieuMapper;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Specification.ThuongHieuSpecification;
import java.net.URI;
import java.net.URISyntaxException;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminBrandService {

  private final ThuongHieuRepository thuongHieuRepository;
  private final ThuongHieuMapper thuongHieuMapper;

  public AdminBrandListResponse getBrands(String keyword, Short trangThai, int page, int limit) {

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(
          ErrorCode.INVALID_DATA, "Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }

    if (keyword != null && keyword.length() > 100) {
      throw new AppException(ErrorCode.INVALID_DATA, "Từ khóa tìm kiếm tối đa 100 ký tự");
    }

    TrangThaiCoBanEnum status = trangThai == null ? null : parseTrangThai(trangThai);

    var specification = ThuongHieuSpecification.build(keyword, status);

    var pageable =
        PageRequest.of(
            page, limit, Sort.by("tenThuongHieu").ascending().and(Sort.by("id").ascending()));

    var brandPage = thuongHieuRepository.findAll(specification, pageable);

    List<Long> ids = brandPage.getContent().stream().map(ThuongHieu::getId).toList();

    Map<Long, Long> countMap = getProductCountMap(ids);

    List<AdminBrandListItemResponse> items =
        brandPage.getContent().stream()
            .map(
                brand -> {
                  var item = thuongHieuMapper.toListItem(brand);
                  item.setSoLuongSanPham(countMap.getOrDefault(brand.getId(), 0L));
                  return item;
                })
            .toList();

    var pagination =
        PaginationResponse.builder()
            .page(brandPage.getNumber())
            .limit(brandPage.getSize())
            .totalElements(brandPage.getTotalElements())
            .totalPages(brandPage.getTotalPages())
            .build();

    return AdminBrandListResponse.builder().items(items).pagination(pagination).build();
  }

  public AdminBrandDetailResponse getDetail(Long id) {
    ThuongHieu brand = requireBrand(id);

    var response = thuongHieuMapper.toDetail(brand);

    response.setSanPham(
        thuongHieuRepository.findBrandProductSummary(id).stream()
            .map(thuongHieuMapper::toProductData)
            .toList());

    return response;
  }

  @Transactional
  public AdminBrandResponse create(AdminBrandRequest request) {
    String name = normalizeName(request.getTenThuongHieu());
    String logo = normalizeLogo(request.getLogo());
    TrangThaiCoBanEnum status = parseTrangThai(request.getTrangThai());

    validateName(name, null);

    String slug = createUniqueSlug(name, null);

    ThuongHieu brand = thuongHieuMapper.toEntity(request);
    brand.setTenThuongHieu(name);
    brand.setDuongDanUrl(slug);
    brand.setLogo(logo);
    brand.setTrangThai(status);

    brand = thuongHieuRepository.saveAndFlush(brand);

    return thuongHieuMapper.toResponse(brand);
  }

  @Transactional
  public AdminBrandResponse update(Long id, AdminBrandRequest request) {

    ThuongHieu brand = requireBrandForUpdate(id);

    String name = normalizeName(request.getTenThuongHieu());
    String logo = normalizeLogo(request.getLogo());
    TrangThaiCoBanEnum status = parseTrangThai(request.getTrangThai());

    validateName(name, id);

    String slug = brand.getDuongDanUrl();

    if (!Objects.equals(name, brand.getTenThuongHieu()) || slug == null || slug.isBlank()) {
      slug = createUniqueSlug(name, id);
    }

    thuongHieuMapper.updateEntity(request, brand);

    brand.setTenThuongHieu(name);
    brand.setDuongDanUrl(slug);
    brand.setLogo(logo);
    brand.setTrangThai(status);

    brand = thuongHieuRepository.saveAndFlush(brand);

    return thuongHieuMapper.toResponse(brand);
  }

  @Transactional
  public AdminBrandStatusResponse softDelete(Long id) {
    ThuongHieu brand = requireBrandForUpdate(id);

    long productCount = thuongHieuRepository.countLinkedProducts(id);

    if (productCount > 0) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "Thương hiệu đang có "
              + productCount
              + " sản phẩm liên kết. "
              + "Vui lòng dùng chức năng cập nhật để chuyển "
              + "trạng thái sang Ngừng hoạt động.");
    }

    brand.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);

    brand = thuongHieuRepository.saveAndFlush(brand);

    return thuongHieuMapper.toStatusResponse(brand);
  }

  private ThuongHieu requireBrand(Long id) {
    validateId(id);

    return thuongHieuRepository
        .findById(id)
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy thương hiệu"));
  }

  private ThuongHieu requireBrandForUpdate(Long id) {
    validateId(id);

    return thuongHieuRepository
        .findByIdForUpdate(id)
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy thương hiệu"));
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "ID thương hiệu phải là số nguyên dương");
    }
  }

  private String normalizeName(String value) {
    if (value == null || value.isBlank()) {
      throw new AppException(ErrorCode.INVALID_DATA, "Tên thương hiệu không được để trống");
    }

    String name = value.strip().replaceAll("\\s+", " ");

    if (name.length() > 100) {
      throw new AppException(ErrorCode.INVALID_DATA, "Tên thương hiệu tối đa 100 ký tự");
    }

    return name;
  }

  private void validateName(String name, Long currentId) {
    boolean exists =
        currentId == null
            ? thuongHieuRepository.existsByTenThuongHieuIgnoreCase(name)
            : thuongHieuRepository.existsByTenThuongHieuIgnoreCaseAndIdNot(name, currentId);

    if (exists) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "Thương hiệu này đã tồn tại trên hệ thống. " + "Vui lòng nhập tên khác");
    }
  }

  private TrangThaiCoBanEnum parseTrangThai(Short value) {
    if (value == null || (value != 0 && value != 1)) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái chỉ nhận 0 hoặc 1");
    }

    return TrangThaiCoBanEnum.fromValue(value);
  }

  private Map<Long, Long> getProductCountMap(List<Long> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }

    return thuongHieuRepository.countProductsByBrandIds(ids).stream()
        .collect(
            Collectors.toMap(
                ThuongHieuRepository.ProductCountProjection::getThuongHieuId,
                ThuongHieuRepository.ProductCountProjection::getSoLuongSanPham));
  }

  private String createUniqueSlug(String name, Long currentId) {
    String base =
        Normalizer.normalize(name, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replace('đ', 'd')
            .replace('Đ', 'D')
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");

    if (base.isBlank()) {
      base = "thuong-hieu";
    }

    base = truncateSlug(base, 50);

    for (int index = 1; index <= 1000; index++) {
      String suffix = index == 1 ? "" : "-" + index;

      String candidate = truncateSlug(base, 50 - suffix.length()) + suffix;

      boolean exists =
          currentId == null
              ? thuongHieuRepository.existsByDuongDanUrl(candidate)
              : thuongHieuRepository.existsByDuongDanUrlAndIdNot(candidate, currentId);

      if (!exists) {
        return candidate;
      }
    }

    throw new AppException(ErrorCode.CONFLICT, "Không thể tạo đường dẫn duy nhất cho thương hiệu");
  }

  private String truncateSlug(String slug, int length) {
    String result = slug.length() <= length ? slug : slug.substring(0, length);

    return result.replaceAll("-+$", "");
  }

  private String normalizeLogo(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    String logo = value.strip();

    if (logo.length() > 255) {
      throw new AppException(ErrorCode.INVALID_DATA, "Đường dẫn logo tối đa 255 ký tự");
    }

    try {
      URI uri = new URI(logo);

      String scheme = uri.getScheme();
      String path = uri.getPath();

      boolean validScheme = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);

      boolean validExtension =
          path != null && path.toLowerCase(Locale.ROOT).matches(".*\\.(jpg|jpeg|png|webp)$");

      if (!validScheme || uri.getHost() == null || uri.getUserInfo() != null || !validExtension) {
        throw new AppException(
            ErrorCode.INVALID_DATA, "Logo phải là URL HTTP/HTTPS của ảnh JPG, PNG hoặc WEBP");
      }

      return logo;

    } catch (URISyntaxException exception) {
      throw new AppException(ErrorCode.INVALID_DATA, "Đường dẫn logo không hợp lệ");
    }
  }
}
