import React, { useState, useEffect } from 'react';

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
}

interface Dictionary {
  actors: string[];
  actions: string[];
  conditions: string[];
  keywords: string[];
}

const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, language = 'kflow' }) => {
  const [showDictionary, setShowDictionary] = useState(false);
  const [dictionary, setDictionary] = useState<Dictionary>({
    actors: [],
    actions: [],
    conditions: [],
    keywords: []
  });

  // Extract dictionary from code
  useEffect(() => {
    const actors = Array.from(new Set(code.match(/\b(customer|user|manager|system|agent|admin)\b/gi) || []));
    const actions = Array.from(new Set(code.match(/\b(ask|send|wait|process|calculate|verify|approve|reject)\b/gi) || []));
    const conditions = Array.from(new Set(code.match(/\bif\s+([^{]+)/gi) || []));
    const keywords = Array.from(new Set(code.match(/\b(if|otherwise|end|do|task|step)\b/gi) || []));

    setDictionary({ actors, actions, conditions, keywords });
  }, [code]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        setShowDictionary(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Syntax highlighting function
  const highlightCode = (text: string) => {
    let highlighted = text;

    // Highlight actors (blue)
    highlighted = highlighted.replace(
      /\b(customer|user|manager|system|agent|admin|warehouse|finance)\b/gi,
      '<span style="color: #3b82f6; font-weight: 600;">$1</span>'
    );

    // Highlight actions (green)
    highlighted = highlighted.replace(
      /\b(ask|send|wait|process|calculate|verify|approve|reject|notify|create|update|delete)\b/gi,
      '<span style="color: #10b981; font-weight: 600;">$1</span>'
    );

    // Highlight keywords (purple)
    highlighted = highlighted.replace(
      /\b(if|otherwise|end|do|task|step|when|then|else)\b/gi,
      '<span style="color: #8b5cf6; font-weight: 700;">$1</span>'
    );

    // Highlight conditions (orange)
    highlighted = highlighted.replace(
      /\b(approved|rejected|> \d+|< \d+|= \d+|==|!=)\b/gi,
      '<span style="color: #f59e0b; font-weight: 600;">$1</span>'
    );

    // Highlight strings (red)
    highlighted = highlighted.replace(
      /"([^"]*)"/g,
      '<span style="color: #ef4444; font-style: italic;">"$1"</span>'
    );

    return highlighted;
  };

  return (
    <div style={{ position: 'relative' }}>
      <pre style={{
        background: '#1f2937',
        color: '#f9fafb',
        padding: 16,
        borderRadius: 8,
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        lineHeight: 1.5,
        overflow: 'auto',
        whiteSpace: 'pre-wrap'
      }}>
        <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
      </pre>

      {/* Dictionary overlay */}
      {showDictionary && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: 16,
          borderRadius: 8,
          fontSize: 12,
          maxWidth: 300,
          zIndex: 1000,
          border: '1px solid #374151'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12, color: '#f59e0b' }}>
            📖 Dictionary (Ctrl+D to toggle)
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: 4 }}>👤 Actors:</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {dictionary.actors.length > 0 ? dictionary.actors.join(', ') : 'None found'}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 4 }}>⚡ Actions:</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {dictionary.actions.length > 0 ? dictionary.actions.join(', ') : 'None found'}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: 4 }}>🔑 Keywords:</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {dictionary.keywords.length > 0 ? dictionary.keywords.join(', ') : 'None found'}
            </div>
          </div>

          <div>
            <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>🎯 Conditions:</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {dictionary.conditions.length > 0 ? dictionary.conditions.slice(0, 3).join(', ') : 'None found'}
            </div>
          </div>
        </div>
      )}

      {/* Help text */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 10,
        opacity: 0.7
      }}>
        Press Ctrl+D for dictionary
      </div>
    </div>
  );
};

export default SyntaxHighlighter;