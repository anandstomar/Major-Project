package com.company.indexer.repository;

import com.company.indexer.model.AnchorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnchorRepository extends JpaRepository<AnchorEntity, Long> {
    Optional<AnchorEntity> findByRequestId(String requestId);
}
