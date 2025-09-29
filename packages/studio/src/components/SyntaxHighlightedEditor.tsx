import React, { useState, useEffect } from 'react';

interface SyntaxHighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  actors: string[];
  className?: string;
}

const SyntaxHighlightedEditor: React.FC<SyntaxHighlightedEditorProps> = ({
  value,
  onChange,
  actors,
  className = ''
}) => {
  const [highlightedContent, setHighlightedContent] = useState('');

  const syntaxRules = [
    { pattern: /\b(task|action|step|do|execute|perform|run)\b/gi, class: 'text-blue-600 font-semibold', type: 'action' },
    { pattern: /\b(if|else|otherwise|when|unless|condition|check)\b/gi, class: 'text-purple-600 font-semibold', type: 'condition' },
    { pattern: /\b(start|begin|end|finish|complete|terminate)\b/gi, class: 'text-green-600 font-semibold', type: 'event' },
    { pattern: /\b(wait|delay|timer|timeout|schedule)\b/gi, class: 'text-orange-600 font-semibold', type: 'timer' },
    { pattern: /\b(send|email|notify|message|alert|inform)\b/gi, class: 'text-indigo-600 font-semibold', type: 'message' },
    { pattern: /\b(user|customer|client|manager|admin|system|service|agent)\b/gi, class: 'text-red-600 font-semibold', type: 'actor' },
    { pattern: /\b(approve|approval|review|verify|validate|confirm)\b/gi, class: 'text-teal-600 font-semibold', type: 'approval' },
    { pattern: /\b(gateway|decision|branch|split|merge|join)\b/gi, class: 'text-pink-600 font-semibold', type: 'gateway' },
    { pattern: /\b(process|calculate|compute|generate|create|update|delete)\b/gi, class: 'text-cyan-600 font-semibold', type: 'process' },
    // String literals
    { pattern: /"([^"\\]|\\.)*"/g, class: 'text-green-700', type: 'string' },
    { pattern: /'([^'\\]|\\.)*'/g, class: 'text-green-700', type: 'string' },
    // Numbers
    { pattern: /\b\d+(\.\d+)?\b/g, class: 'text-blue-700', type: 'number' },
    // Comments
    { pattern: /#.*$/gm, class: 'text-gray-500 italic', type: 'comment' },
    { pattern: /\/\/.*$/gm, class: 'text-gray-500 italic', type: 'comment' }
  ];

  // Add dynamic actor patterns
  const actorPatterns = actors.map(actor => ({
    pattern: new RegExp(`\\b${actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
    class: 'text-red-600 font-semibold bg-red-50 px-1 rounded',
    type: 'detected-actor'
  }));

  const allRules = [...syntaxRules, ...actorPatterns];

  useEffect(() => {
    const highlightSyntax = (text: string) => {
      let highlighted = text;
      const replacements: Array<{ start: number; end: number; replacement: string; priority: number }> = [];

      allRules.forEach((rule, ruleIndex) => {
        const matches = [...text.matchAll(rule.pattern)];
        matches.forEach(match => {
          if (match.index !== undefined) {
            replacements.push({
              start: match.index,
              end: match.index + match[0].length,
              replacement: `<span class="${rule.class}" data-type="${rule.type}">${match[0]}</span>`,
              priority: rule.type === 'detected-actor' ? 100 : ruleIndex
            });
          }
        });
      });

      // Sort by position (reverse) and priority to handle overlaps
      replacements.sort((a, b) => {
        if (a.start !== b.start) return b.start - a.start;
        return b.priority - a.priority;
      });

      // Apply replacements without overlapping
      const applied = new Set<string>();
      replacements.forEach(replacement => {
        const key = `${replacement.start}-${replacement.end}`;
        if (!applied.has(key)) {
          const overlapping = Array.from(applied).some(appliedKey => {
            const [aStart, aEnd] = appliedKey.split('-').map(Number);
            return !(replacement.end <= aStart || replacement.start >= aEnd);
          });
          
          if (!overlapping) {
            highlighted = highlighted.substring(0, replacement.start) + 
                         replacement.replacement + 
                         highlighted.substring(replacement.end);
            applied.add(key);
          }
        }
      });

      return highlighted;
    };

    setHighlightedContent(highlightSyntax(value));
  }, [value, actors]);

  return (
    <div className={`relative ${className}`}>
      {/* Syntax Highlighted Display */}
      <div 
        className="absolute inset-0 p-3 font-mono text-sm leading-6 pointer-events-none whitespace-pre-wrap break-words overflow-hidden"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
        style={{ color: 'transparent' }}
      />
      
      {/* Actual Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="relative w-full h-full p-3 font-mono text-sm leading-6 bg-transparent resize-none outline-none border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        style={{ 
          color: 'rgba(0,0,0,0.01)', // Nearly transparent but not completely for cursor visibility
          caretColor: '#000'  // Visible cursor
        }}
        placeholder="Enter your workflow definition here...

Example:
task: customer provides order details
if order_total > 1000
  task: manager approval required
  if manager_approved
    service: process payment via gateway
  else
    message: send rejection email
else
  service: process standard payment
end"
        spellCheck={false}
      />

      {/* Syntax Legend */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded p-2 text-xs border shadow-sm">
        <div className="font-semibold mb-1">Syntax Colors:</div>
        <div className="space-y-1">
          <div><span className="text-blue-600">●</span> Actions</div>
          <div><span className="text-purple-600">●</span> Conditions</div>
          <div><span className="text-red-600">●</span> Actors</div>
          <div><span className="text-green-600">●</span> Events</div>
          <div><span className="text-orange-600">●</span> Timers</div>
        </div>
      </div>
    </div>
  );
};

export default SyntaxHighlightedEditor;