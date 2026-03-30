package com.xydb.backend.controller;

import com.xydb.backend.dto.AdminCreateUserRequest;
import com.xydb.backend.service.UserService;
import com.xydb.backend.model.User;
import com.xydb.backend.util.Result;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    @PostMapping("/admin/users/batch-delete")
    public ResponseEntity batchDeleteUsersForAdmin(@RequestBody Map<String, List<Long>> payload) {
        return userService.getCurrentUser().map(current -> {
            if (!userService.isAdmin(current)) {
                return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
            }

            List<Long> ids = payload == null ? null : payload.get("ids");
            if (ids == null || ids.isEmpty()) {
                return ResponseEntity.badRequest().body(Result.fail(400, "请选择至少一个用户"));
            }

            Set<Long> uniqueIds = ids.stream()
                    .filter(id -> id != null && id > 0)
                    .collect(Collectors.toSet());
            if (uniqueIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Result.fail(400, "无效的用户ID列表"));
            }

            int deleted = 0;
            int skippedAdmin = 0;
            int notFound = 0;
            List<Long> failedIds = new ArrayList<>();

            for (Long id : uniqueIds) {
                User target = userService.findById(id).orElse(null);
                if (target == null) {
                    notFound++;
                    continue;
                }
                if (userService.isAdmin(target)) {
                    skippedAdmin++;
                    continue;
                }
                boolean ok = userService.deleteUserById(id);
                if (ok) {
                    deleted++;
                } else {
                    failedIds.add(id);
                }
            }

            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("deleted", deleted);
            summary.put("skippedAdmin", skippedAdmin);
            summary.put("notFound", notFound);
            summary.put("failedIds", failedIds);
            return ResponseEntity.ok(Result.ok(summary));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PostMapping("/admin/users/create-admin")
    public ResponseEntity createAdminUser(@Valid @RequestBody AdminCreateUserRequest req) {
        return userService.getCurrentUser().map(current -> {
            if (!userService.isAdmin(current)) {
                return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
            }
            try {
                User created = userService.createAdminUser(
                        req.getNickname(),
                        req.getEmail(),
                        req.getPassword(),
                        req.getPhone());
                return ResponseEntity.ok(Result.ok(toSafeUserView(created)));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Result.fail(400, ex.getMessage()));
            } catch (Exception ex) {
                return ResponseEntity.status(500).body(Result.fail(500, "创建管理员失败"));
            }
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
        view.put("adminFlag", user.getAdmin());
        view.put("createdAt", user.getCreatedAt());
        view.put("admin", userService.isAdmin(user));
        return view;
    }
}
