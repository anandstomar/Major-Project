package com.company.indexer.config;


import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.apache.http.HttpHost;

@Configuration
public class ElasticConfig {

    @Value("${opensearch.host:localhost}")
    private String osHost;

    @Value("${opensearch.port:9200}")
    private int osPort;

    @Bean(destroyMethod = "close")
    public RestHighLevelClient restHighLevelClient() {
        RestClientBuilder builder = RestClient.builder(new HttpHost(osHost, osPort, "http"));
        return new RestHighLevelClient(builder);
    }
}

