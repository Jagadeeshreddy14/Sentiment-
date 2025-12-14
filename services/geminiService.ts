import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, SentimentType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentiment: {
      type: Type.STRING,
      enum: [SentimentType.POSITIVE, SentimentType.NEGATIVE, SentimentType.NEUTRAL],
      description: "The overall sentiment of the input."
    },
    score: {
      type: Type.NUMBER,
      description: "Confidence score between 0.0 and 1.0."
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Key emotional words or phrases identified."
    },
    explanation: {
      type: Type.STRING,
      description: "A brief explanation of why this sentiment was chosen."
    },
    transcript: {
      type: Type.STRING,
      description: "The verbatim transcription of the spoken audio or the input text."
    },
    emergencyCategory: {
      type: Type.STRING,
      enum: ['Health', 'Safety', 'General', 'None'],
      description: "Classify negative sentiment: 'Health' for medical/injuries, 'Safety' for crime/danger/abuse, 'General' for undefined emergencies, 'None' if not urgent."
    }
  },
  required: ["sentiment", "score", "keywords", "explanation", "transcript", "emergencyCategory"]
};

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the sentiment of the following text: "${text}". Return the input text in the 'transcript' field. If sentiment is Negative, categorize if it requires 'Health' (Ambulance) or 'Safety' (Police) intervention.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const json = JSON.parse(response.text || "{}");
    return json as AnalysisResult;
  } catch (error) {
    console.error("Text analysis failed:", error);
    throw new Error("Failed to analyze text.");
  }
};

export const analyzeAudio = async (base64Audio: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType
            }
          },
          {
            text: "Transcribe audio to 'transcript'. Analyze sentiment. If Negative, classify emergencyCategory as 'Health' (medical), 'Safety' (crime/danger), or 'General'."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const json = JSON.parse(response.text || "{}");
    return json as AnalysisResult;
  } catch (error) {
    console.error("Audio analysis failed:", error);
    throw new Error("Failed to analyze audio.");
  }
};

export const analyzeBatch = async (texts: string[]): Promise<AnalysisResult[]> => {
  // Processing in parallel with a concurrency limit would be better for huge sets,
  // but for this demo, we'll map all. Note: Rate limits apply.
  // In a real app, use a queue.
  const promises = texts.map(async (text) => {
    try {
      return await analyzeText(text);
    } catch (e) {
      // Fallback for errors in batch
      return {
        sentiment: SentimentType.NEUTRAL,
        score: 0,
        keywords: [],
        explanation: "Error processing this row.",
        transcript: text,
        emergencyCategory: 'None'
      } as AnalysisResult;
    }
  });

  return Promise.all(promises);
};