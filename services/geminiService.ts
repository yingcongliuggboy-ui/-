
import { GoogleGenAI, Type } from "@google/genai";
import { LanguageCode, ToneType, AuditReport, AuditIssue } from "../types";

// Lazy initialization to prevent app crash on load if env is missing
let aiInstance: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || "";
    if (!apiKey) {
      console.warn("API Key is missing. Please check your configuration.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const translateTextStream = async (
  text: string,
  targetLang: LanguageCode,
  tone: ToneType,
  onChunk: (chunk: string) => void
) => {
  const ai = getAiClient();
  const model = "gemini-3-flash-preview";
  const systemInstruction = `Role: You are a professional copywriter and localization expert native in ${targetLang}.
Task: Translate the user's Chinese text into the target language and specific country context.
Requirements:
1. PRESERVE FORMATTING: Keep all Markdown syntax, bullet points, headers, and bold text exactly as they are.
2. TONE: ${tone} marketing copy.
3. LOCALIZATION: Use idioms and spelling specific to the target country.
   - If Target is UK English: use 'colour', 'centre', 'flat', 'holiday'.
   - If Target is US English: use 'color', 'center', 'apartment', 'vacation'.
   - If Target is French or German, use appropriate formal/informal address based on tone.`;

  try {
    const streamResponse = await ai.models.generateContentStream({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    for await (const chunk of streamResponse) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const auditText = async (
  sourceText: string,
  targetText: string,
  targetLang: LanguageCode
): Promise<AuditReport> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";
  const systemInstruction = `Role: You are a strict compliance officer and linguistics expert.
Task: Compare the Source Chinese Text with the Target Translation and generate a structured audit report in JSON.
Context: The target language is ${targetLang}.

IMPORTANT: 
When identifying issues, the "target_segment" field MUST be an EXACT copy of the substring found in the Target Translation text. Do not abbreviate or change punctuation, so the system can highlight it precisely.

Checklist for evaluation:
1. Accuracy: Is the original meaning fully preserved?
2. Nuance: Is it native-sounding? Detect any "Chinglish" or awkward phrasing.
3. Safety: Are there sensitive, political, religious, or offensive words?
4. Formatting: Is the structure consistent with the source?
5. Ambiguity: Are there confusing or dual-meaning sentences?`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ 
        parts: [{ 
          text: `Source Chinese:
${sourceText}

Target Translation:
${targetText}`
        }] 
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "A score from 0 to 100 representing translation quality." },
            summary: { type: Type.STRING, description: "A concise overview of the audit findings." },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "One of: Critical, Warning, Info" },
                  category: { type: Type.STRING, description: "One of: Accuracy, Grammar, Safety, Style" },
                  original_segment: { type: Type.STRING, description: "The specific Chinese text snippet" },
                  target_segment: { type: Type.STRING, description: "The exact text substring from the translation that has the issue" },
                  suggestion: { type: Type.STRING, description: "Proposed correction" },
                  reason: { type: Type.STRING, description: "Explanation of the issue" }
                },
                required: ["type", "category", "original_segment", "target_segment", "suggestion", "reason"]
              }
            }
          },
          required: ["score", "summary", "issues"]
        }
      },
    });

    const report = JSON.parse(response.text?.trim() || "{}") as AuditReport;
    
    // Post-process to add IDs and initial status
    if (report.issues) {
      report.issues = report.issues.map(issue => ({
        ...issue,
        id: Math.random().toString(36).substring(2, 11),
        status: 'pending'
      }));
    } else {
        report.issues = [];
        report.score = 0;
        report.summary = "Failed to parse report.";
    }

    return report;
  } catch (error) {
    console.error("Audit error:", error);
    throw error;
  }
};
