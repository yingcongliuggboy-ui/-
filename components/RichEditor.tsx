
import React, { useState, useRef, useEffect } from 'react';
import { AuditIssue } from '../types';
import { ICONS } from '../constants';

interface RichEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  issues?: AuditIssue[];
  onFixIssue?: (issue: AuditIssue) => void;
  isReviewMode?: boolean;
  diffBase?: string | null;
}

interface PopoverState {
  id: string;
  x: number;
  y: number;
  align: 'top' | 'bottom';
}

const RichEditor: React.FC<RichEditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  readOnly, 
  issues = [], 
  onFixIssue,
  isReviewMode = false,
  diffBase = null
}) => {
  const [activePopover, setActivePopover] = useState<PopoverState | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(event.target as Node)) {
        return;
      }
      if (activePopover) {
        setActivePopover(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', () => setActivePopover(null), true);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', () => setActivePopover(null), true);
    };
  }, [activePopover]);

  const handleIssueClick = (event: React.MouseEvent<HTMLSpanElement>, issueId: string) => {
    event.stopPropagation();
    if (activePopover?.id === issueId) {
      setActivePopover(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    let align: 'top' | 'bottom' = 'top';
    let y = rect.top - 10;
    if (spaceAbove < 200 && spaceBelow > 200) {
      align = 'bottom';
      y = rect.bottom + 10;
    }
    setActivePopover({
      id: issueId,
      x: rect.left + (rect.width / 2),
      y: y,
      align
    });
  };

  const getIssueColorClass = (type: string, status: string) => {
    if (status === 'fixed') return 'bg-emerald-500/20 text-emerald-300 decoration-emerald-500/50';
    switch (type) {
      case 'Critical': return 'bg-rose-500/20 text-rose-200 decoration-rose-500 decoration-wavy underline-offset-4';
      case 'Warning': return 'bg-amber-500/20 text-amber-200 decoration-amber-500 decoration-dotted underline-offset-4';
      default: return 'bg-blue-500/20 text-blue-200 decoration-blue-500 decoration-dotted underline-offset-4';
    }
  };

  const renderSimpleDiff = () => {
    if (!diffBase) return null;
    
    const oldArr = diffBase.match(/\S+|\s+/g) || [];
    const newArr = value.match(/\S+|\s+/g) || [];
    
    let i = 0;
    let j = 0;
    const result = [];
    
    while (i < oldArr.length || j < newArr.length) {
       if (i < oldArr.length && j < newArr.length && oldArr[i] === newArr[j]) {
           result.push(<span key={`same-${i}-${j}`}>{newArr[j]}</span>);
           i++;
           j++;
       } else {
           let foundMatch = false;
           // Look ahead in old
           for (let k = 1; k < 5; k++) {
               if (i + k < oldArr.length && oldArr[i + k] === newArr[j]) {
                   for (let d = 0; d < k; d++) {
                       result.push(<span key={`del-${i+d}`} className="text-rose-500 bg-rose-500/10 line-through decoration-rose-500/50">{oldArr[i+d]}</span>);
                   }
                   i += k;
                   foundMatch = true;
                   break;
               }
           }
           if (foundMatch) continue;
           
           // Look ahead in new
           for (let k = 1; k < 5; k++) {
               if (j + k < newArr.length && newArr[j + k] === oldArr[i]) {
                   for (let d = 0; d < k; d++) {
                       result.push(<span key={`add-${j+d}`} className="text-emerald-400 bg-emerald-500/20">{newArr[j+d]}</span>);
                   }
                   j += k;
                   foundMatch = true;
                   break;
               }
           }
           if (foundMatch) continue;

           if (i < oldArr.length) {
             result.push(<span key={`del-${i}`} className="text-rose-500 bg-rose-500/10 line-through decoration-rose-500/50">{oldArr[i]}</span>);
             i++;
           }
           if (j < newArr.length) {
             result.push(<span key={`add-${j}`} className="text-emerald-400 bg-emerald-500/20">{newArr[j]}</span>);
             j++;
           }
       }
    }
    
    return (
        <div className="absolute inset-0 p-6 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-200">
             {result}
        </div>
    );
  };

  const renderWithHighlights = () => {
    if (!issues.length) return <div className="absolute inset-0 p-6 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-200">{value}</div>;

    let parts: { text: string; issue?: AuditIssue }[] = [{ text: value }];

    issues.filter(i => i.status !== 'ignored').forEach(issue => {
      const target = issue.target_segment;
      if (!target) return;

      const newParts: typeof parts = [];
      parts.forEach(part => {
        if (part.issue) {
          newParts.push(part);
          return;
        }

        const idx = part.text.indexOf(target);
        if (idx === -1) {
          newParts.push(part);
        } else {
          const before = part.text.substring(0, idx);
          const after = part.text.substring(idx + target.length);
          
          if (before) newParts.push({ text: before });
          newParts.push({ text: target, issue: issue });
          if (after) newParts.push({ text: after });
        }
      });
      parts = newParts;
    });

    return (
      <div className="absolute inset-0 p-6 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-200">
        {parts.map((part, idx) => {
          if (!part.issue) return <span key={idx}>{part.text}</span>;

          const isActive = activePopover?.id === part.issue.id;
          return (
            <span
              key={idx}
              onClick={(e) => handleIssueClick(e, part.issue!.id)}
              className={`cursor-pointer underline rounded px-0.5 transition-colors ${getIssueColorClass(part.issue.type, part.issue.status)} ${isActive ? 'ring-2 ring-white/20' : ''}`}
            >
              {part.text}
            </span>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
      if (diffBase !== null) {
          return renderSimpleDiff();
      }
      if (isReviewMode) {
          return renderWithHighlights();
      }
      return (
          <textarea
            className={`absolute inset-0 w-full h-full p-6 bg-transparent text-slate-200 resize-none outline-none font-mono text-sm leading-relaxed overflow-y-auto ${readOnly ? 'cursor-default' : 'cursor-text'}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            spellCheck={false}
          />
      );
  };

  const activeIssue = activePopover ? issues.find(i => i.id === activePopover.id) : null;

  return (
    <>
      <div ref={containerRef} className={`flex flex-col h-full bg-slate-900 border rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${isReviewMode ? 'border-indigo-500/50 shadow-indigo-500/10' : diffBase ? 'border-amber-500/50 shadow-amber-500/10' : 'border-slate-800 focus-within:border-blue-500/50'}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${isReviewMode ? 'bg-indigo-900/20 border-indigo-900/50' : diffBase ? 'bg-amber-900/20 border-amber-900/50' : 'bg-slate-800/50 border-slate-800'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isReviewMode ? 'text-indigo-300' : diffBase ? 'text-amber-300' : 'text-slate-400'}`}>
                {diffBase ? 'History Preview' : label}
            </span>
            {isReviewMode && <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full animate-pulse">REVIEW MODE</span>}
            {diffBase && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full">PREVIEWING CHANGE</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              disabled={!value}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                copied 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              } ${!value ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Copy all text"
            >
              {copied ? (
                <>
                  <ICONS.Check className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">COPIED</span>
                </>
              ) : (
                <ICONS.Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <div className="flex gap-1.5 ml-1">
              <div className="w-2 h-2 rounded-full bg-slate-700/50"></div>
              <div className="w-2 h-2 rounded-full bg-slate-700/50"></div>
              <div className="w-2 h-2 rounded-full bg-slate-700/50"></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 relative">
             {renderContent()}
        </div>
        
        <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center flex-shrink-0">
          <span>{isReviewMode ? 'Click highlighted text to fix' : diffBase ? 'Showing changes from previous version' : 'Markdown Supported'}</span>
          <span>{value.length} characters</span>
        </div>
      </div>

      {activePopover && activeIssue && (
        <div 
          ref={popoverRef}
          className="fixed z-[9999] w-72 bg-slate-800 border border-slate-700 shadow-2xl rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: activePopover.x,
            top: activePopover.y,
            transform: `translate(-50%, ${activePopover.align === 'top' ? '-100%' : '0'})`
          }}
        >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                activeIssue.type === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 
                activeIssue.type === 'Warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {activeIssue.type}
              </span>
              {activeIssue.status === 'fixed' && <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1"><ICONS.CheckCircle className="w-3 h-3"/> Fixed</span>}
            </div>
            <div className="text-xs text-slate-300 mb-3">{activeIssue.reason}</div>
            
            {activeIssue.status === 'pending' && (
              <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 space-y-3">
                <div>
                  <div className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-wider">Source (Chinese)</div>
                  <div className="text-xs text-slate-300 italic">"{activeIssue.original_segment}"</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-wider">Suggestion</div>
                  <div className="text-sm font-semibold text-emerald-400">{activeIssue.suggestion}</div>
                </div>
                <button
                  onClick={() => {
                    onFixIssue?.(activeIssue);
                    setActivePopover(null);
                  }}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ICONS.Sparkles className="w-3 h-3" />
                  Fix This
                </button>
              </div>
            )}
        </div>
      )}
    </>
  );
};

export default RichEditor;
