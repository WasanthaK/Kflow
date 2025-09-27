import { useState, useCallback, useEffect, useRef } from 'react';
import { rewriteToSimpleScript, guardrails } from '../codex';
import { WorkflowGraph } from '../components/WorkflowGraph';

// Local AI Types and Implementation
interface AutocompleteSuggestion {
  text: string;
  type: 'action' | 'actor' | 'condition' | 'system' | 'continuation' | 'pattern';
  confidence: number;
  description?: string;
  category?: string;
}

// AI Autocomplete Integration
let autocompleteEngine: any = null;

// Enhanced StoryFlow Compiler (local implementation)
function storyToSimple(story: string): string {
  const lines = story.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => l.toLowerCase().startsWith('flow:'))?.replace(/^[^:]+:/, '').trim() || 'Untitled';
  
  // Enhanced variable extraction
  const vars: Record<string, string> = {};
  
  // 1. Extract template variables {variable}
  const templateVars = story.match(/{([^}]+)}/g) || [];
  const uniqueTemplateVars = [...new Set(templateVars.map(v => v.slice(1, -1)))];
  uniqueTemplateVars.forEach(varName => {
    vars[varName] = `input variable (${varName})`;
  });
  
  // 2. Extract condition variables from If statements
  const conditions = story.match(/If\s+([^\n]+)/gi) || [];
  conditions.forEach(condition => {
    const conditionText = condition.replace(/^If\s+/i, '').trim();
    if (conditionText.match(/approved|accepted|confirmed/i)) {
      vars['approved'] = 'boolean state from approval decision';
    }
    if (conditionText.match(/rejected|denied|declined/i)) {
      vars['rejected'] = 'boolean state from rejection decision';  
    }
    if (conditionText.match(/available|exists|found/i)) {
      vars['available'] = 'boolean state for availability check';
    }
  });
  
  // 3. Extract actors
  const actors = story.match(/\b(manager|employee|user|customer|admin|supervisor|owner|agent|lead|team|staff)\b/gi) || [];
  const uniqueActors = [...new Set(actors.map(a => a.toLowerCase()))];
  uniqueActors.forEach(actor => {
    if (!vars[actor] && !uniqueTemplateVars.includes(actor)) {
      vars[actor] = `workflow actor`;
    }
  });

  // Convert lines to enhanced steps with BPMN compliance
  const steps = lines
    .filter(l => !/^flow:|^trigger:/i.test(l))
    .map(l => {
      // Handle control flow structures
      if (/^if\s+/i.test(l)) {
        return { if: l.replace(/^if\s+/i, '').trim() };
      }
      if (/^otherwise/i.test(l)) {
        return { otherwise: true };
      }
      
      // Enhanced task type detection
      if (/^ask /i.test(l)) {
        return { 
          userTask: {
            description: l.slice(4).trim(),
            assignee: extractAssignee(l),
            type: 'human_input'
          }
        };
      }
      
      // Script tasks (calculations/transformations)
      if (/^do:\s*(calculate|compute|transform|parse|analyze|format|sum|average|total|count)/i.test(l)) {
        const description = l.replace(/^do:?\s*/i,'');
        return { 
          scriptTask: {
            description: description,
            type: 'computation',
            subtype: getScriptTaskSubtype(description),
            executable: isExecutableScript(description)
          }
        };
      }
      
      // Service tasks (system operations)
      if (/^do:\s*(create|update|delete|insert|process|execute|call|run)/i.test(l)) {
        return { 
          serviceTask: {
            description: l.replace(/^do:?\s*/i,''),
            type: 'system_operation'
          }
        };
      }
      
      // Manual tasks
      if (/^do:\s*(review|approve|check|verify|inspect|examine)/i.test(l)) {
        return { 
          manualTask: {
            description: l.replace(/^do:?\s*/i,''),
            type: 'human_work'
          }
        };
      }
      
      // Business rule tasks
      if (/^do:\s*(evaluate|determine|decide|classify|assess)/i.test(l)) {
        return { 
          businessRuleTask: {
            description: l.replace(/^do:?\s*/i,''),
            type: 'rule_evaluation'
          }
        };
      }
      
      // Generic do task
      if (/^do:/i.test(l) || /^do /i.test(l)) return { do: l.replace(/^do:?\s*/i,'') };
      
      // Message tasks
      if (/^send /i.test(l)) {
        return {
          messageTask: {
            description: l.slice(5).trim(),
            type: 'send',
            messageType: l.includes('email') ? 'email' : 'message'
          }
        };
      }
      
      // Wait tasks
      if (/^wait /i.test(l)) {
        return { waitTask: { description: l.slice(5).trim(), type: 'timer' } };
      }
      
      if (/^stop/i.test(l)) return { endEvent: { type: 'terminate' } };
      
      return { remember: { note: l } };
    });

  // Helper functions
  function extractAssignee(line: string): string | undefined {
    const match = line.match(/ask\s+([^{\s]+)/i);
    return match ? match[1] : undefined;
  }
  
  function getScriptTaskSubtype(description: string): string {
    if (/calculate|compute|sum|average|total/i.test(description)) return 'financial_calculation';
    if (/transform|convert|format|parse/i.test(description)) return 'data_transformation';
    if (/analyze|count|aggregate/i.test(description)) return 'statistical_analysis';
    return 'general_computation';
  }

  function isExecutableScript(description: string): boolean {
    return /=|formula|function|algorithm|\+|\-|\*|\//.test(description);
  }

  return JSON.stringify({ flow: title, vars, steps }, null, 2);
}

