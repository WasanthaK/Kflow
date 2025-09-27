import { useState, useCallback, useEffect } from 'react';
import { rewriteToSimpleScript, guardrails } from '../codex';
import { WorkflowGraph } from '../components/WorkflowGraph';

// Enhanced StoryFlow compiler function
function storyToSimple(story: string): string {
  const lines = story.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => l.toLowerCase().startsWith('flow:'))?.replace(/^[^:]+:/, '').trim() || 'Untitled';
  
  // Enhanced variable extraction
  const vars: Record<string, string> = {};
  
  // Extract template variables {variable}
  const templateVars = story.match(/{([^}]+)}/g) || [];
  const uniqueTemplateVars = [...new Set(templateVars.map(v => v.slice(1, -1)))];
  uniqueTemplateVars.forEach(varName => {
    vars[varName] = `input variable (${varName})`;
  });
  
  // Extract actors
  const actors = story.match(/\b(manager|employee|user|customer|admin|supervisor|owner|agent|lead)\b/gi) || [];
  const uniqueActors = [...new Set(actors.map(a => a.toLowerCase()))];
  uniqueActors.forEach(actor => {
    if (!vars[actor] && !uniqueTemplateVars.includes(actor)) {
      vars[actor] = `workflow actor`;
    }
  });

  // Convert lines to enhanced steps
  const steps = lines
    .filter(l => !/^flow:|^trigger:/i.test(l))
    .map(l => {
      if (/^if\s+/i.test(l)) {
        return { if: l.replace(/^if\s+/i, '').trim() };
      }
      if (/^otherwise/i.test(l)) {
        return { otherwise: true };
      }
      if (/^ask /i.test(l)) {
        return { 
          userTask: {
            description: l.slice(4).trim(),
            type: 'human_input'
          }
        };
      }
      if (/^do:\s*(calculate|compute|transform|parse|analyze|format)/i.test(l)) {
        return { 
          scriptTask: {
            description: l.replace(/^do:?\s*/i,''),
            type: 'computation'
          }
        };
      }
      if (/^do:\s*(create|update|delete|insert|process|execute|call|run)/i.test(l)) {
        return { 
          serviceTask: {
            description: l.replace(/^do:?\s*/i,''),
            type: 'system_operation'
          }
        };
      }
      if (/^do:/i.test(l) || /^do /i.test(l)) return { do: l.replace(/^do:?\s*/i,'') };
      if (/^send /i.test(l)) {
        return {
          messageTask: {
            description: l.slice(5).trim(),
            type: 'send'
          }
        };
      }
      if (/^wait /i.test(l)) return { wait: l.slice(5).trim() };
      if (/^stop/i.test(l)) return { endEvent: { type: 'terminate' } };
      return { remember: { note: l } };
    });

  return JSON.stringify({ flow: title, vars, steps }, null, 2);
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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#2563eb', fontSize: '2rem' }}>🔄 Kflow Studio</h1>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>
            📊 Visual Graphs
          </span>
          <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>
            🏗️ BPMN Compliant
          </span>
          <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
            ⚡ Real-time Updates
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showGraph ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Left Panel - Story Editor */}
        <div>
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
          
          <textarea 
            value={story} 
            onChange={event => setStory(event.target.value)}
            style={{ 
              width: '100%', 
              height: '400px', 
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '14px',
              padding: '15px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              resize: 'vertical',
              lineHeight: '1.5'
            }}
            placeholder="Enter your StoryFlow here..."
          />

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ color: '#059669', marginBottom: '12px' }}>✅ Visual Features:</h3>
              <ul style={{ lineHeight: '1.6', color: '#374151' }}>
                <li>📊 <strong>Interactive Graph</strong>: Visual workflow representation</li>
                <li>🎯 <strong>BPMN Elements</strong>: Proper task types and gateways</li>
                <li>🔄 <strong>Real-time Updates</strong>: Graph updates as you type</li>
                <li>🎨 <strong>Color Coding</strong>: Different colors for different task types</li>
                <li>🔀 <strong>Flow Visualization</strong>: Clear decision paths</li>
              </ul>
            </div>

            <div>
              <h3 style={{ color: '#dc2626', marginBottom: '12px' }}>🎯 BPMN Elements:</h3>
              <ul style={{ lineHeight: '1.6', color: '#374151' }}>
                <li>🟢 <strong>Start Event</strong>: Workflow beginning</li>
                <li>👤 <strong>User Tasks</strong>: Human interactions (blue)</li>
                <li>⚙️ <strong>Service Tasks</strong>: System operations (green)</li>
                <li>🔶 <strong>Gateways</strong>: Decision points (orange diamonds)</li>
                <li>📧 <strong>Message Tasks</strong>: Communications (red)</li>
                <li>🔴 <strong>End Events</strong>: Workflow termination</li>
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
