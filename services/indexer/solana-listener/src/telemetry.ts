import dotenv from 'dotenv';

dotenv.config();

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200';

// Define your Entity type
export interface AnchorEntity {
  requestId: string;
  merkleRoot: string;
  txHash: string;
  blockNumber?: number | null;
}

export class OpenSearchIndexer {
  
  /**
   * Indexes an anchor into OpenSearch
   */
  async index(e: AnchorEntity): Promise<void> {
    const idxUrl = `${OPENSEARCH_URL}/anchors/_doc/${e.requestId}`;
    
    // Construct the payload exactly as the Java String.format did
    const body = {
      request_id: e.requestId,
      merkle_root: e.merkleRoot,
      tx_hash: e.txHash,
      block_number: e.blockNumber ?? null
    };

    try {
      const response = await fetch(idxUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to index: ${response.statusText}`);
      }
    } catch (err) {
      console.error("OpenSearch indexing failed:", err);
      throw err;
    }
  }

  /**
   * Searches OpenSearch and formats hits for the React frontend
   */
  async search(queryTerm: string): Promise<any[]> {
    try {
      const searchUrl = `${OPENSEARCH_URL}/anchors/_search`;
      
      const body = {
        query: {
          multi_match: {
            query: queryTerm,
            fields: ["request_id", "merkle_root", "tx_hash"]
          }
        }
      };

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract and map the actual hits from OpenSearch's deeply nested response
      if (data?.hits?.hits) {
        return data.hits.hits.map((hit: any) => {
          const source = hit._source;
          return {
            ...source,
            score: hit._score,
            requestId: source.request_id // Map to frontend's expected camelCase key
          };
        });
      }

      return [];
    } catch (ex: any) {
      console.error(`OpenSearch query failed: ${ex.message}`);
      return [];
    }
  }
}

// Export a singleton instance if desired
export const openSearchIndexer = new OpenSearchIndexer();