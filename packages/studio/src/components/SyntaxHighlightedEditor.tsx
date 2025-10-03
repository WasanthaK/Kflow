import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';

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
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Register custom language for Kflow
    monaco.languages.register({ id: 'kflow' });

    // Define tokens for Kflow syntax
    monaco.languages.setMonarchTokensProvider('kflow', {
      tokenizer: {
        root: [
          // Flow declaration
          [/^Flow:/, 'keyword.flow'],
          
          // Verbs at start of line
          [/^Ask\b/, 'keyword.ask'],
          [/^Do:?\b/, 'keyword.do'],
          [/^Send\b/, 'keyword.send'],
          [/^Wait\b/, 'keyword.wait'],
          [/^Stop\b/, 'keyword.stop'],
          [/^Receive\b/, 'keyword.receive'],
          [/^If\b/, 'keyword.control'],
          [/^Otherwise\b/, 'keyword.control'],
          
          // Variables in braces
          [/\{[^}]+\}/, 'variable'],
          
          // Actors (dynamically added from props)
          ...actors.map(actor => [new RegExp(`\\b${actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), 'type.identifier']),
          
          // Comments
          [/#.*$/, 'comment'],
          
          // Numbers
          [/\b\d+(\.\d+)?\b/, 'number'],
        ]
      }
    });

    // Define colors for tokens
    monaco.editor.defineTheme('kflowTheme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword.flow', foreground: '8b5cf6', fontStyle: 'bold' },
        { token: 'keyword.ask', foreground: '3b82f6', fontStyle: 'bold' },
        { token: 'keyword.do', foreground: '10b981', fontStyle: 'bold' },
        { token: 'keyword.send', foreground: 'ef4444', fontStyle: 'bold' },
        { token: 'keyword.wait', foreground: '6b7280', fontStyle: 'bold' },
        { token: 'keyword.stop', foreground: 'dc2626', fontStyle: 'bold' },
        { token: 'keyword.receive', foreground: '8b5cf6', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'f59e0b', fontStyle: 'bold' },
        { token: 'variable', foreground: '8b5cf6', fontStyle: 'bold' },
        { token: 'type.identifier', foreground: '0ea5e9', fontStyle: 'bold' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'number', foreground: '0ea5e9', fontStyle: 'bold' },
      ],
      colors: {
        'editor.background': aiEnabled ? '#f0fdf4' : '#ffffff',
      }
    });

    monaco.editor.setTheme('kflowTheme');
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div style={{ flex: 1, minHeight: 0, margin: 12, border: `2px solid ${aiEnabled ? '#10b981' : '#e5e7eb'}`, borderRadius: 6, overflow: 'hidden', ...style }}>
      <Editor
        height="100%"
        defaultLanguage="kflow"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          fontFamily: '"Cascadia Code", "Fira Code", Monaco, Consolas, "Courier New", monospace',
          fontLigatures: true,
          tabSize: 2,
        }}
      />
    </div>
  );
};

export default SyntaxHighlightedEditor;