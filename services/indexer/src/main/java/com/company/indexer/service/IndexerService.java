package com.company.indexer.service;

import com.company.indexer.dto.AnchorCompletedDto;
import com.company.indexer.model.AnchorEntity;
import com.company.indexer.repository.AnchorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

import com.company.indexer.metrics.IndexerMetrics;      // your metrics component
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.Span;

@Service
public class IndexerService {
    private static final Logger log = LoggerFactory.getLogger(IndexerService.class);

    private final AnchorRepository repo;
    private final OpenSearchIndexer osIndexer;
    private final ObjectMapper mapper = new ObjectMapper();
    private final IndexerMetrics metrics;
    private final Tracer tracer;

    public IndexerService(
        AnchorRepository repo,
        OpenSearchIndexer osIndexer,
        IndexerMetrics metrics,
        Tracer tracer
    ) {
        this.repo = repo;
        this.osIndexer = osIndexer;
        this.metrics = metrics;
        this.tracer = tracer;
    }

    @Transactional
    public void process(AnchorCompletedDto dto) {
        // tracing span
        Span span = tracer.nextSpan().name("indexer.processAnchor");
        // attach useful tags/attrs
        span.tag("request_id", dto.request_id);
        if (dto.merkle_root != null) span.tag("merkle_root", dto.merkle_root);

        long start = System.nanoTime();
        try (Tracer.SpanInScope ws = tracer.withSpan(span.start())) {
            metrics.incrementReceived(); // optional counter for received messages

            // idempotency: find existing record
            Optional<AnchorEntity> existingOpt = repo.findByRequestId(dto.request_id);
            if (existingOpt.isPresent()) {
                AnchorEntity existing = existingOpt.get();

                // If nothing changed, avoid extra work
                boolean changed = hasChanged(existing, dto);
                if (!changed) {
                    log.debug("Anchor {} already processed and unchanged — skipping", dto.request_id);
                    metrics.incrementSkipped();
                    return;
                }

                // update record if status or other fields changed
                updateEntityFromDto(existing, dto);
                repo.save(existing);
                log.info("Anchor {} updated (was present).", dto.request_id);
                metrics.incrementUpdated();
            } else {
                // create new entity
                AnchorEntity e = new AnchorEntity();
                updateEntityFromDto(e, dto);
                repo.save(e);
                log.info("Anchor {} saved.", dto.request_id);
                metrics.incrementSaved();
            }

            // Best-effort: index to OpenSearch (do not fail the transaction on OS errors)
            try {
                osIndexer.index(buildAnchorEntityFromDto(dto));
                metrics.incrementIndexedSuccess();
            } catch (Exception ex) {
                log.warn("OpenSearch indexing failed for {}: {}", dto.request_id, ex.getMessage(), ex);
                metrics.incrementIndexedFailure();
                // continue — indexing is best-effort
            }

            // success metric/timing
            long durationMs = (System.nanoTime() - start) / 1_000_000;
            metrics.recordProcessingDuration(durationMs);
            span.tag("status", "ok");
        } catch (Exception ex) {
            span.tag("status", "error");
            span.tag("error", ex.getMessage() == null ? "error" : ex.getMessage());
            metrics.incrementProcessingFailure();
            log.error("Failed to process anchor {}: {}", dto.request_id, ex.getMessage(), ex);
            throw ex; // rethrow so transaction management/alerts can pick it up
        } finally {
            span.end();
        }
    }

    // ---------------------------
    // Helper methods
    // ---------------------------

    private void updateEntityFromDto(AnchorEntity e, AnchorCompletedDto dto) {
        e.setRequestId(dto.request_id);
        e.setMerkleRoot(dto.merkle_root);
        e.setTxHash(dto.tx_hash);
        e.setBlockNumber(dto.block_number != null ? String.valueOf(dto.block_number) : null);
        e.setStatus(dto.status);
        e.setSubmitter(dto.submitter);
        if (dto.submitted_at != null && !dto.submitted_at.isEmpty()) {
            e.setSubmittedAt(OffsetDateTime.parse(dto.submitted_at));
        }

        try {
            e.setEventsJson(mapper.writeValueAsString(dto.events));
        } catch (Exception ex) {
            log.warn("Failed to serialize events for {}: {}", dto.request_id, ex.getMessage());
            e.setEventsJson("[]");
        }
    }

    /**
     * Build a lightweight AnchorEntity-like object for indexing (avoid loading from DB again).
     * You can adapt to whatever osIndexer.index expects.
     */
    private AnchorEntity buildAnchorEntityFromDto(AnchorCompletedDto dto) {
        AnchorEntity e = new AnchorEntity();
        updateEntityFromDto(e, dto);
        return e;
    }

    /**
     * Decide whether to update an existing DB row based on dto changes.
     * You can extend this to compare more fields.
     */
    private boolean hasChanged(AnchorEntity existing, AnchorCompletedDto dto) {
        if (!nullSafeEquals(existing.getStatus(), dto.status)) return true;
        if (!nullSafeEquals(existing.getTxHash(), dto.tx_hash)) return true;
        if (!nullSafeEquals(existing.getMerkleRoot(), dto.merkle_root)) return true;
        if (existing.getBlockNumber() == null && dto.block_number != null) return true;
        if (existing.getBlockNumber() != null && !existing.getBlockNumber().equals(dto.block_number)) return true;
        // optionally check eventsJson changes if you want
        return false;
    }

    private boolean nullSafeEquals(Object a, Object b) {
        if (a == b) return true;
        if (a == null || b == null) return false;
        return a.equals(b);
    }
}
