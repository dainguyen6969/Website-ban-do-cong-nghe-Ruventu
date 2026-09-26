package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.ApplyCartPromotionRequest;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.CartItemMutationResponse;
import com.example.dantruventu.DTO.Response.CartPromotionResponse;
import com.example.dantruventu.DTO.Response.CartResponse;
import com.example.dantruventu.Entity.GioHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.GioHangRepository;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
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
public class CartPromotionService {

    private static final String GUEST_CART_KEY_PREFIX =
            "cart:guest:";

    private static final String USER_PROMOTION_KEY_PREFIX =
            "cart:user:";

    private static final String PROMOTION_KEY_SUFFIX =
            ":promotion";

    private final GioHangRepository gioHangRepository;
    private final StringRedisTemplate redisTemplate;
    private final SalesCalculationService salesCalculationService;
    private final SalesContext salesContext;

    @Value("${cart.guest-expiration}")
    private long cartExpiration;

    @Transactional(readOnly = true)
    public CartPromotionResponse applyPromotion(
            NguoiDung nguoiDung,
            String guestCartId,
            ApplyCartPromotionRequest request
    ) {

        List<CartLine> cartLines =
                getCartLines(
                        nguoiDung,
                        guestCartId
                );

        if (cartLines.isEmpty()) {
            throw new AppException(
                    ErrorCode.INVALID_DATA,
                    "Giỏ hàng đang trống"
            );
        }

        String promotionCode =
                request.getMaChuongTrinh().strip();

        SalesCalculationService.Plan plan;

        try {
            plan =
                    calculate(
                            cartLines,
                            promotionCode
                    );

        } catch (AppException exception) {
            throw new AppException(
                    ErrorCode.INVALID_DATA,
                    exception.getMessage()
            );
        }

        String actualPromotionCode =
                plan.promotion().getMaChuongTrinh();

        savePromotionCode(
                requirePromotionKey(
                        nguoiDung,
                        guestCartId
                ),
                actualPromotionCode
        );

        return buildPromotionResponse(
                200,
                "Áp dụng khuyến mại thành công",
                actualPromotionCode,
                plan.data().getTienChietKhau(),
                plan.data().getTongTienHang(),
                plan.data().getTongThanhToan()
        );
    }

    @Transactional(readOnly = true)
    public CartPromotionResponse removePromotion(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        String promotionKey =
                findPromotionKey(
                        nguoiDung,
                        guestCartId
                );

        String promotionCode =
                promotionKey == null
                        ? null
                        : redisTemplate
                        .opsForValue()
                        .get(promotionKey);

        if (promotionCode == null
                || promotionCode.isBlank()) {

            throw new AppException(
                    ErrorCode.NOT_FOUND,
                    "Không có mã khuyến mại đang áp dụng"
            );
        }

        List<CartLine> cartLines =
                getCartLines(
                        nguoiDung,
                        guestCartId
                );

        BigDecimal subtotal =
                BigDecimal.ZERO;

        BigDecimal total =
                BigDecimal.ZERO;

        if (!cartLines.isEmpty()) {
            SalesCalculationService.Plan plan =
                    calculate(
                            cartLines,
                            null
                    );

            subtotal =
                    plan.data().getTongTienHang();

            total =
                    plan.data().getTongThanhToan();
        }

        redisTemplate.delete(promotionKey);

        return buildPromotionResponse(
                200,
                "Đã xóa mã khuyến mại",
                null,
                BigDecimal.ZERO,
                subtotal,
                total
        );
    }

