package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.RegisterRequest;
import com.example.dantruventu.DTO.Request.ResendOtpRequest;
import com.example.dantruventu.DTO.Request.VerifyOtpRequest;
import com.example.dantruventu.DTO.Response.RegisterResponse;
import com.example.dantruventu.DTO.Response.ResendOtpResponse;
import com.example.dantruventu.DTO.Response.VerifyOtpResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthRegistrationService {

    private static final int OTP_EXPIRE_SECONDS = 180;


    private static final int RESEND_COOLDOWN_SECONDS = 60;


    private static final int MAX_FAILED_ATTEMPTS = 5;

    private final NguoiDungRepository nguoiDungRepository;
    private final VaiTroRepository vaiTroRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    private final Map<String, PendingRegistration> pendingRegistrations =
            new ConcurrentHashMap<>();

    private final SecureRandom secureRandom = new SecureRandom();

    public RegisterResponse register(RegisterRequest request) {

        if (!request.getMatKhau().equals(request.getXacNhanMatKhau())) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        String email = request.getEmail().trim().toLowerCase();
        String soDienThoai = request.getSoDienThoai().trim();

        if (nguoiDungRepository.existsByEmail(email)
                || nguoiDungRepository.existsBySoDienThoai(soDienThoai)) {
            throw new AppException(ErrorCode.CONFLICT);
        }

        String otp = generateOtp();
        LocalDateTime now = LocalDateTime.now();

        PendingRegistration pending = new PendingRegistration(
                request.getHoTen().trim(),
                email,
                soDienThoai,
                passwordEncoder.encode(request.getMatKhau()),
                otp,
                now.plusSeconds(OTP_EXPIRE_SECONDS),
                now,
                0
        );

        sendOtp(email, otp);

        pendingRegistrations.put(email, pending);

        return RegisterResponse.builder()
                .thoiHanOtp(OTP_EXPIRE_SECONDS)
                .build();
    }

    public ResendOtpResponse resendOtp(ResendOtpRequest request) {

        PendingRegistration pending =
                findPendingRegistration(request.getTaiKhoan());

        if (pending == null) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        LocalDateTime now = LocalDateTime.now();

        if (now.isBefore(
                pending.lastSentAt.plusSeconds(RESEND_COOLDOWN_SECONDS))) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS);
        }

        String newOtp = generateOtp();

        sendOtp(pending.email, newOtp);

        pending.otp = newOtp;
        pending.expiredAt = now.plusSeconds(OTP_EXPIRE_SECONDS);
        pending.lastSentAt = now;
        pending.failedAttempts = 0;

        return ResendOtpResponse.builder()
                .taiKhoan(request.getTaiKhoan())
                .thoiHanOtpGiay(OTP_EXPIRE_SECONDS)
                .build();
    }

    public VerifyOtpResponse verifyOtp(VerifyOtpRequest request) {

        PendingRegistration pending =
                findPendingRegistration(request.getTaiKhoan());

        if (pending == null) {
            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (pending.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        if (LocalDateTime.now().isAfter(pending.expiredAt)) {
            removePendingRegistration(pending);
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (!pending.otp.equals(request.getOtpCode().trim())) {

            pending.failedAttempts++;

            if (pending.failedAttempts >= MAX_FAILED_ATTEMPTS) {
                throw new AppException(ErrorCode.FORBIDDEN);
            }

            throw new AppException(ErrorCode.INVALID_DATA);
        }

        if (nguoiDungRepository.existsByEmail(pending.email)
                || nguoiDungRepository.existsBySoDienThoai(pending.soDienThoai)) {
            removePendingRegistration(pending);
            throw new AppException(ErrorCode.CONFLICT);
        }

        VaiTro vaiTroKhachHang = vaiTroRepository
                .findByTenVaiTro("USER")
                .orElseThrow(() ->
                        new AppException(ErrorCode.INTERNAL_SERVER_ERROR));

        NguoiDung nguoiDung = NguoiDung.builder()
                .vaiTro(vaiTroKhachHang)
                .hoTen(pending.hoTen)
                .email(pending.email)
                .soDienThoai(pending.soDienThoai)
                .matKhau(pending.matKhauDaMaHoa)
                .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                .build();

        NguoiDung savedUser = nguoiDungRepository.save(nguoiDung);

        removePendingRegistration(pending);

        return VerifyOtpResponse.builder()
                .userId(savedUser.getId())
                .build();
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }

    private void sendOtp(String email, String otp) {

        try {

            SimpleMailMessage message = new SimpleMailMessage();

            message.setTo(email);
            message.setSubject("Mã OTP đăng ký Ruventu");
            message.setText(
                    "Mã OTP đăng ký tài khoản của bạn là: "
                            + otp
                            + "\nMã có hiệu lực trong "
                            + OTP_EXPIRE_SECONDS
                            + " giây."
            );

            mailSender.send(message);

        } catch (MailException exception) {
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private PendingRegistration findPendingRegistration(String taiKhoan) {

        if (taiKhoan == null) {
            return null;
        }

        String value = taiKhoan.trim();

        PendingRegistration byEmail =
                pendingRegistrations.get(value.toLowerCase());

        if (byEmail != null) {
            return byEmail;
        }

        return pendingRegistrations.values()
                .stream()
                .filter(pending ->
                        pending.soDienThoai.equals(value))
                .findFirst()
                .orElse(null);
    }

    private void removePendingRegistration(PendingRegistration pending) {
        pendingRegistrations.remove(pending.email);
    }

    private static class PendingRegistration {

        private final String hoTen;
        private final String email;
        private final String soDienThoai;
        private final String matKhauDaMaHoa;

        private String otp;
        private LocalDateTime expiredAt;
        private LocalDateTime lastSentAt;
        private int failedAttempts;

        private PendingRegistration(
                String hoTen,
                String email,
                String soDienThoai,
                String matKhauDaMaHoa,
                String otp,
                LocalDateTime expiredAt,
                LocalDateTime lastSentAt,
                int failedAttempts
        ) {
            this.hoTen = hoTen;
            this.email = email;
            this.soDienThoai = soDienThoai;
            this.matKhauDaMaHoa = matKhauDaMaHoa;
            this.otp = otp;
            this.expiredAt = expiredAt;
            this.lastSentAt = lastSentAt;
            this.failedAttempts = failedAttempts;
        }
    }
}