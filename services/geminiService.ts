import { GoogleGenAI } from "@google/genai";
import { ModelType } from "../types";

// Initialize the Gemini AI client
// Note: process.env.API_KEY is automatically injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates text content using the specified Gemini model.
 * 
 * @param prompt The user's input prompt.
 * @param model The model to use (default: Gemini 2.5 Flash).
 * @returns The generated text response.
 */
export const generateResponse = async (
  prompt: string,
  model: ModelType = ModelType.FLASH
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    // Direct access to text property as per SDK guidelines
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate response from Gemini.");
  }
};

/**
 * Checks if the API key is available (mostly for UI state, though env var is guaranteed in this context).
 */
export const isApiKeyAvailable = (): boolean => {
  return !!process.env.API_KEY;
};