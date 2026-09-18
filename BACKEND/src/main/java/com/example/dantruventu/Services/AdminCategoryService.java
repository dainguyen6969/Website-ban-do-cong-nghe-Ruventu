package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.product.AdminCategoryCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminCategoryUpdateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.product.*;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.product.DanhMucMapper;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.product.SanPhamRepository;
import com.example.dantruventu.Specification.DanhMucSpecification;
import java.text.Normalizer;
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
public class AdminCategoryService {

  private final DanhMucRepository danhMucRepository;
  private final SanPhamRepository sanPhamRepository;
  private final DanhMucMapper danhMucMapper;

  public AdminCategoryListResponse getCategories(
      String keyword, Short trangThai, Long danhMucChaId, int page, int limit) {

    if (page < 0 || limit < 1 || limit > 100) {
      throw new AppException(ErrorCode.INVALID_DATA, "Thông tin phân trang không hợp lệ");
    }

    TrangThaiCoBanEnum status = parseTrangThai(trangThai);

    Specification<DanhMuc> specification =
        DanhMucSpecification.build(keyword, status, danhMucChaId);

    Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.ASC, "tenDanhMuc"));

    Page<DanhMuc> categoryPage = danhMucRepository.findAll(specification, pageable);

    List<Long> categoryIds = categoryPage.getContent().stream().map(DanhMuc::getId).toList();

    Map<Long, Long> countMap = getProductCountMap(categoryIds);

    List<AdminCategoryListItemResponse> items =
        categoryPage.getContent().stream()
            .map(
                category -> {
                  AdminCategoryListItemResponse response = danhMucMapper.toListItem(category);

                  response.setSoLuongSanPham(countMap.getOrDefault(category.getId(), 0L));

                  return response;
                })
            .toList();

    PaginationResponse pagination =
        PaginationResponse.builder()
            .page(categoryPage.getNumber())
            .limit(categoryPage.getSize())
            .totalElements(categoryPage.getTotalElements())
            .totalPages(categoryPage.getTotalPages())
            .build();

    return AdminCategoryListResponse.builder().items(items).pagination(pagination).build();
  }

  public AdminCategoryDetailResponse getDetail(Long id) {

    DanhMuc category = requireCategory(id);

    AdminCategoryDetailResponse response = danhMucMapper.toDetail(category);

    List<AdminCategoryDetailResponse.ProductData> products =
        sanPhamRepository.findCategoryProductSummary(id).stream()
            .map(
                product ->
                    AdminCategoryDetailResponse.ProductData.builder()
                        .id(product.getId())
                        .maSanPham(product.getMaSanPham())
                        .tenSanPham(product.getTenSanPham())
                        .giaBan(product.getGiaBan())
                        .tonCoTheBan(product.getTonCoTheBan())
                        .trangThai(product.getTrangThai().getValue())
                        .build())
            .toList();

    response.setSanPham(products);

    return response;
  }

  @Transactional
  public AdminCategoryResponse create(AdminCategoryCreateRequest request) {

    String name = request.getTenDanhMuc().trim();

    validateName(name, null);

    String slug = slugify(name);

    validateSlug(slug, null);

    DanhMuc parent =
        request.getDanhMucChaId() == null ? null : requireParent(request.getDanhMucChaId());

    DanhMuc category = danhMucMapper.toEntity(request);

    category.setTenDanhMuc(name);
    category.setDuongDanUrl(slug);
    category.setDanhMucCha(parent);

    if (request.getTrangThai() == null) {
      category.setTrangThai(TrangThaiCoBanEnum.HOAT_DONG);
    }

    category = danhMucRepository.save(category);

    return danhMucMapper.toResponse(category);
  }

  @Transactional
  public AdminCategoryResponse update(Long id, AdminCategoryUpdateRequest request) {

    DanhMuc category = requireCategory(id);

    String name = request.getTenDanhMuc().trim();

    validateName(name, id);

    String slug = slugify(name);

    validateSlug(slug, id);

    DanhMuc parent = null;

    if (request.getDanhMucChaId() != null) {

      parent = requireParent(request.getDanhMucChaId());

      validateNoCycle(category, parent);
    }

    danhMucMapper.updateEntity(request, category);

    category.setTenDanhMuc(name);
    category.setDuongDanUrl(slug);
    category.setDanhMucCha(parent);

    category = danhMucRepository.save(category);

    return danhMucMapper.toResponse(category);
  }

  @Transactional
  public AdminCategoryStatusResponse softDelete(Long id) {

    DanhMuc category = requireCategory(id);

    if (category.getTrangThai() == TrangThaiCoBanEnum.NGUNG_HOAT_DONG) {

      throw new AppException(ErrorCode.CONFLICT, "Danh mục đã ngừng hoạt động");
    }

    boolean hasChildren = danhMucRepository.existsByDanhMucChaId(id);

    long productCount = sanPhamRepository.countByDanhMucId(id);

    if (hasChildren || productCount > 0) {

      throw new AppException(
          ErrorCode.CONFLICT,
          "Danh mục đang có "
              + productCount
              + " sản phẩm hoặc danh mục con trực thuộc. "
              + "Không thể xóa. Vui lòng chuyển dữ liệu "
              + "sang danh mục khác hoặc cập nhật trạng thái "
              + "sang ngừng hoạt động.");
    }

    category.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);

    category = danhMucRepository.save(category);

    return danhMucMapper.toStatusResponse(category);
  }

  private DanhMuc requireCategory(Long id) {

    return danhMucRepository
        .findById(id)
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy danh mục"));
  }

  private DanhMuc requireParent(Long id) {

    return danhMucRepository
        .findById(id)
        .orElseThrow(
            () -> new AppException(ErrorCode.UNPROCESSABLE_ENTITY, "Danh mục cha không hợp lệ"));
  }

  private void validateName(String name, Long currentId) {

    boolean exists =
        currentId == null
            ? danhMucRepository.existsByTenDanhMucIgnoreCase(name)
            : danhMucRepository.existsByTenDanhMucIgnoreCaseAndIdNot(name, currentId);

    if (exists) {
      throw new AppException(ErrorCode.CONFLICT, "Tên danh mục đã được sử dụng");
    }
  }

  private void validateSlug(String slug, Long currentId) {

    if (slug.isBlank()) {
      throw new AppException(ErrorCode.INVALID_DATA, "Không thể tạo đường dẫn URL từ tên danh mục");
    }

    boolean exists =
        currentId == null
            ? danhMucRepository.existsByDuongDanUrl(slug)
            : danhMucRepository.existsByDuongDanUrlAndIdNot(slug, currentId);

    if (exists) {
      throw new AppException(ErrorCode.CONFLICT, "Đường dẫn URL đã được sử dụng");
    }
  }

  private void validateNoCycle(DanhMuc category, DanhMuc candidateParent) {

    Set<Long> visited = new HashSet<>();

    DanhMuc current = candidateParent;

    while (current != null) {

      if (Objects.equals(current.getId(), category.getId())) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Không thể chọn chính danh mục này "
                + "hoặc danh mục con của nó "
                + "làm danh mục cha");
      }

      if (!visited.add(current.getId())) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Cấu trúc danh mục hiện tại có vòng lặp");
      }

      current = current.getDanhMucCha();
    }
  }

  private TrangThaiCoBanEnum parseTrangThai(Short value) {

    if (value == null) {
      return null;
    }

    try {
      return TrangThaiCoBanEnum.fromValue(value);

    } catch (IllegalArgumentException exception) {

      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái danh mục không hợp lệ");
    }
  }

  private Map<Long, Long> getProductCountMap(List<Long> ids) {

    if (ids.isEmpty()) {
      return Map.of();
    }

    return danhMucRepository.countProductsByCategoryIds(ids).stream()
        .collect(
            Collectors.toMap(
                DanhMucRepository.ProductCountProjection::getDanhMucId,
                DanhMucRepository.ProductCountProjection::getSoLuongSanPham));
  }

  private String slugify(String input) {

    String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);

    String slug =
        normalized
            .replaceAll("\\p{M}", "")
            .replace('đ', 'd')
            .replace('Đ', 'D')
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");

    return slug;
  }
}
