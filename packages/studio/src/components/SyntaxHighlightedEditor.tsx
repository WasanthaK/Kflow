import React, { useState, useEffect, useCallback } from 'react';

interface SyntaxHighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  actors?: string[];
  aiEnabled?: boolean;
  style?: React.CSSProperties;
}

const SyntaxHighlightedEditor: React.FC<SyntaxHighlightedEditorProps> = ({
  value,
  onChange,
  onKeyDown,
  actors = [],
  aiEnabled = false,
  style = {}
}) => {
  const [highlightedContent, setHighlightedContent] = useState('');

  // Kflow-specific syntax rules with inline styles
  const syntaxRules = [
    // Kflow verbs - highest priority
    { pattern: /^(Ask)\b/gm, style: 'color: #3b82f6; font-weight: 700;', type: 'ask' },
    { pattern: /^(Do:?)\b/gm, style: 'color: #10b981; font-weight: 700;', type: 'do' },
    { pattern: /^(Send)\b/gm, style: 'color: #ef4444; font-weight: 700;', type: 'send' },
    { pattern: /^(Wait)\b/gm, style: 'color: #6b7280; font-weight: 700;', type: 'wait' },
    { pattern: /^(Stop)\b/gm, style: 'color: #dc2626; font-weight: 700;', type: 'stop' },
    { pattern: /^(Receive)\b/gm, style: 'color: #8b5cf6; font-weight: 700;', type: 'receive' },
    { pattern: /^(If)\b/gm, style: 'color: #f59e0b; font-weight: 700;', type: 'if' },
    { pattern: /^(Otherwise)\b/gm, style: 'color: #f59e0b; font-weight: 700;', type: 'otherwise' },
    { pattern: /^(Flow:)\s*(.+)$/gm, style: 'color: #8b5cf6; font-weight: 700;', type: 'flow', captureTitle: true },
    // Variables in {braces}
    { pattern: /\{([^}]+)\}/g, style: 'color: #8b5cf6; font-weight: 600; background: rgba(139, 92, 246, 0.1); padding: 1px 4px; border-radius: 3px;', type: 'variable' },
    // Comments
    { pattern: /#.*$/gm, style: 'color: #6b7280; font-style: italic;', type: 'comment' },
    // Numbers
    { pattern: /\b\d+(\.\d+)?\b/g, style: 'color: #0ea5e9; font-weight: 600;', type: 'number' }
  ];

  // Add dynamic actor patterns from detected actors
  const actorPatterns = actors.map(actor => ({
    pattern: new RegExp(`\\b${actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
    style: 'color: #0ea5e9; font-weight: 600; background: rgba(14, 165, 233, 0.1); padding: 1px 4px; border-radius: 3px;',
    type: 'detected-actor'
  }));

  const allRules = [...syntaxRules, ...actorPatterns];

  const highlightSyntax = useCallback((text: string) => {
    if (!text) return '';

    // Process line by line to handle Flow: and line-start patterns correctly
    return text.split('\n').map(line => {
      let result = line;
      
      // Handle Flow: specially
      if (/^Flow:/i.test(line)) {
        return line.replace(/^(Flow:)\s*(.+)$/i, '<span style="color: #8b5cf6; font-weight: 700;">$1</span> <span style="color: #0ea5e9; font-weight: 600;">$2</span>');
      }

      // Handle line-start verbs
      if (/^(Ask|Do:?|Send|Wait|Stop|Receive|If|Otherwise)\b/i.test(line)) {
        const verbMatch = line.match(/^(Ask|Do:?|Send|Wait|Stop|Receive|If|Otherwise)\b/i);
        if (verbMatch) {
          const verb = verbMatch[1];
          const rest = line.substring(verb.length);
          
          let verbColor = '#10b981';
          if (verb.toLowerCase() === 'ask') verbColor = '#3b82f6';
          else if (verb.toLowerCase() === 'send') verbColor = '#ef4444';
          else if (verb.toLowerCase() === 'wait') verbColor = '#6b7280';
          else if (verb.toLowerCase() === 'stop') verbColor = '#dc2626';
          else if (verb.toLowerCase() === 'receive') verbColor = '#8b5cf6';
          else if (verb.toLowerCase() === 'if' || verb.toLowerCase() === 'otherwise') verbColor = '#f59e0b';
          
          result = `<span style="color: ${verbColor}; font-weight: 700;">${verb}</span>${rest}`;
        }
      }

      // Highlight variables {variable}
      result = result.replace(
        /\{([^}]+)\}/g,
        '<span style="color: #8b5cf6; font-weight: 600; background: rgba(139, 92, 246, 0.1); padding: 1px 4px; border-radius: 3px;">{$1}</span>'
      );

      // Highlight actors (detected from insights)
      actors.forEach(actor => {
        const pattern = new RegExp(`\\b(${actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
        result = result.replace(
          pattern,
          '<span style="color: #0ea5e9; font-weight: 600; background: rgba(14, 165, 233, 0.1); padding: 1px 4px; border-radius: 3px;">$1</span>'
        );
      });

      // Highlight comments
      if (/^\s*#/.test(result)) {
        result = `<span style="color: #6b7280; font-style: italic;">${result}</span>`;
      }

      // Highlight numbers
      result = result.replace(
        /\b(\d+(?:\.\d+)?)\b/g,
        '<span style="color: #0ea5e9; font-weight: 600;">$1</span>'
      );

      return result;
    }).join('\n');
  }, [actors]);

  useEffect(() => {
    setHighlightedContent(highlightSyntax(value));
  }, [value, highlightSyntax]);

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', ...style }}>
      {/* Syntax Highlighted Display */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          padding: 12,
          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 1.6,
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowY: 'hidden',
          color: 'transparent',
          zIndex: 1
        }}
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
      
      {/* Actual Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        style={{ 
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: 12,
          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 1.6,
          background: aiEnabled ? 'rgba(240, 253, 244, 0.3)' : 'rgba(255, 255, 255, 0.3)',
          resize: 'none',
          outline: 'none',
          border: `2px solid ${aiEnabled ? '#10b981' : '#e5e7eb'}`,
          borderRadius: 6,
          margin: 12,
          color: 'rgba(0, 0, 0, 0.01)', // Nearly transparent for text but cursor visible
          caretColor: '#000',
          zIndex: 2
        }}
        placeholder={`Flow: Your Workflow Name

Ask {actor} for {information}
Do: {action} {object}
If {condition}
  Do: {consequent_action}
Otherwise
  Do: {alternative_action}
Send {message} to {recipient}
Wait for {event}
Stop`}
        spellCheck={false}
      />
    </div>
  );
};

export default SyntaxHighlightedEditor;