// Simple AI Autocomplete Class
class SimpleAutocomplete {
  constructor(private apiKey: string) {}

  async getSuggestions(context: any): Promise<AutocompleteSuggestion[]> {
    try {
      // Try OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a StoryFlow writing assistant. Suggest 3-5 contextually appropriate workflow steps. Return as JSON array with format: {"text": "suggested text", "type": "action", "confidence": 0.8, "description": "explanation"}'
            },
            {
              role: 'user', 
              content: `Current workflow:\n${context.previousLines.join('\n')}\nCurrent line: "${context.currentLine}"\nSuggest next steps:`
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      });

      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          // Fallback parsing
          return this.getFallbackSuggestions(context);
        }
      }
    } catch (error) {
      console.warn('AI request failed:', error);
    }
    
    return this.getFallbackSuggestions(context);
  }

  private getFallbackSuggestions(context: any): AutocompleteSuggestion[] {
    const currentLine = context.currentLine.trim();
    const suggestions: AutocompleteSuggestion[] = [];
    
    if (!currentLine) {
      suggestions.push(
        { text: 'Ask {actor} for {information}', type: 'action', confidence: 0.8, description: 'Request input or approval' },
        { text: 'Do: {action} {object}', type: 'action', confidence: 0.8, description: 'Perform an action' },
        { text: 'Send {message} to {recipient}', type: 'action', confidence: 0.8, description: 'Send communication' },
        { text: 'If {condition}', type: 'condition', confidence: 0.8, description: 'Add conditional logic' },
        { text: 'Stop', type: 'action', confidence: 0.8, description: 'End workflow' }
      );
    } else if (currentLine.startsWith('Ask')) {
      suggestions.push(
        { text: 'Ask manager to approve the request', type: 'pattern', confidence: 0.9 },
        { text: 'Ask customer for {payment_details}', type: 'pattern', confidence: 0.9 },
        { text: 'Ask system to process {data}', type: 'pattern', confidence: 0.8 }
      );
    } else if (currentLine.startsWith('Do:')) {
      suggestions.push(
        { text: 'Do: update {system} with {data}', type: 'pattern', confidence: 0.9 },
        { text: 'Do: calculate {value} from {inputs}', type: 'pattern', confidence: 0.9 },
        { text: 'Do: create {record} in {database}', type: 'pattern', confidence: 0.8 }
      );
    }
    
    return suggestions.slice(0, 5);
  }
}

