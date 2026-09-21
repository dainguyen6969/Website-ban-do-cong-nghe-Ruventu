package com.example.dantruventu.Config;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final NguoiDungRepository nguoiDungRepository;
  private final HandlerExceptionResolver handlerExceptionResolver;

  public JwtAuthenticationFilter(
      JwtService jwtService,
      NguoiDungRepository nguoiDungRepository,
      @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver) {
    this.jwtService = jwtService;
    this.nguoiDungRepository = nguoiDungRepository;
    this.handlerExceptionResolver = handlerExceptionResolver;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    final String authHeader = request.getHeader("Authorization");

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    final String jwt = authHeader.substring(7);

    try {
      if (!jwtService.isAccessTokenValid(jwt)) {
        handlerExceptionResolver.resolveException(
            request, response, null, new AppException(ErrorCode.INVALID_DATA));
        return;
      }

      Long userId = jwtService.getUserIdFromToken(jwt);

      if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        Optional<NguoiDung> userOptional = nguoiDungRepository.findById(userId);

        if (userOptional.isPresent()) {
          NguoiDung user = userOptional.get();
          UsernamePasswordAuthenticationToken authToken =
              new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
          authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(authToken);
        } else {
          handlerExceptionResolver.resolveException(
              request, response, null, new AppException(ErrorCode.INVALID_DATA));
          return;
        }
      }
    } catch (Exception ex) {
      handlerExceptionResolver.resolveException(
          request, response, null, new AppException(ErrorCode.INVALID_DATA));
      return;
    }

    filterChain.doFilter(request, response);
  }
}
