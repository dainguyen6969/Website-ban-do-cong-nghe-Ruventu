package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.ProductDetailResponse;
import com.example.dantruventu.DTO.Response.ProductListResponse;
import com.example.dantruventu.DTO.Response.ProductVariantDetailResponse;
import com.example.dantruventu.Enum.ProductSort;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.ProductDetailProjection;
import com.example.dantruventu.Repository.ProductDetailRepository;
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
    private final ProductDetailRepository productDetailRepository;

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

    @Transactional(readOnly = true)
    public ProductDetailResponse getProductDetail(
            Long productId
    ) {

        if (productId == null || productId <= 0) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        ProductDetailProjection product =
                productDetailRepository
                        .findActiveProductDetail(productId)
                        .orElseThrow(
                                () -> new AppException(
                                        ErrorCode.NOT_FOUND
                                )
                        );

        List<ProductDetailResponse.AnhSanPhamResponse> images =
                productDetailRepository
                        .findProductImages(productId)
                        .stream()
                        .map(this::toProductImageResponse)
                        .toList();

        List<ProductDetailResponse.PhienBanResponse> variants =
                productDetailRepository
                        .findActiveProductVariants(productId)
                        .stream()
                        .map(this::toProductVariantResponse)
                        .toList();

        ProductDetailResponse.ThuongHieuResponse brand = null;

        if (product.getThuongHieuId() != null) {
            brand =
                    ProductDetailResponse
                            .ThuongHieuResponse
                            .builder()
                            .id(product.getThuongHieuId())
                            .tenThuongHieu(
                                    product.getTenThuongHieu()
                            )
                            .build();
        }

        return ProductDetailResponse.builder()
                .id(product.getId())
                .maSanPham(product.getMaSanPham())
                .tenSanPham(product.getTenSanPham())
                .danhMuc(
                        ProductDetailResponse
                                .DanhMucResponse
                                .builder()
                                .id(product.getDanhMucId())
                                .tenDanhMuc(
                                        product.getTenDanhMuc()
                                )
                                .build()
                )
                .thuongHieu(brand)
                .loaiSanPham(product.getLoaiSanPham())
                .moTa(product.getMoTa())
                .thongSoKyThuat(
                        product.getThongSoKyThuat()
                )
                .trangThai(product.getTrangThai())
                .anhSanPham(images)
                .danhSachPhienBan(variants)
                .build();
    }

    @Transactional(readOnly = true)
    public ProductVariantDetailResponse getProductVariantDetail(
            Long productId,
            Long variantId
    ) {

        if (productId == null
                || productId <= 0
                || variantId == null
                || variantId <= 0) {

            throw new AppException(ErrorCode.INVALID_DATA);
        }

        ProductDetailProjection.ProductVariantDetailProjection variant =
                productDetailRepository
                        .findActiveProductVariantDetail(
                                productId,
                                variantId
                        )
                        .orElseThrow(
                                () -> new AppException(
                                        ErrorCode.NOT_FOUND
                                )
                        );

        long actualStock =
                variant.getTonThucTe() == null
                        ? 0L
                        : variant.getTonThucTe();

        long availableStock =
                variant.getTonCoTheBan() == null
                        ? 0L
                        : variant.getTonCoTheBan();

        return ProductVariantDetailResponse.builder()
                .id(variant.getId())
                .sanPhamId(variant.getSanPhamId())
                .tenPhienBan(variant.getTenPhienBan())
                .maVach(variant.getMaVach())
                .giaBanLe(variant.getGiaBanLe())
                .khoiLuong(variant.getKhoiLuong())
                .trangThai(variant.getTrangThai())
                .tonThucTe(actualStock)
                .tonCoTheBan(availableStock)
                .conHang(availableStock > 0)
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

    private ProductDetailResponse.AnhSanPhamResponse
    toProductImageResponse(
            ProductDetailProjection.ProductImageProjection projection
    ) {

        return ProductDetailResponse
                .AnhSanPhamResponse
                .builder()
                .id(projection.getId())
                .duongDanAnh(projection.getDuongDanAnh())
                .laAnhChinh(projection.getLaAnhChinh())
                .thuTuHienThi(projection.getThuTuHienThi())
                .build();
    }

    private ProductDetailResponse.PhienBanResponse
    toProductVariantResponse(
            ProductDetailProjection.ProductVariantProjection projection
    ) {

        long stock =
                projection.getTonCoTheBan() == null
                        ? 0L
                        : projection.getTonCoTheBan();

        return ProductDetailResponse
                .PhienBanResponse
                .builder()
                .id(projection.getId())
                .tenPhienBan(projection.getTenPhienBan())
                .maVach(projection.getMaVach())
                .giaBanLe(projection.getGiaBanLe())
                .khoiLuong(projection.getKhoiLuong())
                .tonCoTheBan(stock)
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