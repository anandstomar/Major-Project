package com.company.validator.kafka;

import com.company.validator.dto.IngestEvent;
import com.company.validator.service.ValidationService;
import com.company.validator.service.BatchManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class ValidatorListener {

  private final ValidationService validationService;
  private final BatchManager batchManager;
  private final KafkaTemplate<String, String> kafkaTemplate;
  private final ObjectMapper mapper = new ObjectMapper();
  private final String validatedTopic;

  public ValidatorListener(ValidationService validationService, BatchManager batchManager,
                           KafkaTemplate<String, String> kafkaTemplate,
                           @Value("${app.validated-topic}") String validatedTopic) {
    this.validationService = validationService;
    this.batchManager = batchManager;
    this.kafkaTemplate = kafkaTemplate;
    this.validatedTopic = validatedTopic;
  }

  @KafkaListener(topics = "${app.ingest-topic}", containerFactory = "kafkaListenerContainerFactory")
  public void onMessage(String message, Acknowledgment ack) {
    try {
      IngestEvent e = mapper.readValue(message, IngestEvent.class);

      boolean ok = validationService.validate(e, System.getenv().getOrDefault("MINIO_BUCKET","ingest"));
      if (!ok) {
        System.err.println("Validation failed for " + e.event_id);
        ack.acknowledge();
        return;
      }

      // publish events.validated
      kafkaTemplate.send(validatedTopic, e.event_id, mapper.writeValueAsString(e));

      // append to batch manager
      batchManager.accept(e);

      // manual immediate commit
      ack.acknowledge();
    } catch (Exception ex) {
      ex.printStackTrace();
      // do not ack -> will be retried (consumer group)
    }
  }
}
