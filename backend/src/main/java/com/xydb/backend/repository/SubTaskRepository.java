package com.xydb.backend.repository;

import com.xydb.backend.model.SubTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface SubTaskRepository extends JpaRepository<SubTask, Long> {
    List<SubTask> findByTaskId(Long taskId);

    @Modifying
    @Transactional
    void deleteByTaskId(Long taskId);
}
