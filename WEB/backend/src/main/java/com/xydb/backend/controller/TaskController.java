package com.xydb.backend.controller;

import com.xydb.backend.model.Task;
import com.xydb.backend.service.UserService;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final com.xydb.backend.service.TaskService taskService;
    private final UserService userService;
    private final com.xydb.backend.service.SubTaskService subTaskService;

    public TaskController(com.xydb.backend.service.TaskService taskService, UserService userService, com.xydb.backend.service.SubTaskService subTaskService) {
        this.taskService = taskService;
        this.userService = userService;
        this.subTaskService = subTaskService;
    }

    @GetMapping
    public ResponseEntity<Result<List<Task>>> list(){
        return userService.getCurrentUser()
                .map(user -> ResponseEntity.ok(Result.ok(taskService.listByUser(user))))
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PostMapping
    public ResponseEntity<Result<Task>> create(@RequestBody Task task){
        if (task == null || task.getTitle() == null || task.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Result.fail(400, "Task title is required"));
        }

        task.setTitle(task.getTitle().trim());

        return userService.getCurrentUser()
                .map(user -> {
                    task.setUser(user);
                    Task t = taskService.create(task);
                    if (t != null) t.setUser(null);
                    return ResponseEntity.ok(Result.ok(t));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Result<Task>> update(@PathVariable Long id, @RequestBody Task task){
        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(existing -> {
                    Long ownerId = existing.getUser() == null ? null : existing.getUser().getId();
                    if (!Objects.equals(ownerId, user.getId())) {
                        return ResponseEntity.status(403).body(Result.<Task>fail(403, "Forbidden"));
                    }

                    // Only overwrite fields that are present in the incoming payload
                    if (task.getTitle() != null) existing.setTitle(task.getTitle());
                    if (task.getDescription() != null) existing.setDescription(task.getDescription());
                    if (task.getStatus() != null) existing.setStatus(task.getStatus());
                    if (task.getPriority() != null) existing.setPriority(task.getPriority());
                    if (task.getTags() != null) existing.setTags(task.getTags());
                    if (task.getDueAt() != null) existing.setDueAt(task.getDueAt());
                    if (task.getReminderAt() != null) existing.setReminderAt(task.getReminderAt());
                    if (task.getPomodoroPlan() != null) existing.setPomodoroPlan(task.getPomodoroPlan());
                    if (task.getPomodoroDone() != null) existing.setPomodoroDone(task.getPomodoroDone());
                    if (task.getListName() != null) existing.setListName(task.getListName());

                    Task saved = taskService.update(existing);
                    // avoid serializing the user entity (prevents lazy-loading / recursion issues in responses)
                    if (saved != null) saved.setUser(null);
                    return ResponseEntity.ok(Result.ok(saved));
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.<Task>fail(404, "Not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.<Task>fail(401, "Unauthorized")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Result<Object>> delete(@PathVariable Long id){
        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(existing -> {
                    Long ownerId = existing.getUser() == null ? null : existing.getUser().getId();
                    if (!Objects.equals(ownerId, user.getId())) {
                        return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
                    }
                    taskService.delete(id);
                    return ResponseEntity.ok(Result.ok());
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.fail(404, "Not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PutMapping("/{id}/subtasks")
    public ResponseEntity<Result<Object>> updateSubtasks(@PathVariable Long id, @RequestBody java.util.List<com.xydb.backend.model.SubTask> subtasks){
        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(task -> {
                    Long ownerId = task.getUser() == null ? null : task.getUser().getId();
                    if (!Objects.equals(ownerId, user.getId())) {
                        return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
                    }
                    subTaskService.replaceSubtasks(task, subtasks);
                    return ResponseEntity.ok(Result.ok());
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.fail(404, "Task not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }
}