// Initialize AI if API key is available
function initializeAI() {
  const apiKey = localStorage.getItem('openai-api-key') || 
    import.meta.env?.VITE_OPENAI_API_KEY;
  if (apiKey && !autocompleteEngine) {
    try {
      autocompleteEngine = new SimpleAutocomplete(apiKey);
      console.log('✅ AI Autocomplete initialized');
      return true;
    } catch (error) {
      console.warn('⚠️ AI initialization failed:', error);
      return false;
    }
  }
  return !!autocompleteEngine;
}

export function App() {
  const [story, setStory] = useState(`Flow: Approve Vacation Request
Ask employee for {vacation_dates} and {reason}
Ask manager to approve the request
If approved
  Do: update HR system with {vacation_dates}
  Send email to employee: "Vacation approved"
  Stop
Otherwise
  Send email to employee: "Vacation denied"
  Stop`);

  const [converted, setConverted] = useState('');
  const [error, setError] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [assistVisible, setAssistVisible] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  
  // AI Integration states
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showAiSetup, setShowAiSetup] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleConvert = useCallback(async () => {
    if (!story.trim()) {
      setError('Please enter a story first');
      return;
    }

    setIsConverting(true);
    setError('');

    try {
      const result = storyToSimple(story);
      setConverted(result);
    } catch (err) {
      setError(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConverting(false);
    }
  }, [story]);

  // Auto-convert when story changes
  useEffect(() => {
    if (story.trim()) {
      handleConvert();
    }
  }, [story, handleConvert]);

  // Initialize AI on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openai-api-key');
    if (savedKey) {
      setApiKey(savedKey);
      setAiEnabled(initializeAI());
    }
  }, []);

  // AI Setup Functions
  const handleApiKeySetup = useCallback(() => {
    if (apiKey.trim()) {
      localStorage.setItem('openai-api-key', apiKey);
      const success = initializeAI();
      setAiEnabled(success);
      setShowAiSetup(false);
      if (success) {
        alert('✅ AI Autocomplete activated!');
      } else {
        alert('❌ Failed to initialize AI. Please check your API key.');
      }
    }
  }, [apiKey]);

  const handleClearApiKey = useCallback(() => {
    localStorage.removeItem('openai-api-key');
    setApiKey('');
    setAiEnabled(false);
    autocompleteEngine = null;
    setShowAiSetup(false);
  }, []);

  // AI Autocomplete Functions
  const handleTextareaKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab' && aiEnabled && autocompleteEngine) {
      event.preventDefault();
      
      const textarea = event.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const beforeCursor = story.substring(0, cursorPosition);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1] || '';
      const previousLines = lines.slice(0, -1);

      try {
        const aiSuggestions = await autocompleteEngine.getSuggestions({
          currentLine,
          previousLines,
          cursorPosition: currentLine.length,
          workflowDomain: detectDomain(story)
        });
        
        setSuggestions(aiSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Autocomplete failed:', error);
      }
    }
    
    if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [story, aiEnabled]);

  const applySuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const beforeCursor = story.substring(0, cursorPosition);
    const afterCursor = story.substring(cursorPosition);
    
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1] || '';
    const previousLines = lines.slice(0, -1);
    
    // Replace current line with suggestion
    const newStory = [...previousLines, suggestion.text, ...afterCursor.split('\n')].join('\n');
    setStory(newStory);
    setShowSuggestions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      const newCursorPos = previousLines.join('\n').length + (previousLines.length > 0 ? 1 : 0) + suggestion.text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [story]);

  // Helper function to detect workflow domain
  const detectDomain = useCallback((text: string): string => {
    const domains = {
      'approval': ['approve', 'review', 'manager', 'decision'],
      'ecommerce': ['order', 'payment', 'customer', 'shipping'],
      'hr': ['employee', 'vacation', 'onboarding', 'performance'],
      'support': ['ticket', 'issue', 'customer', 'resolution']
    };
    
    const textLower = text.toLowerCase();
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        return domain;
      }
    }
    return 'general';
  }, []);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, color: '#2563eb', fontSize: '2rem' }}>🔄 Kflow Studio</h1>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>
              📊 Visual Graphs
            </span>
            <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>
              🏗️ BPMN Compliant
            </span>
            <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>
              ⚡ Real-time Updates
            </span>
            <span style={{ 
              backgroundColor: aiEnabled ? '#dcfce7' : '#fef2f2', 
              color: aiEnabled ? '#16a34a' : '#dc2626',
              padding: '4px 8px', 
              borderRadius: '4px' 
            }}>
              🤖 AI {aiEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowAiSetup(!showAiSetup)}
            style={{
              padding: '8px 12px',
              backgroundColor: aiEnabled ? '#16a34a' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🤖 {aiEnabled ? 'AI Ready' : 'Setup AI'}
          </button>
        </div>
      </div>

      {/* AI Setup Panel */}
      {showAiSetup && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>🤖 AI Autocomplete Setup</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px', lineHeight: '1.5' }}>
            Enable AI-powered autocomplete with your OpenAI API key. Press <strong>Tab</strong> in the editor for smart suggestions.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="password"
              placeholder="Enter your OpenAI API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleApiKeySetup}
              disabled={!apiKey.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                opacity: apiKey.trim() ? 1 : 0.5
              }}
            >
              Activate AI
            </button>
            {aiEnabled && (
              <button
                onClick={handleClearApiKey}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Clear Key
              </button>
            )}
          </div>
          
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Your API key is stored locally and never sent to our servers. 
            {aiEnabled && <span style={{ color: '#16a34a', fontWeight: '600' }}> ✅ AI is active - press Tab for suggestions!</span>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: showGraph ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Left Panel - Story Editor */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <label style={{ fontWeight: '600', fontSize: '16px' }}>📝 StoryFlow Input:</label>
            <button
              onClick={() => setShowGraph(!showGraph)}
              style={{
                padding: '6px 12px',
                backgroundColor: showGraph ? '#059669' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {showGraph ? '📊 Hide Graph' : '📊 Show Graph'}
            </button>
          </div>
          
          <div style={{ position: 'relative' }}>
            <textarea 
              ref={textareaRef}
              value={story} 
              onChange={event => setStory(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              style={{ 
                width: '100%', 
                height: '400px', 
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '14px',
                padding: '15px',
                border: `2px solid ${aiEnabled ? '#10b981' : '#e5e7eb'}`,
                borderRadius: '8px',
                resize: 'vertical',
                lineHeight: '1.5',
                backgroundColor: aiEnabled ? '#f0fdf4' : 'white'
              }}
              placeholder={aiEnabled ? 
                "Enter your StoryFlow here... (Press Tab for AI suggestions)" : 
                "Enter your StoryFlow here..."
              }
            />
            
            {aiEnabled && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '15px',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: '600'
              }}>
                AI ON
              </div>
            )}
            
            {/* AI Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '2px solid #10b981',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <div style={{ padding: '8px', backgroundColor: '#f0fdf4', fontSize: '12px', fontWeight: '600', color: '#059669' }}>
                  🤖 AI Suggestions (Click to apply):
                </div>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => applySuggestion(suggestion)}
                    style={{
                      padding: '12px',
                      borderBottom: index < suggestions.length - 1 ? '1px solid #e5e7eb' : 'none',
                      cursor: 'pointer',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                      {suggestion.text}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {suggestion.type} • {Math.round(suggestion.confidence * 100)}% confidence
                      {suggestion.description && ` • ${suggestion.description}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              onClick={handleConvert} 
              disabled={isConverting}
              style={{ 
                padding: '12px 20px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: isConverting ? 'not-allowed' : 'pointer',
                opacity: isConverting ? 0.6 : 1
              }}
            >
              {isConverting ? '⏳ Converting...' : '🔄 Convert'}
            </button>
            
            <button 
              type="button" 
              onClick={() => setAssistVisible(!assistVisible)}
              style={{ 
                padding: '12px 20px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {assistVisible ? '🔍 Hide Info' : '💡 Show Info'}
            </button>
          </div>

          {error && (
            <div style={{ 
              color: '#dc2626', 
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '16px'
            }}>
              ❌ Error: {error}
            </div>
          )}
        </div>

        {/* Right Panel - Visual Graph */}
        {showGraph && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontWeight: '600', fontSize: '16px' }}>📊 Visual Workflow Graph:</h3>
            <div style={{ 
              border: '2px solid #e5e7eb', 
              borderRadius: '8px', 
              height: '400px',
              backgroundColor: '#fafafa'
            }}>
              <WorkflowGraph workflowData={converted ? JSON.parse(converted) : null} />
            </div>
          </div>
        )}
      </div>

      {/* Output Panel */}
      {converted && (
        <div style={{ marginTop: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            ✅ Enhanced SimpleScript Output:
          </label>
          <pre style={{ 
            backgroundColor: '#f8fafc', 
            padding: '20px', 
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            whiteSpace: 'pre-wrap',
            fontSize: '13px',
            lineHeight: '1.4',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {converted}
          </pre>
        </div>
      )}

      {/* Info Panel */}
      {assistVisible && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h3 style={{ color: '#7c3aed', marginBottom: '12px' }}>🤖 AI Features:</h3>
              <ul style={{ lineHeight: '1.6', color: '#374151' }}>
                <li>🧠 <strong>Smart Autocomplete</strong>: {aiEnabled ? 'Press Tab for suggestions' : 'Setup API key to enable'}</li>
                <li>🎯 <strong>Context Awareness</strong>: Domain-specific suggestions</li>
                <li>📝 <strong>Pattern Recognition</strong>: Smart workflow templates</li>
                <li>⚡ <strong>Fallback Logic</strong>: Rule-based suggestions without AI</li>
                <li>🔒 <strong>Privacy First</strong>: API key stored locally only</li>
              </ul>
            </div>
            
            <div>
              <h3 style={{ color: '#059669', marginBottom: '12px' }}>✅ Visual Features:</h3>
              <ul style={{ lineHeight: '1.6', color: '#374151' }}>
                <li>📊 <strong>Interactive Graph</strong>: ReactFlow-powered diagrams</li>
                <li>🎯 <strong>BPMN Elements</strong>: Industry-standard notation</li>
                <li>🔄 <strong>Real-time Updates</strong>: Graph syncs as you type</li>
                <li>🎨 <strong>Color Coding</strong>: Task type visualization</li>
                <li>🔀 <strong>Branch Visualization</strong>: Complex If/Otherwise flows</li>
              </ul>
            </div>

            <div>
              <h3 style={{ color: '#dc2626', marginBottom: '12px' }}>🎯 Enhanced BPMN Tasks:</h3>
              <ul style={{ lineHeight: '1.6', color: '#374151' }}>
                <li>� <strong>User Tasks</strong>: Human interactions (blue)</li>
                <li>⚙️ <strong>Service Tasks</strong>: System operations (green)</li>
                <li>🧮 <strong>Script Tasks</strong>: Calculations & processing (purple)</li>
                <li>� <strong>Business Rule Tasks</strong>: Decision logic (orange)</li>
                <li>📧 <strong>Message Tasks</strong>: Communications (red)</li>
                <li>⏳ <strong>Wait Tasks</strong>: Timer events (gray)</li>
              </ul>
            </div>
            
            <div>
              <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>🔧 Advanced Features:</h3>
              <ul style={{ lineHeight: '1.6', color: '#374151' }}>
                <li>🏷️ <strong>Branch Labeling</strong>: Clear decision paths</li>
                <li>� <strong>Variable Extraction</strong>: Auto-detect {`{variables}`}</li>
                <li>🎭 <strong>Actor Recognition</strong>: Identify workflow roles</li>
                <li>🧮 <strong>Script Classification</strong>: 6+ calculation subtypes</li>
                <li>💾 <strong>Template Conversion</strong>: Smart parameterization</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ color: '#6b7280', marginBottom: '12px' }}>📋 Workflow Guidelines:</h3>
            <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6', color: '#4b5563' }}>
                {guardrails.map(rule => (
                  <li key={rule} style={{ marginBottom: '4px' }}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
