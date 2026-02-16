import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { SearchResult } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client only if key exists (handled gracefully in UI if missing)
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/**
 * Chat with Gemini Pro (gemini-3-pro-preview)
 * Supports continuous conversation.
 */
export const createChatSession = () => {
  if (!ai) throw new Error("API Key missing");
  
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are an intelligent assistant for the Anchor Enterprise Console. You help operators debug anchor failures, explain complex Merkle proofs, and suggest SQL queries for the indexer. Keep answers concise and technical.",
    }
  });
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "No response received.";
  } catch (error) {
    console.error("Chat Error:", error);
    throw new Error("Failed to communicate with AI Assistant.");
  }
};

/**
 * Search Grounding using gemini-3-flash-preview
 * Used for the "Global Search" or specific Research queries.
 */
export const performSmartSearch = async (query: string): Promise<SearchResult> => {
  if (!ai) throw new Error("API Key missing");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No results found.";
    
    // Extract grounding chunks for sources
    const sources: Array<{ uri: string; title: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            uri: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      });
    }

    return { text, sources };
  } catch (error) {
    console.error("Smart Search Error:", error);
    return { text: "Error performing smart search.", sources: [] };
  }
};