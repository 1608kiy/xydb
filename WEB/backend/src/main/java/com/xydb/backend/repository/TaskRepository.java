package com.xydb.backend.repository;

import com.xydb.backend.model.Task;
import com.xydb.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUser(User user);

    @Modifying
    @Transactional
    void deleteByUser(User user);
}
