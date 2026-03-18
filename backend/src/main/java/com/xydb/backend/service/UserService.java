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
        if(principal == null) return Optional.empty();
        if(principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken){
            Object p = ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
            if(p instanceof User){
                User u = (User) p;
                return userRepository.findById(u.getId());
            }
        }
        return Optional.empty();
    }
}
