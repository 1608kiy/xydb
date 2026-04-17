package com.xydb.backend.controller;

import com.xydb.backend.dto.AuthRequest;
import com.xydb.backend.dto.AuthResponse;
import com.xydb.backend.dto.ForgotPasswordRequest;
import com.xydb.backend.service.AuthService;
import com.xydb.backend.util.Result;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Result<AuthResponse>> register(@Valid @RequestBody AuthRequest req) {
        try {
            AuthResponse resp = authService.register(req);
            return ResponseEntity.ok(Result.ok(resp));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Result.fail(400, e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Result<AuthResponse>> login(@RequestBody AuthRequest req) {
        try {
            AuthResponse resp = authService.login(req.getEmail(), req.getPassword());
            return ResponseEntity.ok(Result.ok(resp));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Result.fail(401, e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Result<Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        return ResponseEntity.status(503).body(Result.fail(503, "找回密码功能暂未开放，请联系管理员或客服处理"));
    }
}
