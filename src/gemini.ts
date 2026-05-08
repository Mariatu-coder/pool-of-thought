import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export type JewelType = 'diamond' | 'emerald' | 'ruby' | 'sapphire' | 'amethyst' | 'topaz';

interface ThoughtAnalysis {
  jewelType: JewelType;
  relatedThoughtIds: string[];
}

export async function analyzeThought(
  content: string,
  existingThoughts: { id: string; content: string }[]
): Promise<ThoughtAnalysis> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following thought (written like a letter) and categorize it into one of these jewel types based on its mood:
    - diamond (clear, pure, objective, sharp)
    - emerald (growth, nature, calm, healing)
    - ruby (passion, love, anger, intense)
    - sapphire (wisdom, depth, sadness, truth)
    - amethyst (spiritual, mysterious, creative)
    - topaz (warmth, friendship, joy, light)

    Also, compare it with the existing thoughts provided and return the IDs of any that share a deep thematic similarity.

    New Thought: "${content}"

    Existing Thoughts:
    ${existingThoughts.map(t => `ID: ${t.id} | Content: ${t.content}`).join('\n')}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          jewelType: {
            type: Type.STRING,
            enum: ['diamond', 'emerald', 'ruby', 'sapphire', 'amethyst', 'topaz'],
          },
          relatedThoughtIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["jewelType", "relatedThoughtIds"],
      },
    },
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return {
      jewelType: data.jewelType || 'diamond',
      relatedThoughtIds: data.relatedThoughtIds || [],
    };
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { jewelType: 'diamond', relatedThoughtIds: [] };
  }
}
