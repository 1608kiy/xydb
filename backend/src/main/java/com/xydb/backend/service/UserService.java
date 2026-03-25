package com.xydb.backend.service;

import com.xydb.backend.model.User;
import com.xydb.backend.repository.CheckinRepository;
import com.xydb.backend.repository.PomodoroRepository;
import com.xydb.backend.repository.SubTaskRepository;
import com.xydb.backend.repository.TagRepository;
import com.xydb.backend.repository.TaskRepository;
import com.xydb.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final SubTaskRepository subTaskRepository;
    private final PomodoroRepository pomodoroRepository;
    private final TagRepository tagRepository;
    private final CheckinRepository checkinRepository;

    public UserService(UserRepository userRepository,
                       TaskRepository taskRepository,
                       SubTaskRepository subTaskRepository,
                       PomodoroRepository pomodoroRepository,
                       TagRepository tagRepository,
                       CheckinRepository checkinRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.subTaskRepository = subTaskRepository;
        this.pomodoroRepository = pomodoroRepository;
        this.tagRepository = tagRepository;
        this.checkinRepository = checkinRepository;
    }

    public Optional<User> getCurrentUser(){
        Object principal = SecurityContextHolder.getContext().getAuthentication();
        if(principal == null) {
            return Optional.empty();
        }
        // If there's an authentication but it's not the expected UsernamePasswordAuthenticationToken
        if(!(principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken)){
            return Optional.empty();
        }
        if(principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken){
            Object p = ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
            if(p instanceof User){
                User u = (User) p;
                return userRepository.findById(u.getId());
            }
        }
        return Optional.empty();
    }

    public Optional<User> updateCurrentUser(User incoming) {
        return getCurrentUser().map(existing -> {
            if (incoming.getNickname() != null) existing.setNickname(incoming.getNickname());
            if (incoming.getPhone() != null) existing.setPhone(incoming.getPhone());
            if (incoming.getAvatarUrl() != null) existing.setAvatarUrl(incoming.getAvatarUrl());
            if (incoming.getSecurityPhone() != null) existing.setSecurityPhone(incoming.getSecurityPhone());
            if (incoming.getPasswordUpdatedAt() != null) existing.setPasswordUpdatedAt(incoming.getPasswordUpdatedAt());
            if (incoming.getTwoStepEnabled() != null) existing.setTwoStepEnabled(incoming.getTwoStepEnabled());
            if (incoming.getWechatBound() != null) existing.setWechatBound(incoming.getWechatBound());
            if (incoming.getWechatAccount() != null) existing.setWechatAccount(incoming.getWechatAccount());
            if (incoming.getAppleBound() != null) existing.setAppleBound(incoming.getAppleBound());
            if (incoming.getAppleAccount() != null) existing.setAppleAccount(incoming.getAppleAccount());
            if (incoming.getGoogleBound() != null) existing.setGoogleBound(incoming.getGoogleBound());
            if (incoming.getGoogleAccount() != null) existing.setGoogleAccount(incoming.getGoogleAccount());
            // 不允许在此处直接修改 email/password 等敏感字段
            return userRepository.save(existing);
        });
    }

    public boolean isAdmin(User user) {
        return user != null && AuthService.ADMIN_EMAIL.equalsIgnoreCase(user.getEmail());
    }

    public List<User> listAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public boolean deleteUserById(Long id) {
        Optional<User> maybeUser = userRepository.findById(id);
        if (maybeUser.isEmpty()) {
            return false;
        }

        User user = maybeUser.get();
        // Clear dependent data first to avoid FK constraint violations.
        checkinRepository.deleteByUserId(id);
        tagRepository.deleteByUserId(id);
        pomodoroRepository.deleteByUser(user);

        List<com.xydb.backend.model.Task> tasks = taskRepository.findByUser(user);
        for (com.xydb.backend.model.Task task : tasks) {
            pomodoroRepository.deleteByTask(task);
            if (task.getId() != null) {
                subTaskRepository.deleteByTaskId(task.getId());
            }
        }
        taskRepository.deleteByUser(user);
        userRepository.delete(user);
        return true;
    }
}
