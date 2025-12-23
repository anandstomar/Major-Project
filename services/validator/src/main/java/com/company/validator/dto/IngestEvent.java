package com.company.validator.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class IngestEvent {
  public String event_id;
  public String batch_id;
  public String type;
  public String actor;
  public String filename;
  public String minio_key;
  public String data_cid;
  public String data_hash;
  public long content_size;
  public String timestamp;
}
