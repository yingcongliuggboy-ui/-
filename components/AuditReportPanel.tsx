
import React, { useState } from 'react';
import { AuditReport, AuditIssue, HistoryEntry } from '../types';
import { ICONS } from '../constants';

interface AuditReportPanelProps {
  report: AuditReport | null;
  history: HistoryEntry[];
  loading: boolean;
  onClose: () => void;
  onCancel: () => void;
  onFixIssue: (issue: AuditIssue) => void;
  onFixAll: () => void;
  onRestoreHistory: (entry: HistoryEntry) => void;
  onPreviewHistory: (entry: HistoryEntry | null) => void;
  previewEntryId: string | null;
}

const AuditReportPanel: React.FC<AuditReportPanelProps> = ({ 
  report, 
  history,
  loading, 
  onClose,
  onCancel,
  onFixIssue,
  onFixAll,
  onRestoreHistory,
  onPreviewHistory,
  previewEntryId
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'history'>('issues');

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getIssueIcon = (type: AuditIssue['type']) => {
    switch (type) {
      case 'Critical': return <ICONS.AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'Warning': return <ICONS.AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <ICONS.Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const pendingIssuesCount = report?.issues.filter(i => i.status === 'pending').length || 0;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ICONS.Shield className="w-5 h-5 text-blue-400" />
          {loading ? 'Auditing...' : 'Audit Result'}
        </h2>
        <div className="flex items-center gap-2">
          {!loading && (
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 mr-2">
              <button 
                onClick={() => setActiveTab('issues')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'issues' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Issues
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                History
              </button>
            </div>
          )}
          
          {loading ? (
            <>
               <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                title="Hide panel (continue in background)"
              >
                <ICONS.Minus className="w-5 h-5" />
              </button>
              <button 
                onClick={onCancel}
                className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                title="Cancel audit"
              >
                <ICONS.X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              title="Close panel"
            >
              <ICONS.X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium">Analyzing linguistics & compliance...</p>
            <p className="text-xs text-slate-500">You can hide this panel, process continues.</p>
          </div>
        ) : activeTab === 'issues' && report ? (
          <>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-800 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                 <ICONS.CheckCircle className="w-24 h-24" />
               </div>
               <div className={`text-5xl font-black mb-2 ${getScoreColor(report.score)}`}>
                 {report.score}
               </div>
               <div className="text-sm text-slate-400 uppercase tracking-widest font-bold">Quality Score</div>
               <p className="mt-4 text-slate-300 leading-relaxed italic">"{report.summary}"</p>
            </div>

            {pendingIssuesCount > 0 && (
              <button
                onClick={onFixAll}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ICONS.Sparkles className="w-4 h-4" />
                Fix All Issues ({pendingIssuesCount})
              </button>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                Details ({report.issues.length})
              </h3>
              <div className="space-y-4">
                {report.issues.map((issue) => (
                  <div key={issue.id} className={`bg-slate-950 border rounded-xl p-4 transition-all group ${issue.status === 'fixed' ? 'border-emerald-500/30 opacity-60' : 'border-slate-800 hover:border-slate-700'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {issue.status === 'fixed' ? <ICONS.CheckCircle className="w-4 h-4 text-emerald-500"/> : getIssueIcon(issue.type)}
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">{issue.category}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        issue.status === 'fixed' ? 'bg-emerald-500/10 text-emerald-500' :
                        issue.type === 'Critical' ? 'bg-rose-500/10 text-rose-500' : 
                        issue.type === 'Warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {issue.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="relative pl-4 border-l-2 border-slate-800">
                        <div className="text-[10px] text-slate-500 mb-1">Issue</div>
                        <div className="text-sm text-slate-200 line-through decoration-rose-500/50 decoration-2">{issue.target_segment}</div>
                      </div>

                      <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[10px] text-emerald-500 font-bold mb-1 uppercase tracking-wider">Suggestion</div>
                            <div className="text-sm text-emerald-400 font-medium">{issue.suggestion}</div>
                          </div>
                          {issue.status === 'pending' && (
                            <button
                              onClick={() => onFixIssue(issue)}
                              className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 transition-colors"
                            >
                              Fix
                            </button>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">{issue.reason}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : activeTab === 'history' ? (
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    History ({history.length})
                </h3>
                {previewEntryId && (
                    <button 
                        onClick={() => onPreviewHistory(null)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                    >
                        Cancel Preview
                    </button>
                )}
             </div>
              {history.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">No edits made yet.</div>
              )}
              {history.slice().reverse().map((entry) => {
                const isSelected = previewEntryId === entry.id;
                return (
                  <div 
                    key={entry.id} 
                    onClick={() => onPreviewHistory(isSelected ? null : entry)}
                    className={`border rounded-xl p-4 flex flex-col gap-2 transition-all cursor-pointer ${
                        isSelected 
                        ? 'bg-blue-900/10 border-blue-500/50 shadow-lg shadow-blue-500/10' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-400' : 'text-slate-300'}`}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      {isSelected ? (
                          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wide">Previewing</span>
                      ) : (
                          <span className="text-[10px] text-slate-500">Click to preview</span>
                      )}
                    </div>
                    <div className={`text-sm ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                        {entry.actionDescription}
                    </div>
                    
                    {isSelected && (
                        <div className="mt-2 pt-2 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRestoreHistory(entry);
                                }}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <ICONS.RotateCcw className="w-3 h-3" />
                                Restore Original (Undo)
                            </button>
                        </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
             <ICONS.Search className="w-12 h-12 mb-4 opacity-20" />
             <p>No audit results yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditReportPanel;
