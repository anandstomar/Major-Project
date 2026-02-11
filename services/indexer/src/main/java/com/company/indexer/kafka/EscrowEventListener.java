package com.company.indexer.kafka;

import com.company.indexer.dto.EscrowEventDto;
import com.company.indexer.service.EscrowIndexerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class EscrowEventListener {
    private final EscrowIndexerService indexerService;
    private final ObjectMapper mapper = new ObjectMapper();

    public EscrowEventListener(EscrowIndexerService indexerService) {
        this.indexerService = indexerService;
    }

    @KafkaListener(topics = "${kafka.escrow.topic:escrow.events}", groupId = "indexer-escrow")
    public void onMessage(String payload) {
        try {
            EscrowEventDto dto = mapper.readValue(payload, EscrowEventDto.class);
            indexerService.processEvent(dto, payload);
        } catch (Exception ex) {
            // log error, optionally send to DLQ
            ex.printStackTrace();
        }
    }
}

