import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.AI_API_KEY;

if (!apiKey) {
  console.warn("API_KEY is not set. Chat functionality will be limited.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const CHAT_MODEL = "gemini-3-flash-preview";

export async function generateChatResponse(messages: { role: string; content: string }[]) {
  if (!apiKey) throw new Error("API Key is missing");

  const lastMessage = messages[messages.length - 1];
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  // Using simple generateContent for now
  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: [
      ...history,
      { role: 'user', parts: [{ text: lastMessage.content }] }
    ],
    config: {
      systemInstruction: "You are a helpful, concise, and friendly AI assistant. You provide clear answers and maintain a consistent, polite tone. Use markdown for formatting when appropriate.",
    }
  });

  return response.text;
}

export async function* streamChatResponse(messages: { role: string; content: string }[]) {
  if (!apiKey) throw new Error("API Key is missing");

  const lastMessage = messages[messages.length - 1];
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const stream = await ai.models.generateContentStream({
    model: CHAT_MODEL,
    contents: [
      ...history,
      { role: 'user', parts: [{ text: lastMessage.content }] }
    ],
    config: {
      systemInstruction: "You are a helpful, concise, and friendly AI assistant. You provide clear answers and maintain a consistent, polite tone. Use markdown for formatting when appropriate.",
    }
  });

  for await (const chunk of stream) {
    yield chunk.text;
  }
}
