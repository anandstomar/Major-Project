package com.company.validator.service;

import com.company.validator.dto.IngestEvent;
import com.company.validator.dto.Preview;
import com.company.validator.util.MerkleUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@Service
public class BatchManager {

  private final Map<String, Batch> batches = new ConcurrentHashMap<>();
  private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
  private final KafkaTemplate<String, String> kafka;
  private final MinioClient minio;
  private final ObjectMapper mapper = new ObjectMapper();

  private final int batchSize;
  private final long batchTimeMs;
  private final String minioBucket;
  private final String previewTopic;

  public BatchManager(KafkaTemplate<String, String> kafka,
                      MinioClient minio,
                      @Value("${app.batching.batch-size}") int batchSize,
                      @Value("${app.batching.batch-time-ms}") long batchTimeMs,
                      @Value("${app.minio.bucket}") String minioBucket,
                      @Value("${app.preview-topic}") String previewTopic) {
    this.kafka = kafka; 
    this.minio = minio;
    this.batchSize = batchSize; 
    this.batchTimeMs = batchTimeMs;
    this.minioBucket = minioBucket; 
    this.previewTopic = previewTopic;
  }

  public void accept(IngestEvent e) {
    Batch b = batches.computeIfAbsent(e.batch_id, k -> new Batch());
    synchronized (b) {
      b.events.add(e);
      if (b.scheduled == null) {
        b.scheduled = scheduler.schedule(() -> flush(e.batch_id), batchTimeMs, TimeUnit.MILLISECONDS);
      }
      if (b.events.size() >= batchSize) {
        b.scheduled.cancel(false);
        flush(e.batch_id);
      }
    }
  }

  private void flush(String batchId) {
    Batch b = batches.remove(batchId);
    if (b == null || b.events.isEmpty()) return;
    try {
      List<String> leaves = new ArrayList<>();
      for (IngestEvent e : b.events) {
        leaves.add(MerkleUtil.sha256Hex((e.event_id + ":" + (e.data_hash.startsWith("sha256:")? e.data_hash.substring(7): e.data_hash)).getBytes()));
      }
      String root = MerkleUtil.buildMerkleRoot(leaves);
      Preview p = new Preview();
      p.preview_id = "preview-" + UUID.randomUUID();
      p.batch_id = batchId;
      p.merkle_root = "0x" + root;
      p.leaf_count = leaves.size();
      p.events = new ArrayList<>();
      for (IngestEvent ev : b.events) p.events.add(ev.event_id);
      p.estimated_gas = Math.max(20000, 5000 * p.leaf_count);
      p.created_at = Instant.now().toString();
      p.metadata = Map.of("source","validator");

      // persist preview to MinIO
      byte[] body = mapper.writeValueAsBytes(p);
      minio.putObject(PutObjectArgs.builder().bucket(minioBucket).object("previews/" + p.preview_id + ".json")
        .stream(new java.io.ByteArrayInputStream(body), body.length, -1).build());

      // publish to kafka preview topic
      kafka.send(previewTopic, p.preview_id, mapper.writeValueAsString(p)).get(10, TimeUnit.SECONDS);
      System.out.println("Published preview " + p.preview_id + " root=" + p.merkle_root);
    } catch (Exception ex) {
      throw new RuntimeException(ex);
    }
  }

  private static class Batch {
    List<IngestEvent> events = new ArrayList<>();
    ScheduledFuture<?> scheduled;
  }
}
