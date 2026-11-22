package com.example.dantruventu.Initializer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class DataInitializerTest {
  private final VaiTroRepository roles = mock(VaiTroRepository.class);
  private final NguoiDungRepository users = mock(NguoiDungRepository.class);
  private final PasswordEncoder encoder = mock(PasswordEncoder.class);
  private final DataInitializer initializer = new DataInitializer(roles, users, encoder);

  @Test
  void newAdminUsesTheDeploymentPassword() {
    ReflectionTestUtils.setField(initializer, "bootstrapAdminPassword", "deployment-only-password");
    when(roles.findByTenVaiTro(any())).thenReturn(Optional.of(new VaiTro()));
    when(users.findByEmail("admin@gmail.com")).thenReturn(Optional.empty());
    when(encoder.encode("deployment-only-password")).thenReturn("encoded-password");

    initializer.run();

    var saved = ArgumentCaptor.forClass(NguoiDung.class);
    verify(users).save(saved.capture());
    assertEquals("encoded-password", saved.getValue().getMatKhau());
    verify(encoder).encode("deployment-only-password");
    verifyNoMoreInteractions(encoder);
  }

  @Test
  void existingAdminKeepsItsPassword() {
    when(roles.findByTenVaiTro(any())).thenReturn(Optional.of(new VaiTro()));
    when(users.findByEmail("admin@gmail.com")).thenReturn(Optional.of(new NguoiDung()));

    initializer.run();

    verify(users, never()).save(any());
    verifyNoInteractions(encoder);
  }
}
