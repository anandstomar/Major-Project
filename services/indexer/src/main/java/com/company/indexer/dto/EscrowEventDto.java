package com.company.indexer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class EscrowEventDto {
    @JsonProperty("escrow_id")
    public String escrowId;
    public String initializer;
    public String beneficiary;
    public String arbiter;
    public Long amount;
    @JsonProperty("tx_sig")
    public String txSig;
    @JsonProperty("event_type")
    public String eventType;
    public String timestamp;
}
 
