package com.company.indexer.service;

import com.company.indexer.dto.AnchorCompletedDto;
import com.company.indexer.model.AnchorEntity;
import com.company.indexer.repository.AnchorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class IndexerService {
    private final AnchorRepository repo;
    private final OpenSearchIndexer osIndexer;
    private final ObjectMapper mapper = new ObjectMapper();

    public IndexerService(AnchorRepository repo, OpenSearchIndexer osIndexer) {
        this.repo = repo;
        this.osIndexer = osIndexer;
    }

    @Transactional
    public void process(AnchorCompletedDto dto) {
        // idempotent: skip if already processed
        Optional<AnchorEntity> existing = repo.findByRequestId(dto.request_id);
        if (existing.isPresent()) {
            // optionally update if status changed
            return;
        }

        AnchorEntity e = new AnchorEntity();
        e.setRequestId(dto.request_id);
        e.setMerkleRoot(dto.merkle_root);
        e.setTxHash(dto.tx_hash);
        e.setBlockNumber(dto.block_number);
        e.setStatus(dto.status);
        e.setSubmitter(dto.submitter);
        e.setSubmittedAt(OffsetDateTime.parse(dto.submitted_at));
        try {
            e.setEventsJson(mapper.writeValueAsString(dto.events));
        } catch (Exception ex) {
            e.setEventsJson("[]");
        }

        repo.save(e);

        // index to OpenSearch (best-effort)
        try {
            osIndexer.index(e);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
