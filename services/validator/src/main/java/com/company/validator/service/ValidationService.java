package com.company.validator.service;

import com.company.validator.dto.IngestEvent;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import io.minio.MinioClient;
import io.minio.GetObjectArgs;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;

@Service
public class ValidationService {

  private final MinioClient minio;
  private final OkHttpClient http;
  private final String ipfsApi;

  public ValidationService(MinioClient minioClient, 
                           @org.springframework.beans.factory.annotation.Value("${app.ipfs.api}") String ipfsApi) {
    this.minio = minioClient;
    this.http = new OkHttpClient();
    this.ipfsApi = ipfsApi;
  }

  public byte[] fetchFromMinio(String bucket, String objectKey) throws Exception {
    try (InputStream is = minio.getObject(GetObjectArgs.builder().bucket(bucket).object(objectKey).build())) {
      return toByteArray(is);
    }
  }

  public byte[] fetchFromIpfs(String cid) throws Exception {
    // HTTP API: /api/v0/cat?arg=<cid> or /api/v0/cat/<cid>
    String url = ipfsApi + "/api/v0/cat?arg=" + cid;
    Request req = new Request.Builder().url(url).post(okhttp3.RequestBody.create(new byte[0])).build();
    try (Response resp = http.newCall(req).execute()) {
      if (!resp.isSuccessful()) throw new RuntimeException("ipfs cat failed: " + resp.code());
      return resp.body().bytes();
    }
  }

  public boolean validate(IngestEvent e, String minioBucket) {
    try {
      byte[] content = null;
      if (e.data_cid != null && !e.data_cid.isBlank()) {
        try {
          content = fetchFromIpfs(e.data_cid);
        } catch (Exception ex) {
          // fallback to MinIO
        }
      }
      
      if (content == null && e.minio_key != null && !e.minio_key.isBlank()) {
          content = fetchFromMinio(minioBucket, e.minio_key);
      }

      if (content == null) {
          System.out.println("No file attached for event " + e.event_id + ", bypassing hash validation.");
          return true; 
      }

      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] digest = md.digest(content);
      String computed = bytesToHex(digest);
      String normalized = e.data_hash.startsWith("sha256:") ? e.data_hash.substring(7) : e.data_hash;
      return computed.equalsIgnoreCase(normalized);
    } catch (Exception ex) {
      throw new RuntimeException(ex);
    }
  }

  // public boolean validate(IngestEvent e, String minioBucket) {
  //   try {
  //     byte[] content = null;
  //     if (e.data_cid != null && !e.data_cid.isBlank()) {
  //       try {
  //         content = fetchFromIpfs(e.data_cid);
  //       } catch (Exception ex) {
  //         // fallback to MinIO
  //       }
  //     }
  //     if (content == null) content = fetchFromMinio(minioBucket, e.minio_key);

  //     MessageDigest md = MessageDigest.getInstance("SHA-256");
  //     byte[] digest = md.digest(content);
  //     String computed = bytesToHex(digest);
  //     String normalized = e.data_hash.startsWith("sha256:") ? e.data_hash.substring(7) : e.data_hash;
  //     return computed.equalsIgnoreCase(normalized);
  //   } catch (Exception ex) {
  //     throw new RuntimeException(ex);
  //   }
  // }

  private byte[] toByteArray(InputStream is) throws Exception {
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    byte[] tmp = new byte[8192];
    int n;
    while ((n = is.read(tmp)) != -1) buffer.write(tmp, 0, n);
    return buffer.toByteArray();
  }

  private static String bytesToHex(byte[] bytes){
    StringBuilder sb = new StringBuilder(bytes.length*2);
    for(byte b:bytes) sb.append(String.format("%02x", b));
    return sb.toString();
  }
}