    @Transactional(readOnly = true)
    public CartResponse applyStoredPromotion(
            NguoiDung nguoiDung,
            String guestCartId,
            CartResponse response
    ) {

        if (response == null) {
            return null;
        }

        String promotionKey =
                findPromotionKey(
                        nguoiDung,
                        guestCartId
                );

        String promotionCode =
                getStoredPromotionCode(
                        promotionKey
                );

        if (promotionCode == null) {
            resetCartResponseDiscount(response);
            return response;
        }

        List<CartLine> cartLines =
                getCartLines(
                        nguoiDung,
                        guestCartId
                );

        if (cartLines.isEmpty()) {
            redisTemplate.delete(promotionKey);
            resetCartResponseDiscount(response);
            return response;
        }

        try {
            SalesCalculationService.Plan plan =
                    calculate(
                            cartLines,
                            promotionCode
                    );

            response.setTamTinh(
                    plan.data().getTongTienHang()
            );

            response.setGiamGia(
                    plan.data().getTienChietKhau()
            );

            response.setTongTien(
                    plan.data().getTongThanhToan()
            );

        } catch (AppException exception) {
            redisTemplate.delete(promotionKey);
            resetCartResponseDiscount(response);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public CartItemMutationResponse applyStoredPromotion(
            NguoiDung nguoiDung,
            String guestCartId,
            CartItemMutationResponse response
    ) {

        if (response == null
                || response.getCartSummary() == null) {

            return response;
        }

        String promotionKey =
                findPromotionKey(
                        nguoiDung,
                        guestCartId
                );

        String promotionCode =
                getStoredPromotionCode(
                        promotionKey
                );

        if (promotionCode == null) {
            resetMutationResponseDiscount(response);
            return response;
        }

        List<CartLine> cartLines =
                getCartLines(
                        nguoiDung,
                        guestCartId
                );

        if (cartLines.isEmpty()) {
            redisTemplate.delete(promotionKey);
            resetMutationResponseDiscount(response);
            return response;
        }

        try {
            SalesCalculationService.Plan plan =
                    calculate(
                            cartLines,
                            promotionCode
                    );

            response.getCartSummary().setTamTinh(
                    plan.data().getTongTienHang()
            );

            response.getCartSummary().setGiamGia(
                    plan.data().getTienChietKhau()
            );

            response.getCartSummary().setTongTien(
                    plan.data().getTongThanhToan()
            );

        } catch (AppException exception) {
            redisTemplate.delete(promotionKey);
            resetMutationResponseDiscount(response);
        }

        return response;
    }

    public void mergeGuestPromotion(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        if (nguoiDung == null
                || !isValidGuestCartId(guestCartId)) {

            return;
        }

        String guestPromotionKey =
                buildGuestCartKey(guestCartId)
                        + PROMOTION_KEY_SUFFIX;

        String promotionCode =
                redisTemplate
                        .opsForValue()
                        .get(guestPromotionKey);

        if (promotionCode == null
                || promotionCode.isBlank()) {

            return;
        }

        String userPromotionKey =
                USER_PROMOTION_KEY_PREFIX
                        + nguoiDung.getId()
                        + PROMOTION_KEY_SUFFIX;

        savePromotionCode(
                userPromotionKey,
                promotionCode
        );

        redisTemplate.delete(
                guestPromotionKey
        );
    }

    private SalesCalculationService.Plan calculate(
            List<CartLine> cartLines,
            String promotionCode
    ) {

        AdminSalesRequest.Preview previewRequest =
                buildPreviewRequest(
                        cartLines,
                        promotionCode
                );

        return salesCalculationService.calculate(
                previewRequest,
                LoaiDonHang.ONLINE,
                false
        );
    }

    private List<CartLine> getCartLines(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        if (nguoiDung != null) {
            return getUserCartLines(
                    nguoiDung.getId()
            );
        }

        if (!isValidGuestCartId(guestCartId)) {
            return List.of();
        }

        return getGuestCartLines(guestCartId);
    }

    private List<CartLine> getUserCartLines(
            Long userId
    ) {

        List<GioHang> cartItems =
                gioHangRepository
                        .findByNguoiDungIdOrderByNgayCapNhatDesc(
                                userId
                        );

        return cartItems.stream()
                .map(cartItem ->
                        new CartLine(
                                cartItem
                                        .getPhienBan()
                                        .getId(),
                                cartItem.getSoLuong()
                        )
                )
                .toList();
    }

    private List<CartLine> getGuestCartLines(
            String guestCartId
    ) {

        Map<Object, Object> redisItems =
                redisTemplate
                        .opsForHash()
                        .entries(
                                buildGuestCartKey(
                                        guestCartId
                                )
                        );

        List<CartLine> cartLines =
                new ArrayList<>();

        for (Map.Entry<Object, Object> entry
                : redisItems.entrySet()) {

            try {
                Long variantId =
                        Long.valueOf(
                                entry.getKey().toString()
                        );

                Integer quantity =
                        Integer.valueOf(
                                entry.getValue().toString()
                        );

                if (variantId > 0
                        && quantity > 0) {

                    cartLines.add(
                            new CartLine(
                                    variantId,
                                    quantity
                            )
                    );
                }

            } catch (NumberFormatException exception) {
                // Bỏ qua dữ liệu Redis không hợp lệ.
            }
        }

        return cartLines;
    }

    private AdminSalesRequest.Preview buildPreviewRequest(
            List<CartLine> cartLines,
            String promotionCode
    ) {

        AdminSalesRequest.Tax tax =
                new AdminSalesRequest.Tax();

        tax.setApDung(false);
        tax.setCheDoGia("CHUA_BAO_GOM");

        List<AdminSalesRequest.Line> products =
                cartLines.stream()
                        .map(this::toSalesLine)
                        .toList();

        AdminSalesRequest.Preview request =
                new AdminSalesRequest.Preview();

        request.setKhoHangId(
                salesContext.defaultWarehouseId()
        );

        request.setBangGia("BAN_LE");
        request.setThue(tax);
        request.setMaChuongTrinh(promotionCode);
        request.setSanPham(products);
        request.setPhiGiaoHang(BigDecimal.ZERO);
        request.setLoaiDonHang(LoaiDonHang.ONLINE);

        return request;
    }

    private AdminSalesRequest.Line toSalesLine(
            CartLine cartLine
    ) {

        AdminSalesRequest.Line line =
                new AdminSalesRequest.Line();

        line.setPhienBanId(
                cartLine.variantId()
        );

        line.setSoLuong(
                cartLine.quantity()
        );

        return line;
    }

    private CartPromotionResponse buildPromotionResponse(
            int status,
            String message,
            String promotionCode,
            BigDecimal discount,
            BigDecimal subtotal,
            BigDecimal total
    ) {

        CartPromotionResponse.PromotionData data =
                CartPromotionResponse.PromotionData.builder()
                        .maChuongTrinh(promotionCode)
                        .giamGia(discount)
                        .tamTinh(subtotal)
                        .tongTienMoi(total)
                        .build();

        return CartPromotionResponse.builder()
                .status(status)
                .message(message)
                .data(data)
                .build();
    }

    private void resetCartResponseDiscount(
            CartResponse response
    ) {

        BigDecimal subtotal =
                response.getTamTinh() == null
                        ? BigDecimal.ZERO
                        : response.getTamTinh();

        response.setGiamGia(
                BigDecimal.ZERO
        );

        response.setTongTien(
                subtotal
        );
    }

    private void resetMutationResponseDiscount(
            CartItemMutationResponse response
    ) {

        BigDecimal subtotal =
                response.getCartSummary()
                        .getTamTinh() == null
                        ? BigDecimal.ZERO
                        : response.getCartSummary()
                        .getTamTinh();

        response.getCartSummary().setGiamGia(
                BigDecimal.ZERO
        );

        response.getCartSummary().setTongTien(
                subtotal
        );
    }

    private String getStoredPromotionCode(
            String promotionKey
    ) {

        if (promotionKey == null) {
            return null;
        }

        String promotionCode =
                redisTemplate
                        .opsForValue()
                        .get(promotionKey);

        if (promotionCode == null
                || promotionCode.isBlank()) {

            return null;
        }

        return promotionCode;
    }

    private void savePromotionCode(
            String promotionKey,
            String promotionCode
    ) {

        redisTemplate
                .opsForValue()
                .set(
                        promotionKey,
                        promotionCode,
                        Duration.ofMillis(
                                cartExpiration
                        )
                );
    }

    private String requirePromotionKey(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        String promotionKey =
                findPromotionKey(
                        nguoiDung,
                        guestCartId
                );

        if (promotionKey == null) {
            throw new AppException(
                    ErrorCode.INVALID_DATA,
                    "Giỏ hàng khách không hợp lệ"
            );
        }

        return promotionKey;
    }

    private String findPromotionKey(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        if (nguoiDung != null) {
            return USER_PROMOTION_KEY_PREFIX
                    + nguoiDung.getId()
                    + PROMOTION_KEY_SUFFIX;
        }

        if (!isValidGuestCartId(guestCartId)) {
            return null;
        }

        return buildGuestCartKey(
                guestCartId
        ) + PROMOTION_KEY_SUFFIX;
    }

    private String buildGuestCartKey(
            String guestCartId
    ) {

        return GUEST_CART_KEY_PREFIX
                + guestCartId;
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

    private record CartLine(
            Long variantId,
            Integer quantity
    ) {
    }
}