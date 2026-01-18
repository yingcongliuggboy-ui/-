
export enum AppMode {
  TRANSLATE = 'translate',
  AUDIT = 'audit'
}

export type LanguageCode = 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'es-ES' | 'ja-JP' | 'ko-KR' | 'it-IT' | 'pt-PT' | 'nl-NL';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  flag: string;
  description: string;
}

export type ToneType = 'Professional' | 'Casual' | 'Promotional' | 'Social Media';

export type IssueStatus = 'pending' | 'fixed' | 'ignored';

export interface AuditIssue {
  id: string;
  type: 'Critical' | 'Warning' | 'Info';
  category: 'Accuracy' | 'Grammar' | 'Safety' | 'Style';
  original_segment: string;
  target_segment: string;
  suggestion: string;
  reason: string;
  status: IssueStatus;
}

export interface AuditReport {
  score: number;
  summary: string;
  issues: AuditIssue[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  text: string;           // The result text after change
  previousText: string;   // The text before the change (for diffing)
  actionDescription: string;
}
