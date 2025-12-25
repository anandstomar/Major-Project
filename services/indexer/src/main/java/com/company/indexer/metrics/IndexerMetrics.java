package com.company.indexer.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
public class IndexerMetrics {
    private final Counter received;
    private final Counter skipped;
    private final Counter updated;
    private final Counter saved;
    private final Counter indexedSuccess;
    private final Counter indexedFailure;
    private final Counter processingFailure;
    private final Timer processTimer;

    public IndexerMetrics(MeterRegistry registry) {
        this.received = Counter.builder("indexer_received_total").register(registry);
        this.skipped = Counter.builder("indexer_skipped_total").register(registry);
        this.updated = Counter.builder("indexer_updated_total").register(registry);
        this.saved = Counter.builder("indexer_saved_total").register(registry);
        this.indexedSuccess = Counter.builder("indexer_os_success_total").register(registry);
        this.indexedFailure = Counter.builder("indexer_os_failure_total").register(registry);
        this.processingFailure = Counter.builder("indexer_processing_failure_total").register(registry);
        this.processTimer = Timer.builder("indexer_process_duration_seconds").register(registry);
    }

    public void incrementReceived() { received.increment(); }
    public void incrementSkipped() { skipped.increment(); }
    public void incrementUpdated() { updated.increment(); }
    public void incrementSaved() { saved.increment(); }
    public void incrementIndexedSuccess() { indexedSuccess.increment(); }
    public void incrementIndexedFailure() { indexedFailure.increment(); }
    public void incrementProcessingFailure() { processingFailure.increment(); }
    public void recordProcessingDuration(long ms) { processTimer.record(ms, TimeUnit.MILLISECONDS); }
}