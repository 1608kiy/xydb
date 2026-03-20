package com.xydb.backend.service;

import com.xydb.backend.model.User;
import com.xydb.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
            // 不允许在此处直接修改 email/password 等敏感字段
            return userRepository.save(existing);
        });
    }
}
