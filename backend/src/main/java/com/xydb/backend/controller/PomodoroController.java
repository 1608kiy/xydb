package com.xydb.backend.controller;

import com.xydb.backend.model.Task;
import com.xydb.backend.model.PomodoroSession;
import com.xydb.backend.repository.PomodoroRepository;
import com.xydb.backend.repository.TaskRepository;
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
    private final TaskRepository taskRepository;
    private final UserService userService;

    public PomodoroController(PomodoroRepository pomodoroRepository, TaskRepository taskRepository, UserService userService) {
        this.pomodoroRepository = pomodoroRepository;
        this.taskRepository = taskRepository;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Result<PomodoroSession>> create(@RequestBody PomodoroSession session){
        return userService.getCurrentUser().map(user -> {
            session.setUser(user);

            // If frontend sends task object with id, bind and verify ownership.
            if (session.getTask() != null && session.getTask().getId() != null) {
                Long taskId = session.getTask().getId();
                Task task = taskRepository.findById(taskId).orElse(null);
                if (task != null && task.getUser() != null && task.getUser().getId().equals(user.getId())) {
                    session.setTask(task);
                } else {
                    session.setTask(null);
                }
            }

            PomodoroSession s = pomodoroRepository.save(session);
            return ResponseEntity.ok(Result.ok(s));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @GetMapping
    public ResponseEntity<Result<List<PomodoroSession>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end
    ){
        return userService.getCurrentUser().map(user -> {
            if(start != null && end != null){
                return ResponseEntity.ok(Result.ok(pomodoroRepository.findByUserAndStartedAtBetween(user, start, end)));
            }
            return ResponseEntity.ok(Result.ok(pomodoroRepository.findByUser(user)));
        }).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }
}
