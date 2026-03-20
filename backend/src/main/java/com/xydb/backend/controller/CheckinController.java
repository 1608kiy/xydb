package com.xydb.backend.controller;

import com.xydb.backend.model.Checkin;
import com.xydb.backend.repository.CheckinRepository;
import com.xydb.backend.service.UserService;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/checkins")
public class CheckinController {
    private final CheckinRepository checkinRepository;
    private final UserService userService;

    public CheckinController(CheckinRepository checkinRepository, UserService userService) {
        this.checkinRepository = checkinRepository;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Result<Checkin>> checkin(@RequestBody Checkin checkin){
        return userService.getCurrentUser().map(u -> {
            checkin.setUser(u);
            checkin.setCreatedAt(java.time.LocalDateTime.now());
            Checkin c = checkinRepository.save(checkin);
            c.setUser(null);
            return ResponseEntity.ok(Result.ok(c));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @GetMapping("/calendar")
    public ResponseEntity<Result<List<Checkin>>> calendar(@RequestParam int year, @RequestParam int month){
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.plusMonths(1).minusDays(1);
        return userService.getCurrentUser().map(u -> {
            List<Checkin> list = checkinRepository.findByUserIdAndDateBetween(u.getId(), start, end);
            list.forEach(c -> c.setUser(null));
            return ResponseEntity.ok(Result.ok(list));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @GetMapping("/recent")
    public ResponseEntity<Result<List<Checkin>>> recent(){
        return userService.getCurrentUser().map(u -> {
            List<Checkin> all = checkinRepository.findByUserIdAndDateBetween(u.getId(), LocalDate.MIN, LocalDate.MAX);
            all.forEach(c -> c.setUser(null));
            return ResponseEntity.ok(Result.ok(all));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }
}
