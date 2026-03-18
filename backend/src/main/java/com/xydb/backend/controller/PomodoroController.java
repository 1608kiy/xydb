package com.xydb.backend.controller;

import com.xydb.backend.model.PomodoroSession;
import com.xydb.backend.repository.PomodoroRepository;
import com.xydb.backend.service.UserService;
import com.xydb.backend.util.Result;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/pomodoros")
public class PomodoroController {
    private final PomodoroRepository pomodoroRepository;
    private final UserService userService;

    public PomodoroController(PomodoroRepository pomodoroRepository, UserService userService) {
        this.pomodoroRepository = pomodoroRepository;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Result<PomodoroSession>> create(@RequestBody PomodoroSession session){
        PomodoroSession s = pomodoroRepository.save(session);
        return ResponseEntity.ok(Result.ok(s));
    }

    @GetMapping
    public ResponseEntity<Result<List<PomodoroSession>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end
    ){
        if(start != null && end != null){
            return ResponseEntity.ok(Result.ok(pomodoroRepository.findByStartedAtBetween(start, end)));
        }
        return ResponseEntity.ok(Result.ok(pomodoroRepository.findAll()));
    }
}
