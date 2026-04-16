package com.xydb.backend.controller;

import com.xydb.backend.dto.TaskAutomationRequest;
import com.xydb.backend.dto.TaskAutomationResponse;
import com.xydb.backend.model.SubTask;
import com.xydb.backend.model.Task;
import com.xydb.backend.service.SubTaskService;
import com.xydb.backend.service.TaskAutomationService;
import com.xydb.backend.service.TaskService;
import com.xydb.backend.service.UserService;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;
    private final UserService userService;
    private final SubTaskService subTaskService;
    private final TaskAutomationService taskAutomationService;

    public TaskController(TaskService taskService, UserService userService, SubTaskService subTaskService, TaskAutomationService taskAutomationService) {
        this.taskService = taskService;
        this.userService = userService;
        this.subTaskService = subTaskService;
        this.taskAutomationService = taskAutomationService;
    }

    @GetMapping
    public ResponseEntity<Result<List<Task>>> list() {
        return userService.getCurrentUser()
                .map(user -> ResponseEntity.ok(Result.ok(taskService.listByUser(user))))
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Result<Task>> getById(@PathVariable Long id) {
        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(task -> {
                    if (!isOwner(task, user.getId())) {
                        return ResponseEntity.status(403).body(Result.<Task>fail(403, "Forbidden"));
                    }
                    return ResponseEntity.ok(Result.ok(taskService.findDetailedById(id).orElse(null)));
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.<Task>fail(404, "Not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.<Task>fail(401, "Unauthorized")));
    }

    @PostMapping("/auto-create")
    public ResponseEntity<Result<TaskAutomationResponse>> autoCreate(@RequestBody TaskAutomationRequest request) {
        if (request == null || request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Result.fail(400, "Task title is required"));
        }

        return userService.getCurrentUser()
                .map(user -> {
                    Task task = new Task();
                    task.setUser(user);
                    TaskAutomationService.AutomationResult automation = taskAutomationService.automate(task, request, List.of());
                    Task saved = taskService.create(automation.task(), automation.subtasks());
                    return ResponseEntity.ok(Result.ok(toAutomationResponse(saved, automation)));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PostMapping
    public ResponseEntity<Result<Task>> create(@RequestBody Task task) {
        if (task == null || task.getTitle() == null || task.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Result.fail(400, "Task title is required"));
        }

        task.setTitle(task.getTitle().trim());

        return userService.getCurrentUser()
                .map(user -> {
                    task.setUser(user);
                    return ResponseEntity.ok(Result.ok(taskService.create(task, task.getSubtasks())));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Result<Task>> update(@PathVariable Long id, @RequestBody Task task) {
        if (task != null && task.getTitle() != null && task.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Result.fail(400, "Task title is required"));
        }

        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(existing -> {
                    if (!isOwner(existing, user.getId())) {
                        return ResponseEntity.status(403).body(Result.<Task>fail(403, "Forbidden"));
                    }

                    applyTaskPatch(existing, task);
                    Task saved = taskService.update(existing, task == null ? null : task.getSubtasks());
                    return ResponseEntity.ok(Result.ok(saved));
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.<Task>fail(404, "Not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.<Task>fail(401, "Unauthorized")));
    }

    @PostMapping("/{id}/auto-plan")
    public ResponseEntity<Result<TaskAutomationResponse>> autoPlan(@PathVariable Long id, @RequestBody(required = false) TaskAutomationRequest request) {
        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(existing -> {
                    if (!isOwner(existing, user.getId())) {
                        return ResponseEntity.status(403).body(Result.<TaskAutomationResponse>fail(403, "Forbidden"));
                    }

                    List<SubTask> currentSubtasks = subTaskService.listByTask(id);
                    TaskAutomationService.AutomationResult automation = taskAutomationService.automate(existing, request, currentSubtasks);
                    Task saved = taskService.update(automation.task(), automation.subtasks());
                    return ResponseEntity.ok(Result.ok(toAutomationResponse(saved, automation)));
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.<TaskAutomationResponse>fail(404, "Not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.<TaskAutomationResponse>fail(401, "Unauthorized")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Result<Object>> delete(@PathVariable Long id) {
        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(existing -> {
                    if (!isOwner(existing, user.getId())) {
                        return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
                    }
                    taskService.delete(id);
                    return ResponseEntity.ok(Result.ok());
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.fail(404, "Not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PutMapping("/{id}/subtasks")
    public ResponseEntity<Result<Object>> updateSubtasks(@PathVariable Long id, @RequestBody List<SubTask> subtasks) {
        return userService.getCurrentUser().map(user ->
                taskService.findById(id).map(task -> {
                    if (!isOwner(task, user.getId())) {
                        return ResponseEntity.status(403).body(Result.fail(403, "Forbidden"));
                    }
                    subTaskService.replaceSubtasks(task, subtasks);
                    return ResponseEntity.ok(Result.ok());
                }).orElseGet(() -> ResponseEntity.status(404).body(Result.fail(404, "Task not found")))
        ).orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    private boolean isOwner(Task task, Long userId) {
        Long ownerId = task == null || task.getUser() == null ? null : task.getUser().getId();
        return Objects.equals(ownerId, userId);
    }

    private void applyTaskPatch(Task existing, Task task) {
        if (task == null) {
            return;
        }
        if (task.getTitle() != null) existing.setTitle(task.getTitle().trim());
        if (task.getDescription() != null) existing.setDescription(task.getDescription());
        if (task.getStatus() != null) existing.setStatus(task.getStatus());
        if (task.getPriority() != null) existing.setPriority(task.getPriority());
        if (task.getTags() != null) existing.setTags(task.getTags());
        if (task.getDueAt() != null) existing.setDueAt(task.getDueAt());
        if (task.getReminderAt() != null) existing.setReminderAt(task.getReminderAt());
        if (task.getPomodoroPlan() != null) existing.setPomodoroPlan(task.getPomodoroPlan());
        if (task.getPomodoroDone() != null) existing.setPomodoroDone(task.getPomodoroDone());
        if (task.getListName() != null) existing.setListName(task.getListName());
    }

    private TaskAutomationResponse toAutomationResponse(Task saved, TaskAutomationService.AutomationResult automation) {
        return new TaskAutomationResponse(
                saved,
                automation.category(),
                automation.categoryLabel(),
                automation.subtasks() == null ? 0 : automation.subtasks().size(),
                automation.message()
        );
    }
}
