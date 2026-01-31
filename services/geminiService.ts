import { GoogleGenAI } from "@google/genai";
import { AdMetric } from "../types";

const apiKey = process.env.API_KEY || '';

export const generateAdInsights = async (metrics: AdMetric[]): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Please configure the environment variable.";
  }

  try {
    const prompt = `
      Analyze the following ad campaign data for a SaaS company called "Writestakeover".
      Focus on efficiency: Cost per Booked Call and Cost per Showed Call.
      Provide 3 brief, high-impact bullet points on what actions should be taken to improve ROI.
      Keep the tone professional, executive, and concise.

      Data:
      ${JSON.stringify(metrics, null, 2)}
    `;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights available.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Failed to generate insights at this time.";
  }
};
