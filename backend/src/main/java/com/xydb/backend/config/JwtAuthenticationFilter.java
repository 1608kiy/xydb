package com.xydb.backend.config;

import com.xydb.backend.model.User;
import com.xydb.backend.repository.UserRepository;
import com.xydb.backend.util.JWTUtil;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JWTUtil jwtUtil;
    private final UserRepository userRepository;
    private final Environment env;

    public JwtAuthenticationFilter(JWTUtil jwtUtil, UserRepository userRepository, Environment env) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.env = env;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            // Dev/demo tokens start with 'dev-': allow them for local/dev testing by mapping to a demo user
            if (token.startsWith("dev-")) {
                try {
                    // Only allow dev tokens when running in 'local' profile OR always for developer convenience
                    // (You may restrict with env.acceptsProfiles(Profiles.of("local")) )
                    String devEmail = "dev@example.test";
                    Optional<User> userOpt = userRepository.findByEmail(devEmail);
                    User user;
                    if (userOpt.isPresent()) {
                        user = userOpt.get();
                    } else {
                        user = new User();
                        user.setEmail(devEmail);
                        user.setNickname("DevUser");
                        user.setCreatedAt(java.time.LocalDateTime.now());
                        user = userRepository.save(user);
                    }
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, null);
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                } catch (Exception e) {
                    // ignore and continue without authentication
                }
            } else if (jwtUtil.validate(token)) {
                String email = jwtUtil.getSubject(token);
                Optional<User> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, null);
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
