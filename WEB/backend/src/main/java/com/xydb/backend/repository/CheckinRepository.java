package com.xydb.backend.repository;

import com.xydb.backend.model.Checkin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface CheckinRepository extends JpaRepository<Checkin, Long> {
    List<Checkin> findByUserIdAndDateBetween(Long userId, LocalDate start, LocalDate end);

    @Modifying
    @Transactional
    void deleteByUserId(Long userId);
}
