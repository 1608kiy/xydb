package com.xydb.backend.controller;

import com.xydb.backend.dto.AuthRequest;
import com.xydb.backend.dto.AuthResponse;
import com.xydb.backend.service.AuthService;
import com.xydb.backend.util.Result;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Result<AuthResponse>> register(@Valid @RequestBody AuthRequest req){
        try{
            AuthResponse resp = authService.register(req);
            return ResponseEntity.ok(Result.ok(resp));
        }catch(Exception e){
            return ResponseEntity.badRequest().body(Result.fail(400, e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Result<AuthResponse>> login(@RequestBody AuthRequest req){
        try{
            AuthResponse resp = authService.login(req.getEmail(), req.getPassword());
            return ResponseEntity.ok(Result.ok(resp));
        }catch(Exception e){
            return ResponseEntity.status(401).body(Result.fail(401, e.getMessage()));
        }
    }
}
