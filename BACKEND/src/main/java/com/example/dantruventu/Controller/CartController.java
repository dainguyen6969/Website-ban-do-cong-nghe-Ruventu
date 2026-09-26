package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.AddCartItemRequest;
import com.example.dantruventu.DTO.Request.ApplyCartPromotionRequest;
import com.example.dantruventu.DTO.Request.UpdateCartItemRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.CartItemMutationResponse;
import com.example.dantruventu.DTO.Response.CartPromotionResponse;
import com.example.dantruventu.DTO.Response.CartResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.CartPromotionService;
import com.example.dantruventu.Services.CartService;
import jakarta.validation.Valid;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private static final String GUEST_CART_COOKIE_NAME =
            "guest_cart_id";

    private final CartService cartService;
    private final CartPromotionService cartPromotionService;

    @Value("${cart.guest-expiration}")
    private long guestCartExpiration;

    @Value("${cart.cookie.secure}")
    private boolean cartCookieSecure;

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCurrentCart(
            Authentication authentication,
            @CookieValue(
                    value = GUEST_CART_COOKIE_NAME,
                    required = false
            )
            String guestCartId
    ) {

        NguoiDung nguoiDung =
                getAuthenticatedUser(authentication);

        HttpHeaders headers =
                new HttpHeaders();

        boolean guestCartHandled =
                mergeGuestCartAndPromotion(
                        nguoiDung,
                        guestCartId
                );

        if (guestCartHandled) {
            headers.add(
                    HttpHeaders.SET_COOKIE,
                    createExpiredGuestCartCookie().toString()
            );
        }

        CartResponse data =
                cartService.getCurrentCart(
                        nguoiDung,
                        guestCartId
                );

        data =
                cartPromotionService.applyStoredPromotion(
                        nguoiDung,
                        guestCartId,
                        data
                );

        ApiResponse<CartResponse> response =
                ApiResponse.<CartResponse>builder()
                        .status(HttpStatus.OK.value())
                        .message("Lấy giỏ hàng thành công")
                        .data(data)
                        .build();

        return new ResponseEntity<>(
                response,
                headers,
                HttpStatus.OK
        );
    }

    @PostMapping("/items")
    public ResponseEntity<CartItemMutationResponse> addItem(
            Authentication authentication,
            @CookieValue(
                    value = GUEST_CART_COOKIE_NAME,
                    required = false
            )
            String guestCartId,
            @Valid @RequestBody AddCartItemRequest request
    ) {

        NguoiDung nguoiDung =
                getAuthenticatedUser(authentication);

        HttpHeaders headers =
                new HttpHeaders();

        String effectiveGuestCartId =
                guestCartId;

        if (nguoiDung != null) {

            boolean guestCartHandled =
                    mergeGuestCartAndPromotion(
                            nguoiDung,
                            guestCartId
                    );

            if (guestCartHandled) {
                headers.add(
                        HttpHeaders.SET_COOKIE,
                        createExpiredGuestCartCookie().toString()
                );
            }

        } else {

            effectiveGuestCartId =
                    cartService.getOrCreateGuestCartId(
                            guestCartId
                    );

            headers.add(
                    HttpHeaders.SET_COOKIE,
                    createGuestCartCookie(
                            effectiveGuestCartId
                    ).toString()
            );
        }

        CartItemMutationResponse response =
                cartService.addItem(
                        nguoiDung,
                        effectiveGuestCartId,
                        request
                );

        response =
                cartPromotionService.applyStoredPromotion(
                        nguoiDung,
                        effectiveGuestCartId,
                        response
                );

        return new ResponseEntity<>(
                response,
                headers,
                HttpStatus.OK
        );
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<CartItemMutationResponse> updateItem(
            Authentication authentication,
            @CookieValue(
                    value = GUEST_CART_COOKIE_NAME,
                    required = false
            )
            String guestCartId,
            @PathVariable Long id,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {

        NguoiDung nguoiDung =
                getAuthenticatedUser(authentication);

        HttpHeaders headers =
                new HttpHeaders();

        if (nguoiDung != null) {

            boolean guestCartHandled =
                    mergeGuestCartAndPromotion(
                            nguoiDung,
                            guestCartId
                    );

            if (guestCartHandled) {
                headers.add(
                        HttpHeaders.SET_COOKIE,
                        createExpiredGuestCartCookie().toString()
                );
            }
        }

        CartItemMutationResponse response =
                cartService.updateItem(
                        nguoiDung,
                        guestCartId,
                        id,
                        request
                );

        response =
                cartPromotionService.applyStoredPromotion(
                        nguoiDung,
                        guestCartId,
                        response
                );

        return new ResponseEntity<>(
                response,
                headers,
                HttpStatus.OK
        );
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<CartItemMutationResponse> deleteItem(
            Authentication authentication,
            @CookieValue(
                    value = GUEST_CART_COOKIE_NAME,
                    required = false
            )
            String guestCartId,
            @PathVariable Long id
    ) {

        NguoiDung nguoiDung =
                getAuthenticatedUser(authentication);

        HttpHeaders headers =
                new HttpHeaders();

        if (nguoiDung != null) {

            boolean guestCartHandled =
                    mergeGuestCartAndPromotion(
                            nguoiDung,
                            guestCartId
                    );

            if (guestCartHandled) {
                headers.add(
                        HttpHeaders.SET_COOKIE,
                        createExpiredGuestCartCookie().toString()
                );
            }
        }

        CartItemMutationResponse response =
                cartService.deleteItem(
                        nguoiDung,
                        guestCartId,
                        id
                );

        response =
                cartPromotionService.applyStoredPromotion(
                        nguoiDung,
                        guestCartId,
                        response
                );

        return new ResponseEntity<>(
                response,
                headers,
                HttpStatus.OK
        );
    }

    @PostMapping("/apply")
    public ResponseEntity<CartPromotionResponse> applyPromotion(
            Authentication authentication,
            @CookieValue(
                    value = GUEST_CART_COOKIE_NAME,
                    required = false
            )
            String guestCartId,
            @Valid @RequestBody
            ApplyCartPromotionRequest request
    ) {

        NguoiDung nguoiDung =
                getAuthenticatedUser(authentication);

        HttpHeaders headers =
                new HttpHeaders();

        if (nguoiDung != null) {

            boolean guestCartHandled =
                    mergeGuestCartAndPromotion(
                            nguoiDung,
                            guestCartId
                    );

            if (guestCartHandled) {
                headers.add(
                        HttpHeaders.SET_COOKIE,
                        createExpiredGuestCartCookie().toString()
                );
            }
        }

        CartPromotionResponse response =
                cartPromotionService.applyPromotion(
                        nguoiDung,
                        guestCartId,
                        request
                );

        return new ResponseEntity<>(
                response,
                headers,
                HttpStatus.OK
        );
    }

    @DeleteMapping("/promotion")
    public ResponseEntity<CartPromotionResponse> removePromotion(
            Authentication authentication,
            @CookieValue(
                    value = GUEST_CART_COOKIE_NAME,
                    required = false
            )
            String guestCartId
    ) {

        NguoiDung nguoiDung =
                getAuthenticatedUser(authentication);

        HttpHeaders headers =
                new HttpHeaders();

        if (nguoiDung != null) {

            boolean guestCartHandled =
                    mergeGuestCartAndPromotion(
                            nguoiDung,
                            guestCartId
                    );

            if (guestCartHandled) {
                headers.add(
                        HttpHeaders.SET_COOKIE,
                        createExpiredGuestCartCookie().toString()
                );
            }
        }

        CartPromotionResponse response =
                cartPromotionService.removePromotion(
                        nguoiDung,
                        guestCartId
                );

        return new ResponseEntity<>(
                response,
                headers,
                HttpStatus.OK
        );
    }

    private boolean mergeGuestCartAndPromotion(
            NguoiDung nguoiDung,
            String guestCartId
    ) {

        boolean guestCartHandled =
                cartService.mergeGuestCart(
                        nguoiDung,
                        guestCartId
                );

        if (guestCartHandled) {
            cartPromotionService.mergeGuestPromotion(
                    nguoiDung,
                    guestCartId
            );
        }

        return guestCartHandled;
    }

    private NguoiDung getAuthenticatedUser(
            Authentication authentication
    ) {

        if (authentication != null
                && authentication.getPrincipal()
                instanceof NguoiDung authenticatedUser) {

            return authenticatedUser;
        }

        return null;
    }

    private ResponseCookie createGuestCartCookie(
            String guestCartId
    ) {

        return ResponseCookie
                .from(
                        GUEST_CART_COOKIE_NAME,
                        guestCartId
                )
                .httpOnly(true)
                .secure(cartCookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(
                        Duration.ofMillis(
                                guestCartExpiration
                        )
                )
                .build();
    }

    private ResponseCookie createExpiredGuestCartCookie() {

        return ResponseCookie
                .from(
                        GUEST_CART_COOKIE_NAME,
                        ""
                )
                .httpOnly(true)
                .secure(cartCookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
    }
}