package com.xydb.backend.service;

import com.xydb.backend.dto.AuthRequest;
import com.xydb.backend.dto.AuthResponse;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.UserRepository;
import com.xydb.backend.util.JWTUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthService {
    public static final String ADMIN_EMAIL = "admin@xydb.local";
    private static final String ADMIN_LOGIN_IDENTIFIER = "admin";
    private static final String ADMIN_DEFAULT_PASSWORD = "admin";

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JWTUtil jwtUtil;

    public AuthService(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder, JWTUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(AuthRequest req){
        if(userRepository.findByEmail(req.getEmail()).isPresent()){
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

    public AuthResponse login(String email, String password){
        if (isAdminIdentifier(email)) {
            if (!ADMIN_DEFAULT_PASSWORD.equals(password)) {
                throw new IllegalArgumentException("Invalid credentials");
            }
            User admin = ensureAdminUser();
            String token = jwtUtil.generateToken(admin.getEmail());
            return new AuthResponse(token);
        }

        User user = userRepository.findByEmail(email).orElseThrow(()-> new IllegalArgumentException("Invalid credentials"));
        if(!passwordEncoder.matches(password, user.getPassword())){
            throw new IllegalArgumentException("Invalid credentials");
        }
        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token);
    }

    public void resetPasswordByEmail(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private boolean isAdminIdentifier(String email) {
        if (email == null) {
            return false;
        }
        String normalized = email.trim();
        return ADMIN_LOGIN_IDENTIFIER.equalsIgnoreCase(normalized)
                || ADMIN_EMAIL.equalsIgnoreCase(normalized);
    }

    private User ensureAdminUser() {
        Optional<User> maybeAdmin = userRepository.findByEmail(ADMIN_EMAIL);
        if (maybeAdmin.isPresent()) {
            User existing = maybeAdmin.get();
            if (!Boolean.TRUE.equals(existing.getAdmin())) {
                existing.setAdmin(true);
            }
            if (!passwordEncoder.matches(ADMIN_DEFAULT_PASSWORD, existing.getPassword())) {
                existing.setPassword(passwordEncoder.encode(ADMIN_DEFAULT_PASSWORD));
            }
            userRepository.save(existing);
            return existing;
        }

        User admin = User.builder()
                .nickname("系统管理员")
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode(ADMIN_DEFAULT_PASSWORD))
                .phone("admin")
                .securityPhone("admin")
                .level(99)
                .exp(0)
                .admin(true)
                .createdAt(LocalDateTime.now())
                .build();
        return userRepository.save(admin);
    }
}
