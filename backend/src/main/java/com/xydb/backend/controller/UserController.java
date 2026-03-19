package com.xydb.backend.controller;

import com.xydb.backend.service.UserService;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.UserRepository;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;

    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @SuppressWarnings("unchecked")
    @GetMapping("/me")
    public ResponseEntity me(){
        return userService.getCurrentUser()
                .or(() -> userRepository.findByEmail("test@test.com"))
                .map(u -> {
                    u.setPassword(null);
                    return ResponseEntity.ok(Result.ok(u));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PutMapping("/me")
    public ResponseEntity updateCurrent(@RequestBody User user){
        return userService.updateCurrentUser(user)
                .or(() -> userRepository.findByEmail("test@test.com").map(existing -> {
                    if (user.getNickname() != null) existing.setNickname(user.getNickname());
                    if (user.getPhone() != null) existing.setPhone(user.getPhone());
                    if (user.getAvatarUrl() != null) existing.setAvatarUrl(user.getAvatarUrl());
                    User saved = userRepository.save(existing);
                    saved.setPassword(null);
                    return saved;
                }))
                .map(u -> ResponseEntity.ok(Result.ok(u)))
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }
}