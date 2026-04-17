package com.xydb.backend.service;

import com.xydb.backend.dto.AuthRequest;
import com.xydb.backend.dto.AuthResponse;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.UserRepository;
import com.xydb.backend.util.JWTUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JWTUtil jwtUtil;
    private final String bootstrapAdminEmail;
    private final String bootstrapAdminPassword;
    private final String bootstrapAdminNickname;
    private final String bootstrapAdminPhone;

    public AuthService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       JWTUtil jwtUtil,
                       @Value("${ringnote.bootstrap-admin.email:}") String bootstrapAdminEmail,
                       @Value("${ringnote.bootstrap-admin.password:}") String bootstrapAdminPassword,
                       @Value("${ringnote.bootstrap-admin.nickname:系统管理员}") String bootstrapAdminNickname,
                       @Value("${ringnote.bootstrap-admin.phone:}") String bootstrapAdminPhone) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.bootstrapAdminEmail = bootstrapAdminEmail == null ? "" : bootstrapAdminEmail.trim();
        this.bootstrapAdminPassword = bootstrapAdminPassword == null ? "" : bootstrapAdminPassword;
        this.bootstrapAdminNickname = bootstrapAdminNickname == null ? "系统管理员" : bootstrapAdminNickname.trim();
        this.bootstrapAdminPhone = bootstrapAdminPhone == null ? "" : bootstrapAdminPhone.trim();
    }

    public AuthResponse register(AuthRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = User.builder()
                .nickname(req.getNickname())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .phone(req.getPhone())
                .securityPhone(req.getPhone())
                .level(1)
                .exp(0)
                .admin(false)
                .createdAt(LocalDateTime.now())
                .build();
        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token);
    }

    public AuthResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initializeBootstrapAdmin() {
        if (!StringUtils.hasText(bootstrapAdminEmail) || !StringUtils.hasText(bootstrapAdminPassword)) {
            return;
        }

        Optional<User> maybeAdmin = userRepository.findByEmail(bootstrapAdminEmail);
        if (maybeAdmin.isPresent()) {
            User existing = maybeAdmin.get();
            boolean changed = false;
            if (!Boolean.TRUE.equals(existing.getAdmin())) {
                existing.setAdmin(true);
                changed = true;
            }
            if (!StringUtils.hasText(existing.getSecurityPhone()) && StringUtils.hasText(bootstrapAdminPhone)) {
                existing.setSecurityPhone(bootstrapAdminPhone);
                changed = true;
            }
            if (changed) {
                userRepository.save(existing);
            }
            return;
        }

        User admin = User.builder()
                .nickname(StringUtils.hasText(bootstrapAdminNickname) ? bootstrapAdminNickname : "系统管理员")
                .email(bootstrapAdminEmail)
                .password(passwordEncoder.encode(bootstrapAdminPassword))
                .phone(bootstrapAdminPhone)
                .securityPhone(bootstrapAdminPhone)
                .level(99)
                .exp(0)
                .admin(true)
                .createdAt(LocalDateTime.now())
                .build();
        userRepository.save(admin);
    }
}
