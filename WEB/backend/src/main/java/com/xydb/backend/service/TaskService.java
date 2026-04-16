package com.xydb.backend.service;

import com.xydb.backend.model.SubTask;
import com.xydb.backend.model.Task;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.SubTaskRepository;
import com.xydb.backend.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TaskService {
    private final TaskRepository taskRepository;
    private final SubTaskRepository subTaskRepository;

    public TaskService(TaskRepository taskRepository, SubTaskRepository subTaskRepository) {
        this.taskRepository = taskRepository;
        this.subTaskRepository = subTaskRepository;
    }

    public List<Task> listByUser(User user){
        return taskRepository.findByUser(user).stream()
                .map(this::buildTaskResponse)
                .toList();
    }

    public Task create(Task t){
        return create(t, t == null ? null : t.getSubtasks());
    }

    public Task create(Task t, List<SubTask> subtasks){
        LocalDateTime now = LocalDateTime.now();
        t.setCreatedAt(now);
        t.setUpdatedAt(now);
        Task saved = taskRepository.save(t);
        replaceSubtasks(saved, subtasks);
        return buildTaskResponse(saved);
    }

    public Optional<Task> findById(Long id){
        return taskRepository.findById(id);
    }

    public Optional<Task> findDetailedById(Long id){
        return taskRepository.findById(id).map(this::buildTaskResponse);
    }

    public Task update(Task exist){
        return update(exist, exist == null ? null : exist.getSubtasks());
    }

    public Task update(Task exist, List<SubTask> subtasks){
        exist.setUpdatedAt(LocalDateTime.now());
        Task saved = taskRepository.save(exist);
        replaceSubtasks(saved, subtasks);
        return buildTaskResponse(saved);
    }

    @Transactional
    public void delete(Long id){
        subTaskRepository.deleteByTaskId(id);
        taskRepository.deleteById(id);
    }

    private void replaceSubtasks(Task task, List<SubTask> subtasks) {
        if (task == null || task.getId() == null) {
            return;
        }
        if (subtasks == null) {
            return;
        }
        subTaskRepository.deleteByTaskId(task.getId());
        if (subtasks.isEmpty()) {
            return;
        }
        List<SubTask> copies = subtasks.stream()
                .filter(subTask -> subTask != null && subTask.getTitle() != null && !subTask.getTitle().trim().isEmpty())
                .map(subTask -> SubTask.builder()
                        .title(subTask.getTitle().trim())
                        .completed(Boolean.TRUE.equals(subTask.getCompleted()))
                        .task(task)
                        .build())
                .toList();
        if (!copies.isEmpty()) {
            subTaskRepository.saveAll(copies);
        }
    }

    private Task buildTaskResponse(Task source) {
        Task copy = new Task();
        copy.setId(source.getId());
        copy.setTitle(source.getTitle());
        copy.setDescription(source.getDescription());
        copy.setStatus(source.getStatus());
        copy.setPriority(source.getPriority());
        copy.setTags(source.getTags());
        copy.setDueAt(source.getDueAt());
        copy.setReminderAt(source.getReminderAt());
        copy.setPomodoroPlan(source.getPomodoroPlan());
        copy.setPomodoroDone(source.getPomodoroDone());
        copy.setListName(source.getListName());
        copy.setCreatedAt(source.getCreatedAt());
        copy.setUpdatedAt(source.getUpdatedAt());
        copy.setSubtasks(subTaskRepository.findByTaskId(source.getId()).stream()
                .map(subTask -> SubTask.builder()
                        .id(subTask.getId())
                        .title(subTask.getTitle())
                        .completed(Boolean.TRUE.equals(subTask.getCompleted()))
                        .build())
                .toList());
        return copy;
    }
}
