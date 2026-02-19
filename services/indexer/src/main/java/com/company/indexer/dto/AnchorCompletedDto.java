package com.company.indexer.dto;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AnchorCompletedDto {

    @JsonProperty("request_id")
    public String request_id;

    @JsonProperty("merkle_root")
    public String merkle_root;

    @JsonProperty("tx_hash")
    public String tx_hash;

    @JsonProperty("block_number")   
    public Long block_number;

    @JsonProperty("submitted_at")
    public String submitted_at;

    @JsonProperty("submitter")
    public String submitter;

    @JsonProperty("status")
    public String status;

    @JsonProperty("preview_ids")
    public List<String> preview_ids;

    @JsonProperty("events")
    public List<String> events;

    // default constructor, getters/setters optional since Jackson can set public fields
}
