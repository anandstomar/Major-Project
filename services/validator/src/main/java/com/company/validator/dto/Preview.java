package com.company.validator.dto;

import java.util.List;
import java.util.Map;

public class Preview {
  public String preview_id;
  public String batch_id;
  public String merkle_root;
  public int leaf_count;
  public List<String> events;
  public long estimated_gas;
  public String created_at;
  public Map<String, Object> metadata;
}
