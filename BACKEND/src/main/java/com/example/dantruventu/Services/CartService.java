package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.AddCartItemRequest;
import com.example.dantruventu.DTO.Request.UpdateCartItemRequest;
import com.example.dantruventu.DTO.Response.CartItemMutationResponse;
import com.example.dantruventu.DTO.Response.CartResponse;
import com.example.dantruventu.Entity.AnhSanPham;
import com.example.dantruventu.Entity.GioHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.GioHangRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CartService {

    private static final String GUEST_CART_KEY_PREFIX =
            "cart:guest:";

    private final GioHangRepository gioHangRepository;
    private final PhienBanSanPhamRepository phienBanSanPhamRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${cart.guest-expiration}")
    private long guestCartExpiration;

    @Transactional(readOnly = true)
    public CartResponse getCurrentCart(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        if (nguoiDung != null) {
            return getUserCart(nguoiDung.getId());
        }

        return getGuestCart(guestCartId);
    }

    @Transactional
    public CartItemMutationResponse addItem(
            NguoiDung nguoiDung,
            String guestCartId,
            AddCartItemRequest request
    ) {

        PhienBanSanPham phienBan =
                phienBanSanPhamRepository
                        .findById(request.getPhienBanId())
                        .filter(this::isActiveVariant)
                        .orElseThrow(() ->
                                new AppException(
                                        ErrorCode.PRODUCT_VARIANT_NOT_FOUND
                                )
                        );

        int tonKhoKhaDung =
                calculateAvailableStock(phienBan);

        if (nguoiDung != null) {
            return addUserItem(
                    nguoiDung,
                    phienBan,
                    request.getSoLuong(),
                    tonKhoKhaDung
            );
        }

        if (!isValidGuestCartId(guestCartId)) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        return addGuestItem(
                guestCartId,
                phienBan,
                request.getSoLuong(),
                tonKhoKhaDung
        );
    }

    @Transactional
    public CartItemMutationResponse updateItem(
            NguoiDung nguoiDung,
            String guestCartId,
            Long cartItemId,
            UpdateCartItemRequest request
    ) {

        if (cartItemId == null || cartItemId <= 0) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }

        if (nguoiDung != null) {
            return updateUserItem(
                    nguoiDung,
                    cartItemId,
                    request.getSoLuong()
            );
        }

        if (!isValidGuestCartId(guestCartId)) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }

        return updateGuestItem(
                guestCartId,
                cartItemId,
                request.getSoLuong()
        );
    }

    @Transactional
    public CartItemMutationResponse deleteItem(
            NguoiDung nguoiDung,
            String guestCartId,
            Long cartItemId
    ) {

        if (cartItemId == null || cartItemId <= 0) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }

        if (nguoiDung != null) {
            return deleteUserItem(
                    nguoiDung,
                    cartItemId
            );
        }

        if (!isValidGuestCartId(guestCartId)) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }

        return deleteGuestItem(
                guestCartId,
                cartItemId
        );
    }

    @Transactional
    public boolean mergeGuestCart(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        if (nguoiDung == null
                || guestCartId == null
                || guestCartId.isBlank()) {

            return false;
        }

        if (!isValidGuestCartId(guestCartId)) {
            return true;
        }

        String redisKey =
                buildGuestCartKey(guestCartId);

        Map<Object, Object> redisItems =
                redisTemplate.opsForHash().entries(redisKey);

        for (Map.Entry<Object, Object> entry
                : redisItems.entrySet()) {

            try {

                Long phienBanId =
                        Long.valueOf(
                                entry.getKey().toString()
                        );

                int guestQuantity =
                        Integer.parseInt(
                                entry.getValue().toString()
                        );

                if (guestQuantity <= 0) {
                    continue;
                }

                phienBanSanPhamRepository
                        .findById(phienBanId)
                        .ifPresent(phienBan ->
                                mergeGuestItemIntoUserCart(
                                        nguoiDung,
                                        phienBan,
                                        guestQuantity
                                )
                        );

            } catch (NumberFormatException exception) {

            }
        }

        gioHangRepository.flush();
        redisTemplate.delete(redisKey);

        return true;
    }

    public String getOrCreateGuestCartId(
            String guestCartId
    ) {

        if (isValidGuestCartId(guestCartId)) {
            return guestCartId;
        }

        return UUID.randomUUID().toString();
    }

    private void mergeGuestItemIntoUserCart(
            NguoiDung nguoiDung,
            PhienBanSanPham phienBan,
            int guestQuantity
    ) {

        GioHang gioHang =
                gioHangRepository
                        .findByNguoiDungIdAndPhienBanId(
                                nguoiDung.getId(),
                                phienBan.getId()
                        )
                        .orElseGet(() ->
                                GioHang.builder()
                                        .nguoiDung(nguoiDung)
                                        .phienBan(phienBan)
                                        .soLuong(0)
                                        .build()
                        );

        int mergedQuantity =
                Math.min(
                        99,
                        gioHang.getSoLuong()
                                + guestQuantity
                );

        gioHang.setSoLuong(mergedQuantity);
        gioHangRepository.save(gioHang);
    }

    private CartItemMutationResponse addUserItem(
            NguoiDung nguoiDung,
            PhienBanSanPham phienBan,
            Integer addedQuantity,
            int tonKhoKhaDung
    ) {

        GioHang gioHang =
                gioHangRepository
                        .findByNguoiDungIdAndPhienBanId(
                                nguoiDung.getId(),
                                phienBan.getId()
                        )
                        .orElseGet(() ->
                                GioHang.builder()
                                        .nguoiDung(nguoiDung)
                                        .phienBan(phienBan)
                                        .soLuong(0)
                                        .build()
                        );

        int newQuantity =
                gioHang.getSoLuong() + addedQuantity;

        validateQuantity(
                newQuantity,
                tonKhoKhaDung
        );

        gioHang.setSoLuong(newQuantity);

        GioHang savedItem =
                gioHangRepository.save(gioHang);

        CartResponse cartResponse =
                getUserCart(nguoiDung.getId());

        return buildMutationResponse(
                savedItem.getId(),
                phienBan,
                newQuantity,
                cartResponse,
                "Thêm sản phẩm vào giỏ thành công"
        );
    }

    private CartItemMutationResponse addGuestItem(
            String guestCartId,
            PhienBanSanPham phienBan,
            Integer addedQuantity,
            int tonKhoKhaDung
    ) {

        String redisKey =
                buildGuestCartKey(guestCartId);

        String redisField =
                String.valueOf(phienBan.getId());

        Object currentValue =
                redisTemplate.opsForHash().get(
                        redisKey,
                        redisField
                );

        int currentQuantity =
                currentValue == null
                        ? 0
                        : Integer.parseInt(
                        currentValue.toString()
                );

        int newQuantity =
                currentQuantity + addedQuantity;

        validateQuantity(
                newQuantity,
                tonKhoKhaDung
        );

        redisTemplate.opsForHash().put(
                redisKey,
                redisField,
                String.valueOf(newQuantity)
        );

        refreshGuestCartExpiration(redisKey);

        CartResponse cartResponse =
                getGuestCart(guestCartId);

        return buildMutationResponse(
                phienBan.getId(),
                phienBan,
                newQuantity,
                cartResponse,
                "Thêm sản phẩm vào giỏ thành công"
        );
    }

    private CartItemMutationResponse updateUserItem(
            NguoiDung nguoiDung,
            Long cartItemId,
            Integer newQuantity
    ) {

        GioHang gioHang =
                gioHangRepository
                        .findByIdAndNguoiDungId(
                                cartItemId,
                                nguoiDung.getId()
                        )
                        .orElseThrow(() ->
                                new AppException(
                                        ErrorCode.NOT_FOUND
                                )
                        );

        PhienBanSanPham phienBan =
                gioHang.getPhienBan();

        if (!isActiveVariant(phienBan)) {
            throw new AppException(
                    ErrorCode.PRODUCT_VARIANT_NOT_FOUND
            );
        }

        int tonKhoKhaDung =
                calculateAvailableStock(phienBan);

        validateQuantity(
                newQuantity,
                tonKhoKhaDung
        );

        gioHang.setSoLuong(newQuantity);

        GioHang savedItem =
                gioHangRepository.save(gioHang);

        CartResponse cartResponse =
                getUserCart(nguoiDung.getId());

        return buildMutationResponse(
                savedItem.getId(),
                phienBan,
                newQuantity,
                cartResponse,
                "Cập nhật giỏ hàng thành công"
        );
    }

    private CartItemMutationResponse updateGuestItem(
            String guestCartId,
            Long cartItemId,
            Integer newQuantity
    ) {

        String redisKey =
                buildGuestCartKey(guestCartId);

        String redisField =
                String.valueOf(cartItemId);

        boolean itemExists =
                Boolean.TRUE.equals(
                        redisTemplate
                                .opsForHash()
                                .hasKey(
                                        redisKey,
                                        redisField
                                )
                );

        if (!itemExists) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }

        PhienBanSanPham phienBan =
                phienBanSanPhamRepository
                        .findById(cartItemId)
                        .filter(this::isActiveVariant)
                        .orElseThrow(() ->
                                new AppException(
                                        ErrorCode.PRODUCT_VARIANT_NOT_FOUND
                                )
                        );

        int tonKhoKhaDung =
                calculateAvailableStock(phienBan);

        validateQuantity(
                newQuantity,
                tonKhoKhaDung
        );

        redisTemplate.opsForHash().put(
                redisKey,
                redisField,
                String.valueOf(newQuantity)
        );

        refreshGuestCartExpiration(redisKey);

        CartResponse cartResponse =
                getGuestCart(guestCartId);

        return buildMutationResponse(
                cartItemId,
                phienBan,
                newQuantity,
                cartResponse,
                "Cập nhật giỏ hàng thành công"
        );
    }

    private CartItemMutationResponse deleteUserItem(
            NguoiDung nguoiDung,
            Long cartItemId
    ) {

        GioHang gioHang =
                gioHangRepository
                        .findByIdAndNguoiDungId(
                                cartItemId,
                                nguoiDung.getId()
                        )
                        .orElseThrow(() ->
                                new AppException(
                                        ErrorCode.NOT_FOUND
                                )
                        );

        gioHangRepository.delete(gioHang);
        gioHangRepository.flush();

        CartResponse cartResponse =
                getUserCart(nguoiDung.getId());

        return buildCartSummaryMutationResponse(
                cartResponse,
                "Xóa sản phẩm khỏi giỏ thành công"
        );
    }

    private CartItemMutationResponse deleteGuestItem(
            String guestCartId,
            Long cartItemId
    ) {

        String redisKey =
                buildGuestCartKey(guestCartId);

        String redisField =
                String.valueOf(cartItemId);

        Long deletedCount =
                redisTemplate
                        .opsForHash()
                        .delete(
                                redisKey,
                                redisField
                        );

        if (deletedCount == null
                || deletedCount == 0) {

            throw new AppException(ErrorCode.NOT_FOUND);
        }

        if (Boolean.TRUE.equals(
                redisTemplate.hasKey(redisKey)
        )) {
            refreshGuestCartExpiration(redisKey);
        }

        CartResponse cartResponse =
                getGuestCart(guestCartId);

        return buildCartSummaryMutationResponse(
                cartResponse,
                "Xóa sản phẩm khỏi giỏ thành công"
        );
    }

    private void validateQuantity(
            int quantity,
            int tonKhoKhaDung
    ) {

        if (quantity <= 0 || quantity > 99) {
            throw new AppException(
                    ErrorCode.INVALID_CART_QUANTITY
            );
        }

        if (quantity > tonKhoKhaDung) {
            throw new AppException(
                    ErrorCode.INSUFFICIENT_STOCK
            );
        }
    }

    private CartItemMutationResponse buildMutationResponse(
            Long cartItemId,
            PhienBanSanPham phienBan,
            Integer soLuong,
            CartResponse cartResponse,
            String message
    ) {

        BigDecimal donGia =
                phienBan.getGiaBanLe();

        BigDecimal thanhTien =
                donGia.multiply(
                        BigDecimal.valueOf(soLuong)
                );

        CartItemMutationResponse.CartItemData data =
                CartItemMutationResponse.CartItemData.builder()
                        .cartItemId(cartItemId)
                        .phienBanId(phienBan.getId())
                        .soLuong(soLuong)
                        .donGia(donGia)
                        .thanhTien(thanhTien)
                        .build();

        CartItemMutationResponse.CartSummary cartSummary =
                CartItemMutationResponse.CartSummary.builder()
                        .tongSoLuong(
                                cartResponse.getTongSoLuong()
                        )
                        .tamTinh(
                                cartResponse.getTamTinh()
                        )
                        .giamGia(
                                cartResponse.getGiamGia()
                        )
                        .tongTien(
                                cartResponse.getTongTien()
                        )
                        .build();

        return CartItemMutationResponse.builder()
                .status(200)
                .message(message)
                .data(data)
                .cartSummary(cartSummary)
                .build();
    }

    private CartItemMutationResponse
    buildCartSummaryMutationResponse(
            CartResponse cartResponse,
            String message
    ) {

        CartItemMutationResponse.CartSummary cartSummary =
                CartItemMutationResponse.CartSummary.builder()
                        .tongSoLuong(
                                cartResponse.getTongSoLuong()
                        )
                        .tamTinh(
                                cartResponse.getTamTinh()
                        )
                        .giamGia(
                                cartResponse.getGiamGia()
                        )
                        .tongTien(
                                cartResponse.getTongTien()
                        )
                        .build();

        return CartItemMutationResponse.builder()
                .status(200)
                .message(message)
                .cartSummary(cartSummary)
                .build();
    }

    private CartResponse getUserCart(
            Long nguoiDungId
    ) {

        List<GioHang> gioHangItems =
                gioHangRepository
                        .findByNguoiDungIdOrderByNgayCapNhatDesc(
                                nguoiDungId
                        );

        List<CartResponse.CartItemResponse> items =
                gioHangItems.stream()
                        .map(this::mapUserCartItem)
                        .toList();

        return buildCartResponse(items);
    }

    private CartResponse getGuestCart(
            String guestCartId
    ) {

        if (!isValidGuestCartId(guestCartId)) {
            return buildCartResponse(List.of());
        }

        Map<Object, Object> redisItems =
                redisTemplate.opsForHash().entries(
                        buildGuestCartKey(guestCartId)
                );

        List<CartResponse.CartItemResponse> items =
                new ArrayList<>();

        for (Map.Entry<Object, Object> entry
                : redisItems.entrySet()) {

            try {

                Long phienBanId =
                        Long.valueOf(
                                entry.getKey().toString()
                        );

                Integer soLuong =
                        Integer.valueOf(
                                entry.getValue().toString()
                        );

                phienBanSanPhamRepository
                        .findById(phienBanId)
                        .ifPresent(phienBan ->
                                items.add(
                                        mapCartItem(
                                                phienBanId,
                                                phienBan,
                                                soLuong
                                        )
                                )
                        );

            } catch (NumberFormatException exception) {

            }
        }

        return buildCartResponse(items);
    }

    private CartResponse.CartItemResponse mapUserCartItem(
            GioHang gioHang
    ) {

        return mapCartItem(
                gioHang.getId(),
                gioHang.getPhienBan(),
                gioHang.getSoLuong()
        );
    }

    private CartResponse.CartItemResponse mapCartItem(
            Long cartItemId,
            PhienBanSanPham phienBan,
            Integer soLuong
    ) {

        SanPham sanPham =
                phienBan.getSanPham();

        int tonKhoKhaDung =
                calculateAvailableStock(phienBan);

        boolean conHang =
                isActiveVariant(phienBan)
                        && tonKhoKhaDung >= soLuong;

        BigDecimal donGia =
                phienBan.getGiaBanLe();

        BigDecimal thanhTien =
                donGia.multiply(
                        BigDecimal.valueOf(soLuong)
                );

        return CartResponse.CartItemResponse.builder()
                .cartItemId(cartItemId)
                .phienBanId(phienBan.getId())
                .tenSanPham(sanPham.getTenSanPham())
                .tenPhienBan(phienBan.getTenPhienBan())
                .anh(getMainImage(sanPham))
                .donGia(donGia)
                .soLuong(soLuong)
                .thanhTien(thanhTien)
                .tonKhoKhaDung(tonKhoKhaDung)
                .conHang(conHang)
                .build();
    }

    private int calculateAvailableStock(
            PhienBanSanPham phienBan
    ) {

        if (phienBan.getDanhSachTonKho() == null) {
            return 0;
        }

        return phienBan.getDanhSachTonKho()
                .stream()
                .mapToInt(tonKho ->
                        tonKho.getTonCoTheBan() == null
                                ? 0
                                : tonKho.getTonCoTheBan()
                )
                .sum();
    }

    private boolean isActiveVariant(
            PhienBanSanPham phienBan
    ) {

        return TrangThaiCoBanEnum.HOAT_DONG.equals(
                phienBan.getTrangThai()
        )
                && TrangThaiCoBanEnum.HOAT_DONG.equals(
                phienBan.getSanPham().getTrangThai()
        );
    }

    private String getMainImage(
            SanPham sanPham
    ) {

        if (sanPham.getDanhSachAnhSanPham() == null) {
            return null;
        }

        return sanPham.getDanhSachAnhSanPham()
                .stream()
                .filter(anh ->
                        Boolean.TRUE.equals(
                                anh.getLaAnhChinh()
                        )
                )
                .min(
                        Comparator.comparing(
                                AnhSanPham::getThuTuHienThi,
                                Comparator.nullsLast(
                                        Integer::compareTo
                                )
                        )
                )
                .map(AnhSanPham::getDuongDanAnh)
                .orElse(null);
    }

    private CartResponse buildCartResponse(
            List<CartResponse.CartItemResponse> items
    ) {

        int tongSoLuong =
                items.stream()
                        .mapToInt(
                                CartResponse
                                        .CartItemResponse
                                        ::getSoLuong
                        )
                        .sum();

        BigDecimal tamTinh =
                items.stream()
                        .map(
                                CartResponse
                                        .CartItemResponse
                                        ::getThanhTien
                        )
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );

        BigDecimal giamGia =
                BigDecimal.ZERO;

        BigDecimal tongTien =
                tamTinh.subtract(giamGia);

        return CartResponse.builder()
                .items(items)
                .tongSoLuong(tongSoLuong)
                .tamTinh(tamTinh)
                .giamGia(giamGia)
                .tongTien(tongTien)
                .build();
    }

    private void refreshGuestCartExpiration(
            String redisKey
    ) {

        redisTemplate.expire(
                redisKey,
                Duration.ofMillis(guestCartExpiration)
        );
    }

    private boolean isValidGuestCartId(
            String guestCartId
    ) {

        if (guestCartId == null
                || guestCartId.isBlank()) {

            return false;
        }

        try {

            UUID.fromString(guestCartId);
            return true;

        } catch (IllegalArgumentException exception) {

            return false;
        }
    }

    private String buildGuestCartKey(
            String guestCartId
    ) {

        return GUEST_CART_KEY_PREFIX
                + guestCartId;
    }
}