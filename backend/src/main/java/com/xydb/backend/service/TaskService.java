package com.xydb.backend.service;

import com.xydb.backend.model.Task;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TaskService {
    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> listByUser(User user){
        return taskRepository.findByUser(user);
    }

    public Task create(Task t){
        t.setCreatedAt(LocalDateTime.now());
        return taskRepository.save(t);
    }

    public Optional<Task> findById(Long id){
        return taskRepository.findById(id);
    }

    public Task update(Task exist){
        exist.setUpdatedAt(LocalDateTime.now());
        return taskRepository.save(exist);
    }

    public void delete(Long id){
        taskRepository.deleteById(id);
    }
}
