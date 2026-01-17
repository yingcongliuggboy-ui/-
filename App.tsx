
import React, { useState, useRef } from 'react';
import { AppMode, LanguageCode, ToneType, AuditReport, AuditIssue, HistoryEntry } from './types';
import { LANGUAGES, TONES, ICONS } from './constants';
import RichEditor from './components/RichEditor';
import AuditReportPanel from './components/AuditReportPanel';
import { translateTextStream, auditText } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TRANSLATE);
  const [sourceText, setSourceText] = useState<string>('# 欢迎使用 CopyFlow\n\n这是一款针对**跨境营销**设计的智能文案助手。');
  const [targetText, setTargetText] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('en-US');
  const [selectedTone, setSelectedTone] = useState<ToneType>('Professional');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // State for previewing history
  const [previewHistoryEntry, setPreviewHistoryEntry] = useState<HistoryEntry | null>(null);
  
  const auditAbortController = useRef<AbortController | null>(null);

  const addToHistory = (prevText: string, newText: string, action: string) => {
    // Only add if there's an actual change to avoid spam
    if (prevText === newText) return;
    
    setHistory(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      text: newText,
      previousText: prevText,
      actionDescription: action
    }]);
  };

  const handleGenerate = async () => {
    if (!sourceText.trim() || isGenerating) return;
    
    // Save current state before new generation if there's text
    const oldText = targetText;
    if (oldText) {
      // For generation, we don't know the new text yet, so we just snapshot the old one as a "manual overwrite" event
      // Effectively the "new" text will be empty start of stream.
      // Let's just reset history? No.
      // Let's add an entry saying we cleared it?
      addToHistory(oldText, '', 'Started new generation');
    }

    setTargetText('');
    setIsGenerating(true);
    setMode(AppMode.TRANSLATE);
    setAuditReport(null);
    setShowAuditPanel(false);
    setPreviewHistoryEntry(null);

    try {
      await translateTextStream(
        sourceText,
        selectedLang,
        selectedTone,
        (chunk) => {
          setTargetText((prev) => prev + chunk);
        }
      );
    } catch (error) {
      console.error(error);
      alert('Generation failed. Please check your API configuration.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAudit = async () => {
    if (!sourceText.trim() || !targetText.trim() || isAuditing) return;
    
    setIsAuditing(true);
    setMode(AppMode.AUDIT);
    setShowAuditPanel(true);
    setPreviewHistoryEntry(null);
    
    if (auditAbortController.current) {
        auditAbortController.current.abort();
    }
    const abortController = new AbortController();
    auditAbortController.current = abortController;
    
    // Snapshot current state
    // addToHistory(targetText, targetText, 'Pre-audit snapshot'); // Redundant if no change
    
    try {
      const report = await auditText(sourceText, targetText, selectedLang);
      
      if (abortController.signal.aborted) {
          return;
      }

      setAuditReport(report);
    } catch (error) {
      if (abortController.signal.aborted) {
          console.log('Audit cancelled by user');
          return;
      }
      console.error(error);
      alert('Audit failed. Please ensure both source and target texts are provided.');
    } finally {
      if (!abortController.signal.aborted) {
          setIsAuditing(false);
          auditAbortController.current = null;
      }
    }
  };

  const handleCancelAudit = () => {
      if (auditAbortController.current) {
          auditAbortController.current.abort();
      }
      setIsAuditing(false);
      setShowAuditPanel(false);
  };

  const handleFixIssue = (issue: AuditIssue) => {
    const prevText = targetText;
    if (!prevText.includes(issue.target_segment)) {
      alert("Could not find exact text segment. It might have been already changed.");
      return;
    }

    const newText = prevText.replace(issue.target_segment, issue.suggestion);
    setTargetText(newText);
    
    if (auditReport) {
      const updatedIssues = auditReport.issues.map(i => 
        i.id === issue.id ? { ...i, status: 'fixed' as const } : i
      );
      setAuditReport({ ...auditReport, issues: updatedIssues });
    }

    addToHistory(prevText, newText, `Fixed issue: ${issue.category}`);
  };

  const handleFixAll = () => {
    if (!auditReport) return;
    
    const prevText = targetText;
    let currentText = prevText;
    let fixedCount = 0;
    
    const sortedIssues = [...auditReport.issues]
      .filter(i => i.status === 'pending')
      .sort((a, b) => b.target_segment.length - a.target_segment.length);

    const updatedIssues = [...auditReport.issues];

    sortedIssues.forEach(issue => {
      if (currentText.includes(issue.target_segment)) {
        currentText = currentText.replace(issue.target_segment, issue.suggestion);
        
        const issueIndex = updatedIssues.findIndex(i => i.id === issue.id);
        if (issueIndex !== -1) {
          updatedIssues[issueIndex] = { ...updatedIssues[issueIndex], status: 'fixed' };
          fixedCount++;
        }
      }
    });

    if (fixedCount > 0) {
      setTargetText(currentText);
      setAuditReport({ ...auditReport, issues: updatedIssues });
      addToHistory(prevText, currentText, `Batch fixed ${fixedCount} issues`);
    }
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    const prevText = targetText;
    // Restore the state BEFORE this history entry occurred (effectively undoing it)
    setTargetText(entry.previousText);
    setPreviewHistoryEntry(null); // Exit preview mode
    
    // Add a record that we restored an old version
    addToHistory(prevText, entry.previousText, `Undid changes from ${new Date(entry.timestamp).toLocaleTimeString()}`);
  };
  
  const handlePreviewHistory = (entry: HistoryEntry | null) => {
      setPreviewHistoryEntry(entry);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Navbar */}
      <nav className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ICONS.Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">CopyFlow</span>
        </div>

        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 hidden md:flex">
          <button
            onClick={() => {
                setMode(AppMode.TRANSLATE);
                setShowAuditPanel(false);
                setPreviewHistoryEntry(null);
            }}
            className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              mode === AppMode.TRANSLATE ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ICONS.FileText className="w-4 h-4" />
            Translate
          </button>
          <button
            onClick={() => {
                setMode(AppMode.AUDIT);
                if (mode === AppMode.AUDIT) {
                    setShowAuditPanel(!showAuditPanel);
                } else {
                    setShowAuditPanel(true);
                }
            }}
            className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              mode === AppMode.AUDIT ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ICONS.Search className="w-4 h-4" />
            Audit
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-4 w-[1px] bg-slate-800 mx-2 hidden sm:block"></div>
          <a 
            href="https://ai.google.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-blue-400 transition-colors hidden sm:block font-medium"
          >
            Powered by Gemini
          </a>
        </div>
      </nav>

      {/* Control Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 z-30 flex flex-wrap gap-4 items-center justify-between flex-shrink-0">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Language</label>
            <div className="relative group">
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
                className="appearance-none bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer transition-all hover:border-slate-700"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tone</label>
            <div className="relative group">
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as ToneType)}
                className="appearance-none bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer transition-all hover:border-slate-700"
              >
                {TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSourceText('');
              setTargetText('');
              setAuditReport(null);
              setHistory([]);
              setShowAuditPanel(false);
              setPreviewHistoryEntry(null);
            }}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            title="Clear all"
          >
            <ICONS.RotateCcw className="w-5 h-5" />
          </button>
          
          {mode === AppMode.TRANSLATE ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !sourceText.trim()}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xl shadow-blue-500/20 ${
                isGenerating || !sourceText.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <ICONS.Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleAudit}
              disabled={isAuditing || !sourceText.trim() || !targetText.trim()}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xl shadow-indigo-500/20 ${
                isAuditing || !sourceText.trim() || !targetText.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isAuditing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Auditing...
                </>
              ) : (
                <>
                  <ICONS.Shield className="w-4 h-4" />
                  Run Audit
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Split View + Sidebar Container */}
      <main className="flex-1 flex overflow-hidden bg-slate-950">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
            <div className="flex flex-col h-full overflow-hidden">
              <RichEditor
                label="Source (Chinese)"
                value={sourceText}
                onChange={setSourceText}
                placeholder="粘贴你的中文文案，支持 Markdown..."
              />
            </div>
            <div className="flex flex-col h-full overflow-hidden">
              <RichEditor
                label={previewHistoryEntry ? `Preview: ${new Date(previewHistoryEntry.timestamp).toLocaleTimeString()}` : `${selectedLang} Output`}
                value={previewHistoryEntry ? previewHistoryEntry.text : targetText}
                onChange={setTargetText}
                placeholder={mode === AppMode.TRANSLATE ? "等待生成..." : "粘贴外文翻译进行审计..."}
                readOnly={(isGenerating && mode === AppMode.TRANSLATE) || !!previewHistoryEntry}
                // Audit props
                issues={previewHistoryEntry ? [] : auditReport?.issues} // Don't show current issues in preview mode
                isReviewMode={!previewHistoryEntry && mode === AppMode.AUDIT && !!auditReport}
                onFixIssue={handleFixIssue}
                // History Diff props
                diffBase={previewHistoryEntry ? previewHistoryEntry.previousText : null}
              />
            </div>
          </div>
        </div>

        {/* Audit Panel Sidebar */}
        {showAuditPanel && (
          <div className="w-[450px] flex-shrink-0 border-l border-slate-800 bg-slate-900 shadow-xl transition-all duration-300">
            <AuditReportPanel 
              report={auditReport}
              history={history}
              loading={isAuditing} 
              onClose={() => setShowAuditPanel(false)}
              onCancel={handleCancelAudit}
              onFixIssue={handleFixIssue}
              onFixAll={handleFixAll}
              onRestoreHistory={handleRestoreHistory}
              onPreviewHistory={handlePreviewHistory}
              previewEntryId={previewHistoryEntry?.id || null}
            />
          </div>
        )}
      </main>

      {/* Mobile Mode Switcher (Floating) */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-full p-1 flex">
        <button
          onClick={() => {
              setMode(AppMode.TRANSLATE);
              setShowAuditPanel(false);
          }}
          className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
            mode === AppMode.TRANSLATE ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          Translate
        </button>
        <button
          onClick={() => {
              setMode(AppMode.AUDIT);
              setShowAuditPanel(true);
          }}
          className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
            mode === AppMode.AUDIT ? 'bg-indigo-600 text-white' : 'text-slate-400'
          }`}
        >
          Audit
        </button>
      </div>
    </div>
  );
};

export default App;
