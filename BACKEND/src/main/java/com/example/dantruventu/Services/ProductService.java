package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.ProductListResponse;
import com.example.dantruventu.Enum.ProductSort;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.ProductListProjection;
import com.example.dantruventu.Repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final SanPhamRepository sanPhamRepository;

    @Transactional(readOnly = true)
    public ProductListResponse getProducts(
            String keyword,
            BigDecimal giaMin,
            BigDecimal giaMax,
            Long thuongHieuId,
            Long danhMucId,
            Boolean tonKho,
            Integer page,
            Integer limit,
            String sort
    ) {

        int currentPage =
                page == null ? DEFAULT_PAGE : page;

        int currentLimit =
                limit == null ? DEFAULT_LIMIT : limit;

        validateFilters(
                giaMin,
                giaMax,
                thuongHieuId,
                danhMucId,
                currentPage,
                currentLimit
        );

        ProductSort productSort =
                ProductSort.fromValue(sort);

        String normalizedKeyword =
                normalizeKeyword(keyword);

        Pageable pageable =
                PageRequest.of(currentPage, currentLimit);

        Page<ProductListProjection> productPage =
                sanPhamRepository.findProducts(
                        normalizedKeyword,
                        giaMin,
                        giaMax,
                        thuongHieuId,
                        danhMucId,
                        tonKho,
                        productSort.getValue(),
                        pageable
                );

        List<ProductListResponse.ProductItemResponse> items =
                productPage.getContent()
                        .stream()
                        .map(this::toProductItemResponse)
                        .toList();

        return ProductListResponse.builder()
                .danhSachSanPham(items)
                .trang(productPage.getNumber())
                .gioiHan(productPage.getSize())
                .tongSoSanPham(productPage.getTotalElements())
                .tongSoTrang(productPage.getTotalPages())
                .build();
    }

    private ProductListResponse.ProductItemResponse
    toProductItemResponse(
            ProductListProjection projection
    ) {

        long stock =
                projection.getTonKhoKhaDung() == null
                        ? 0L
                        : projection.getTonKhoKhaDung();

        return ProductListResponse.ProductItemResponse.builder()
                .id(projection.getId())
                .tenSanPham(projection.getTenSanPham())
                .maSanPham(projection.getMaSanPham())
                .loaiSanPham(projection.getLoaiSanPham())
                .danhMucId(projection.getDanhMucId())
                .tenDanhMuc(projection.getTenDanhMuc())
                .thuongHieuId(projection.getThuongHieuId())
                .tenThuongHieu(
                        projection.getTenThuongHieu()
                )
                .anhChinh(projection.getAnhChinh())
                .giaThapNhat(projection.getGiaThapNhat())
                .giaCaoNhat(projection.getGiaCaoNhat())
                .tonKhoKhaDung(stock)
                .conHang(stock > 0)
                .ngayTao(projection.getNgayTao())
                .build();
    }

    private void validateFilters(
            BigDecimal giaMin,
            BigDecimal giaMax,
            Long thuongHieuId,
            Long danhMucId,
            int page,
            int limit
    ) {

        if (giaMin != null && giaMin.signum() < 0) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (giaMax != null && giaMax.signum() < 0) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (giaMin != null
                && giaMax != null
                && giaMin.compareTo(giaMax) > 0) {

            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (thuongHieuId != null && thuongHieuId <= 0) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (danhMucId != null && danhMucId <= 0) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (page < 0) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (limit <= 0 || limit > MAX_LIMIT) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }
    }

    private String normalizeKeyword(String keyword) {

        if (keyword == null || keyword.isBlank()) {
            return null;
        }

        return keyword.trim();
    }
}