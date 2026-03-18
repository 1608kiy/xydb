package com.xydb.backend.controller;

import com.xydb.backend.service.UserService;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @SuppressWarnings("unchecked")
    @GetMapping("/me")
    public ResponseEntity me(){
        return userService.getCurrentUser()
                .map(u -> {
                    u.setPassword(null);
                    return ResponseEntity.ok(Result.ok(u));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }
}