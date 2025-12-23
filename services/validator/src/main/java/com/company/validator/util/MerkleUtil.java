package com.company.validator.util;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class MerkleUtil {

  public static String sha256Hex(byte[] input) throws Exception {
    MessageDigest md = MessageDigest.getInstance("SHA-256");
    byte[] out = md.digest(input);
    return bytesToHex(out);
  }

  public static String leafFromEvent(String eventId, String dataHash) throws Exception {
    String normalized = dataHash.startsWith("sha256:") ? dataHash.substring(7) : dataHash;
    return sha256Hex((eventId + ":" + normalized).getBytes());
  }

  public static String buildMerkleRoot(List<String> leavesHex) throws Exception {
    if (leavesHex.isEmpty()) return "";
    List<String> layer = new ArrayList<>(leavesHex);
    while (layer.size() > 1) {
      List<String> next = new ArrayList<>();
      for (int i = 0; i < layer.size(); i += 2) {
        String left = layer.get(i);
        String right = (i + 1 < layer.size()) ? layer.get(i + 1) : layer.get(i);
        byte[] concat = hexStringToByteArray(left + right);
        next.add(sha256Hex(concat));
      }
      layer = next;
    }
    return layer.get(0);
  }

  private static String bytesToHex(byte[] bytes){
    StringBuilder sb = new StringBuilder(bytes.length*2);
    for(byte b:bytes) sb.append(String.format("%02x", b));
    return sb.toString();
  }

  private static byte[] hexStringToByteArray(String s) {
    int len = s.length();
    byte[] data = new byte[len / 2];
    for (int i = 0; i < len; i += 2) {
      data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                           + Character.digit(s.charAt(i+1), 16));
    }
    return data;
  }
}
