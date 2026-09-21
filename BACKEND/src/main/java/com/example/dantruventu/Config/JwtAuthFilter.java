package com.example.dantruventu.Config;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final NguoiDungRepository nguoiDungRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorizationHeader =
                request.getHeader("Authorization");

        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        String accessToken =
                authorizationHeader.substring(7);

        if (!jwtService.isAccessTokenValid(accessToken)) {

            filterChain.doFilter(request, response);
            return;
        }

        try {

            Long userId =
                    jwtService.getUserIdFromToken(accessToken);

            if (SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {

                NguoiDung nguoiDung =
                        nguoiDungRepository
                                .findById(userId)
                                .orElse(null);

                if (nguoiDung != null) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    nguoiDung,
                                    null,
                                    Collections.emptyList()
                            );

                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(authentication);
                }
            }

        } catch (Exception exception) {

            filterChain.doFilter(request, response);
        }
    }
}