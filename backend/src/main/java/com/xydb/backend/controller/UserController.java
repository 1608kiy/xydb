package com.xydb.backend.controller;

import com.xydb.backend.service.UserService;
import com.xydb.backend.model.User;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity me(){
        return userService.getCurrentUser()
                .map(u -> {
                    u.setPassword(null);
                    return ResponseEntity.ok(Result.ok(u));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PutMapping("/me")
    public ResponseEntity updateCurrent(@RequestBody User user){
        return userService.updateCurrentUser(user)
                .map(u -> ResponseEntity.ok(Result.ok(u)))
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @GetMapping("/admin/users")
    public ResponseEntity listUsersForAdmin() {
        return userService.getCurrentUser().map(current -> {
            if (!userService.isAdmin(current)) {
                return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
            }
            List<Map<String, Object>> users = userService.listAllUsers().stream()
                    .map(this::toSafeUserView)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(Result.ok(users));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity deleteUserForAdmin(@PathVariable Long id) {
        return userService.getCurrentUser().map(current -> {
            if (!userService.isAdmin(current)) {
                return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
            }
            return userService.findById(id).map(target -> {
                if (userService.isAdmin(target)) {
                    return ResponseEntity.badRequest().body(Result.fail(400, "管理员账号不可删除"));
                }
                boolean deleted = userService.deleteUserById(id);
                if (!deleted) {
                    return ResponseEntity.status(404).body(Result.fail(404, "用户不存在"));
                }
                return ResponseEntity.ok(Result.ok());
            }).orElseGet(() -> ResponseEntity.status(404).body(Result.fail(404, "用户不存在")));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    private Map<String, Object> toSafeUserView(User user) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", user.getId());
        view.put("nickname", user.getNickname());
        view.put("email", user.getEmail());
        view.put("phone", user.getPhone());
        view.put("level", user.getLevel());
        view.put("exp", user.getExp());
        view.put("createdAt", user.getCreatedAt());
        view.put("admin", userService.isAdmin(user));
        return view;
    }
}
