package com.xydb.backend.service;

import com.xydb.backend.dto.AuthRequest;
import com.xydb.backend.dto.AuthResponse;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.UserRepository;
import com.xydb.backend.util.JWTUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthService {
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
                .createdAt(LocalDateTime.now())
                .build();
        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token);
    }

    public AuthResponse login(String email, String password){
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
}
