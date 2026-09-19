package com.example.dantruventu.Config;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final NguoiDungRepository nguoiDungRepository;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String authorization = request.getHeader("Authorization");

    if (authorization == null || !authorization.startsWith("Bearer ")) {

      filterChain.doFilter(request, response);
      return;
    }

    String token = authorization.substring(7);

    if (!jwtService.isAccessTokenValid(token)) {

      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    Long userId = jwtService.getUserIdFromToken(token);

    NguoiDung user = nguoiDungRepository.findByIdWithVaiTro(userId).orElse(null);

    if (user == null) {

      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    if (user.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {

      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      return;
    }

    String role = user.getVaiTro().getTenVaiTro();

    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(
            user.getId(), null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));

    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

    SecurityContextHolder.getContext().setAuthentication(authentication);

    filterChain.doFilter(request, response);
  }
}
