package com.company.indexer.dto;

import java.util.List;

public class AnchorCompletedDto {
    public String request_id;
    public String merkle_root;
    public String tx_hash;
    public Long block_number;
    public String submitted_at;
    public String submitter;
    public String status;
    public List<String> preview_ids;
    public List<String> events;

    // default constructor, getters/setters optional since Jackson can set public fields
}
