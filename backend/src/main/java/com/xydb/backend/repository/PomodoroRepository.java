package com.xydb.backend.repository;

import com.xydb.backend.model.PomodoroSession;
import com.xydb.backend.model.Task;
import com.xydb.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface PomodoroRepository extends JpaRepository<PomodoroSession, Long> {
    List<PomodoroSession> findByStartedAtBetween(LocalDateTime start, LocalDateTime end);

    List<PomodoroSession> findByUser(User user);

    List<PomodoroSession> findByUserAndStartedAtBetween(User user, LocalDateTime start, LocalDateTime end);

    @Modifying
    @Transactional
    void deleteByUser(User user);

    @Modifying
    @Transactional
    void deleteByTask(Task task);
}
