package com.company.indexer.kafka;

import com.company.indexer.dto.AnchorCompletedDto;
import com.company.indexer.service.IndexerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class AnchorCompletedListener {
    private final ObjectMapper mapper = new ObjectMapper();
    private final IndexerService indexerService;

    public AnchorCompletedListener(IndexerService indexerService) {
        this.indexerService = indexerService;
    }

    @KafkaListener(topics = "${app.topics.anchors-completed}", groupId = "${spring.kafka.consumer.group-id}")
    public void listen(ConsumerRecord<String, String> record) {
        try {
            AnchorCompletedDto dto = mapper.readValue(record.value(), AnchorCompletedDto.class);
            indexerService.process(dto);
        } catch (Exception e) {
            // log and continue - in production route to DLQ
            e.printStackTrace();
        }
    }
}
