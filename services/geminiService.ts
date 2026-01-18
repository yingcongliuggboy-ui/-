
import { LanguageCode, ToneType, AuditReport, AuditIssue } from "../types";

// Use OpenAI-compatible API (available in Manus environment)
// Use relative path to avoid CORS issues in browser
const API_BASE_URL = '/api/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';

export const translateTextStream = async (
  text: string,
  targetLang: LanguageCode,
  tone: ToneType,
  onChunk: (chunk: string) => void
) => {
  // Note: Manus proxy doesn't support streaming, so we'll simulate it
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
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    // Get the complete response and simulate streaming by sending it in chunks
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }
    
    // Simulate streaming by sending content in chunks
    const chunkSize = 5; // characters per chunk
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      onChunk(chunk);
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 10));
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
5. Ambiguity: Are there confusing or dual-meaning sentences?

Return a JSON object with this structure:
{
  "score": <number 0-100>,
  "summary": "<string>",
  "issues": [
    {
      "type": "<Critical|Warning|Info>",
      "category": "<Accuracy|Grammar|Safety|Style>",
      "original_segment": "<Chinese text snippet>",
      "target_segment": "<exact text from translation>",
      "suggestion": "<proposed correction>",
      "reason": "<explanation>"
    }
  ]
}`;

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Source Chinese:\n${sourceText}\n\nTarget Translation:\n${targetText}` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    
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
