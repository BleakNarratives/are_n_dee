import { GoogleGenAI } from "@google/genai";

/**
 * Initializes and returns a new GoogleGenAI client instance.
 * This ensures the API key from process.env.API_KEY is always fresh,
 * especially after a user might have selected a new key via openSelectKey().
 * @returns {GoogleGenAI} A new GoogleGenAI client instance.
 */
export const initGeminiApi = (): GoogleGenAI => {
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable is not set.");
    // In a real application, you might want to throw an error or handle this more gracefully
    // e.g., redirect to an API key configuration page.
    throw new Error("API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};
