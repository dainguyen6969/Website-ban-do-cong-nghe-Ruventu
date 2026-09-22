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
      writeError(response, 401, "Token không hợp lệ hoặc đã hết hạn");
      return;
    }

    Long userId = jwtService.getUserIdFromToken(token);

    NguoiDung user = nguoiDungRepository.findByIdWithVaiTro(userId).orElse(null);

    if (user == null) {
      writeError(response, 401, "Tài khoản không tồn tại");
      return;
    }

    if (user.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      writeError(response, 403, "Tài khoản đã bị khóa");
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

  private void writeError(HttpServletResponse response, int status, String message)
      throws IOException {

    SecurityContextHolder.clearContext();

    response.setStatus(status);
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");

    // Các message gọi vào đây là chuỗi cố định của ứng dụng.
    response
        .getWriter()
        .write("{\"status\":" + status + ",\"message\":\"" + message + "\",\"data\":null}");
  }
}
