import { GoogleGenerativeAI } from '@google/generative-ai';
import { LanguageCode, ToneType, AuditReport } from '../types';

// Get API key from environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(API_KEY);

export const translateTextStream = async (
  text: string,
  targetLang: LanguageCode,
  tone: ToneType,
  onChunk: (chunk: string) => void
) => {
  const systemInstruction = `Role: You are a professional copywriter and localization expert native in ${targetLang}.
Task: Translate the user's Chinese text into the target language and specific country context.
Requirements:
1. PRESERVE FORMATTING: Keep all Markdown syntax, bullet points, headers, and bold text exactly as they are.
2. ADAPT TONE: Use a ${tone} tone suitable for marketing in the target country.
3. LOCALIZE: Adapt idioms, cultural references, and expressions to the target market.
4. OUTPUT ONLY: Return ONLY the translated text. No explanations, no meta-commentary.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemInstruction
    });

    const result = await model.generateContentStream(text);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      onChunk(chunkText);
    }
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const auditText = async (
  sourceText: string,
  targetText: string,
  targetLang: LanguageCode,
  tone: ToneType
): Promise<AuditReport> => {
  const systemInstruction = `Role: You are a professional translation quality auditor.
Task: Audit the translation quality from Chinese to ${targetLang}.
Requirements:
1. Check for accuracy, grammar, safety, and style issues
2. Consider the ${tone} tone requirement
3. Return a JSON object with the following structure:
{
  "score": number (0-100),
  "summary": "Brief overall assessment",
  "issues": [
    {
      "type": "Critical" | "Warning" | "Info",
      "category": "Accuracy" | "Grammar" | "Safety" | "Style",
      "original_segment": "problematic text from translation",
      "target_segment": "corresponding source text",
      "suggestion": "corrected text",
      "reason": "explanation of the issue"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks, no explanations.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemInstruction
    });

    const prompt = `Source (Chinese):\n${sourceText}\n\nTranslation (${targetLang}):\n${targetText}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let content = response.text();
    
    if (!content) {
      throw new Error('No content in API response');
    }
    
    // Remove markdown code blocks if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const report = JSON.parse(content) as AuditReport;
    
    // Post-process to add IDs and initial status
    if (report.issues) {
      report.issues = report.issues.map(issue => ({
        ...issue,
        id: Math.random().toString(36).substring(2, 11),
        status: 'pending'
      }));
    } else {
      report.issues = [];
      report.score = report.score || 0;
      report.summary = report.summary || "No issues found.";
    }

    return report;
  } catch (error) {
    console.error("Audit error:", error);
    throw error;
  }
};
