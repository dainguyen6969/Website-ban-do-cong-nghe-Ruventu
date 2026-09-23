package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.AddCartItemRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.CartItemMutationResponse;
import com.example.dantruventu.DTO.Response.CartResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private static final String GUEST_CART_COOKIE_NAME =
            "guest_cart_id";

    private final CartService cartService;

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
                cartService.mergeGuestCart(
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
                    cartService.mergeGuestCart(
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

        return new ResponseEntity<>(
                response,
                headers,
                HttpStatus.OK
        );
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