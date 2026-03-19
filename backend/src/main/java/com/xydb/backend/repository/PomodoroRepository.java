package com.xydb.backend.repository;

import com.xydb.backend.model.PomodoroSession;
import com.xydb.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface PomodoroRepository extends JpaRepository<PomodoroSession, Long> {
    List<PomodoroSession> findByStartedAtBetween(LocalDateTime start, LocalDateTime end);

    List<PomodoroSession> findByUserAndStartedAtBetween(User user, LocalDateTime start, LocalDateTime end);
}
