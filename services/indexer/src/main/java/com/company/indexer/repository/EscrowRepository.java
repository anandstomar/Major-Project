package com.company.indexer.repository;


import com.company.indexer.model.EscrowEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EscrowRepository extends JpaRepository<EscrowEntity, Long> {
    Optional<EscrowEntity> findByEscrowId(String escrowId);
}

