import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { rewriteToSimpleScript, guardrails } from '../codex';
import { convertBriefsToKstory, createOpenAIClient } from '../codex/convertBriefsToKstory';
import {
  computeClarifications,
  type ClarificationSummary,
  type ClarificationPrompt,
} from './clarifications';
import { exampleFiles, loadExample } from './examples';
import { normalizeStoryAsset, type KStory, type NormalizeOptions } from './kstory';
import { WorkflowGraph } from '../components/WorkflowGraph';
import { storySamples, DEFAULT_SAMPLE_ID, getSampleById } from './samples';
import type { NarrativeInsights, NarrativeVariableOrigin } from '../../../language/src/storyflow/narrative.js';

const CUSTOM_SAMPLE_ID = 'custom';
const DEFAULT_STORY = getSampleById(DEFAULT_SAMPLE_ID)?.content ?? `Flow: Advanced Order Processing System

Ask customer for {order_details} and {payment_method}
Do: validate customer information using verification service
Do: calculate order total with taxes and shipping

If {order_total} > 1000
  Ask manager to approve high-value order
  If manager_approved
    Do: process payment using secure gateway
    Send confirmation email to customer: "Large order approved"
  Otherwise
    Send rejection email: "High-value order requires approval"
    Stop
Otherwise
  Do: process standard payment automatically
  Do: reserve inventory items

Send tracking notification to customer
Wait for shipping confirmation

If items_shipped
  Do: update order status to "shipped"
  Send shipping notification with {tracking_number}
  Stop
Otherwise
  Ask warehouse team to resolve shipping issue
  Stop`;

function safeCompileStoryToSimple(story: string): KStory['simpleScript'] {
  try {
    const result = storyToSimple(story);
    if (typeof result === 'string' && result.trim()) {
      return JSON.parse(result) as KStory['simpleScript'];
    }
  } catch (error) {
    console.warn('Failed to compile story to SimpleScript', error);
  }
  return null;
}

const DEFAULT_NORMALIZED_KSTORY = normalizeStoryAsset(DEFAULT_STORY, {
  filename: `${DEFAULT_SAMPLE_ID}.story`,
});
const DEFAULT_SIMPLE_OBJECT = DEFAULT_NORMALIZED_KSTORY.simpleScript ?? safeCompileStoryToSimple(DEFAULT_NORMALIZED_KSTORY.story);
const DEFAULT_KSTORY: KStory = {
  ...DEFAULT_NORMALIZED_KSTORY,
  simpleScript: DEFAULT_SIMPLE_OBJECT,
};
const DEFAULT_CONVERTED = DEFAULT_SIMPLE_OBJECT ? JSON.stringify(DEFAULT_SIMPLE_OBJECT, null, 2) : '';

const CLARIFICATION_PALETTE: Record<ClarificationPrompt['severity'], string> = {
  info: '#0ea5e9',
  warning: '#f97316',
  critical: '#dc2626',
};

const CLARIFICATION_SURFACE: Record<ClarificationPrompt['severity'], string> = {
  info: '#f0f9ff',
  warning: '#fff7ed',
  critical: '#fef2f2',
};

const CLARIFICATION_TEXT: Record<ClarificationPrompt['severity'], string> = {
  info: '#075985',
  warning: '#9a3412',
  critical: '#7f1d1d',
};

const CLARIFICATION_SEVERITY_LABEL: Record<ClarificationPrompt['severity'], string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const CATEGORY_LABELS: Record<ClarificationPrompt['category'], string> = {
  actors: 'Actors',
  intents: 'Intents',
  variables: 'Variables',
  signals: 'Signals',
  confidence: 'Confidence',
  'follow-ups': 'Follow-ups',
};

const SEVERITY_ORDER: ClarificationPrompt['severity'][] = ['critical', 'warning', 'info'];

const EMPTY_CLARIFICATIONS: ClarificationSummary = {
  prompts: [],
  confidence: undefined,
  warnings: [],
  insights: {
    actors: [],
    intents: [],
    variables: [],
  },
};
  function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  function formatCategoryLabel(category: ClarificationPrompt['category']): string {
    return CATEGORY_LABELS[category] ?? category;
  }


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
  const [kstory, setKStory] = useState<KStory>(DEFAULT_KSTORY);
  const [story, setStory] = useState(DEFAULT_KSTORY.story);
  const [converted, setConverted] = useState(DEFAULT_CONVERTED);
  const [error, setError] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isAiConverting, setIsAiConverting] = useState(false);
  const [assistVisible, setAssistVisible] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(DEFAULT_SAMPLE_ID);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  
  // Layout states
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  
  // AI Integration states
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showAiSetup, setShowAiSetup] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [showClarifications, setShowClarifications] = useState(true);
  const [clarifications, setClarifications] = useState<ClarificationSummary>(EMPTY_CLARIFICATIONS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSample = selectedSampleId === CUSTOM_SAMPLE_ID ? undefined : getSampleById(selectedSampleId);

  const applyNormalizedKStory = useCallback((rawContent: string, options: NormalizeOptions = {}) => {
    const normalized = normalizeStoryAsset(rawContent, options);
    const resolvedSimpleScript = (normalized.simpleScript ?? safeCompileStoryToSimple(normalized.story)) as KStory['simpleScript'];

    setKStory({
      ...normalized,
      simpleScript: resolvedSimpleScript,
    });
    setStory(normalized.story);
    setConverted(resolvedSimpleScript ? JSON.stringify(resolvedSimpleScript, null, 2) : '');
    setClarifications(EMPTY_CLARIFICATIONS);
  }, [setClarifications]);

  const applyStoryText = useCallback((nextStory: string) => {
    setStory(nextStory);
    setKStory(prev => ({
      ...prev,
      story: nextStory,
    }));
  }, []);

  const handleConvert = useCallback(async () => {
    const trimmed = story.trim();
    if (!trimmed) {
      setError('Please enter a story first');
      setConverted('');
      setKStory(prev => ({
        ...prev,
        story: '',
        simpleScript: null,
      }));
      return;
    }

    setIsConverting(true);
    setError('');

    try {
      const result = storyToSimple(story);
      setConverted(result);

  const parsed = JSON.parse(result) as KStory['simpleScript'];
      setKStory(prev => ({
        ...prev,
        story,
        simpleScript: parsed,
      }));
    } catch (err) {
      setError(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`);
      setConverted('');
      setKStory(prev => ({
        ...prev,
        story,
        simpleScript: null,
      }));
    } finally {
      setIsConverting(false);
    }
  }, [story]);

  // Auto-convert when story changes
  useEffect(() => {
    if (!story.trim()) {
      setConverted('');
      setKStory(prev => ({
        ...prev,
        story: '',
        simpleScript: null,
      }));
      setError('');
      return;
    }

    void handleConvert();
  }, [story, handleConvert]);

  useEffect(() => {
    if (!story.trim()) {
      setClarifications(EMPTY_CLARIFICATIONS);
      return;
    }
    
    // Convert StoryInsights to NarrativeInsights format if available
    let narrativeInsights: NarrativeInsights | undefined;
    if (kstory.metadata?.insights) {
      const storyInsights = kstory.metadata.insights;
      narrativeInsights = {
        actors: storyInsights.actors,
        intents: storyInsights.actions, // Map actions to intents
        variables: storyInsights.resources.map(resource => ({
          name: resource.toLowerCase().replace(/\s+/g, '_'),
          description: resource,
          origins: ['system' as NarrativeVariableOrigin],
        })),
      };
    }
    
    const summary = computeClarifications(story, converted, narrativeInsights);
    setClarifications(summary);
  }, [story, converted, kstory.metadata?.insights]);

  const severitySummary = useMemo(() => {
    const totals: Record<ClarificationPrompt['severity'], number> = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    for (const prompt of clarifications.prompts) {
      totals[prompt.severity] += 1;
    }

    return totals;
  }, [clarifications.prompts]);

  const sortedPrompts = useMemo(() => {
    const rank: Record<ClarificationPrompt['severity'], number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    return [...clarifications.prompts].sort((a, b) => {
      const severityDiff = rank[a.severity] - rank[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.category.localeCompare(b.category);
    });
  }, [clarifications.prompts]);

  const insightTags = useMemo(() => {
    const actorNames = clarifications.insights.actors ?? [];
    const variableNames = clarifications.insights.variables.map(variable => variable.name);
    return {
      actorNames: actorNames.slice(0, 6),
      actorOverflow: Math.max(0, actorNames.length - 6),
      variableNames: variableNames.slice(0, 6),
      variableOverflow: Math.max(0, variableNames.length - 6),
    };
  }, [clarifications.insights.actors, clarifications.insights.variables]);

  const confidenceValue = clarifications.confidence ?? null;
  const confidencePercentage = confidenceValue !== null ? Math.round(confidenceValue * 100) : null;
  const confidenceBarWidth = confidenceValue !== null ? `${Math.round(confidenceValue * 100)}%` : '0%';
  const confidenceBarColor = confidenceValue === null
    ? '#94a3b8'
    : confidenceValue >= 0.7
    ? '#10b981'
    : confidenceValue >= 0.4
    ? '#f59e0b'
    : '#dc2626';

  // Initialize AI and load saved preferences
  useEffect(() => {
    const savedKey = localStorage.getItem('openai-api-key');
    if (savedKey) {
      setApiKey(savedKey);
      setAiEnabled(initializeAI());
    }

    // Load saved layout preferences
    const savedLayout = localStorage.getItem('kflow-layout-mode');
    const savedPanelWidth = localStorage.getItem('kflow-panel-width');
    
    if (savedLayout === 'horizontal' || savedLayout === 'vertical') {
      setLayoutMode(savedLayout);
    }
    if (savedPanelWidth) {
      const width = parseFloat(savedPanelWidth);
      if (width >= 20 && width <= 80) {
        setLeftPanelWidth(width);
      }
    }
  }, []);

  // Save layout preferences
  useEffect(() => {
    localStorage.setItem('kflow-layout-mode', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem('kflow-panel-width', leftPanelWidth.toString());
  }, [leftPanelWidth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setLayoutMode('horizontal');
            break;
          case '2':
            e.preventDefault();
            setLayoutMode('vertical');
            break;
          case 'g':
            e.preventDefault();
            setShowGraph(!showGraph);
            break;
          case 'f':
            e.preventDefault();
            setGraphFullscreen(!graphFullscreen);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showGraph, graphFullscreen]);

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

  const handleSampleSelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    setSelectedSampleId(nextId);
    setUploadedFilename(null);

    if (nextId === CUSTOM_SAMPLE_ID) {
      return;
    }

    const sample = getSampleById(nextId);
    if (sample) {
      applyNormalizedKStory(sample.content, { filename: `${sample.id}.story` });
      setError('');
    }
  }, [applyNormalizedKStory, setError]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 200 * 1024) {
      setError('Selected file is larger than 200KB. Please choose a smaller story file.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      applyNormalizedKStory(text, { filename: file.name });
      setSelectedSampleId(CUSTOM_SAMPLE_ID);
      setUploadedFilename(file.name);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read the selected file. Please try again.');
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [applyNormalizedKStory, setError]);

  const handleExampleLoad = useCallback(async (file: string) => {
    if (!file) return;
    setIsLoadingExample(true);
    try {
      const text = await loadExample(file);
      applyNormalizedKStory(text, { filename: file });
      setSelectedSampleId(CUSTOM_SAMPLE_ID);
      setUploadedFilename(file);
      setShowSuggestions(false);
      setError('');
    } catch (error) {
      console.error('Failed to load example file', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load example: ${message}`);
    } finally {
      setIsLoadingExample(false);
    }
  }, [applyNormalizedKStory, setError, setSelectedSampleId, setShowSuggestions, setUploadedFilename]);

  const handleAiConvertBrief = useCallback(async () => {
    const brief = story.trim();
    if (!brief) {
      setError('Please enter a brief or story before running AI conversion.');
      return;
    }

    const effectiveKey = apiKey.trim() || localStorage.getItem('openai-api-key') || '';
    if (!effectiveKey) {
      setShowAiSetup(true);
      setError('Add your OpenAI API key to run AI conversion.');
      return;
    }

    setIsAiConverting(true);
    setError('');
    try {
      const client = createOpenAIClient(effectiveKey);
      const blocks = await convertBriefsToKstory([brief], client);
      if (!blocks.length) {
        throw new Error('No KStory output returned by the model.');
      }

      const [firstBlock] = blocks;
      const match = firstBlock.match(/```kflow\s*([\s\S]*?)```/i);
      const extracted = (match ? match[1] : firstBlock)
        .replace(/^```kflow/i, '')
        .replace(/```$/i, '')
        .trim();

      if (!extracted) {
        throw new Error('Model response did not contain KStory content.');
      }

      applyNormalizedKStory(extracted, { filename: 'ai-converted.story' });
      setSelectedSampleId(CUSTOM_SAMPLE_ID);
      setUploadedFilename(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`AI conversion failed: ${message}`);
    } finally {
      setIsAiConverting(false);
    }
  }, [story, apiKey, applyNormalizedKStory, setSelectedSampleId, setUploadedFilename, setShowAiSetup, setError]);

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
  applyStoryText(newStory);
    setSelectedSampleId(CUSTOM_SAMPLE_ID);
    setUploadedFilename(null);
    setShowSuggestions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      const newCursorPos = previousLines.join('\n').length + (previousLines.length > 0 ? 1 : 0) + suggestion.text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [story, applyStoryText]);

  const handleStoryChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    applyStoryText(event.target.value);
    setSelectedSampleId(CUSTOM_SAMPLE_ID);
    setUploadedFilename(null);
  }, [applyStoryText]);

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

  // Resizer handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.getElementById('main-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    if (layoutMode === 'horizontal') {
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth)));
    } else {
      const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newHeight)));
    }
  }, [isDragging, layoutMode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = layoutMode === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, layoutMode]);
  return (
    <div style={{height:'100vh',width:'100vw',display:'flex',flexDirection:'column',fontFamily:'system-ui, sans-serif',background:'#f8fafc',overflow:'hidden'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid #e2e8f0',background:'#f8fafc'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <strong style={{color:'#2563eb'}}>Kflow Studio</strong>
          <span style={{fontSize:12,color:'#6b7280'}}>AI {aiEnabled? 'ON':'OFF'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>setLayoutMode('horizontal')} style={{padding:'4px 8px',background:layoutMode==='horizontal'?'#3b82f6':'#e5e7eb',color:layoutMode==='horizontal'?'#fff':'#374151',border:'none',borderRadius:4,cursor:'pointer'}}>Side</button>
          <button onClick={()=>setLayoutMode('vertical')} style={{padding:'4px 8px',background:layoutMode==='vertical'?'#3b82f6':'#e5e7eb',color:layoutMode==='vertical'?'#fff':'#374151',border:'none',borderRadius:4,cursor:'pointer'}}>Stack</button>
          <button onClick={()=>setShowGraph(g=>!g)} style={{padding:'4px 8px',background:showGraph?'#059669':'#6b7280',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>{showGraph?'Graph ON':'Graph OFF'}</button>
          <button onClick={()=>setShowAiSetup(s=>!s)} style={{padding:'4px 8px',background:aiEnabled?'#16a34a':'#f59e0b',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>{aiEnabled?'AI Ready':'Setup AI'}</button>
        </div>
      </header>

      {showAiSetup && (
        <div style={{padding:12,borderBottom:'1px solid #e5e7eb',background:'#fff',display:'flex',alignItems:'center',gap:8}}>
          <input type="password" value={apiKey} placeholder="OpenAI API Key" onChange={e=>setApiKey(e.target.value)} style={{flex:1,padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4}} />
          <button disabled={!apiKey.trim()} onClick={handleApiKeySetup} style={{padding:'6px 10px',background:'#059669',color:'#fff',border:'none',borderRadius:4,cursor:apiKey.trim()?'pointer':'not-allowed'}}>Activate</button>
          {aiEnabled && <button onClick={handleClearApiKey} style={{padding:'6px 10px',background:'#dc2626',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Clear</button>}
        </div>
      )}

      <div id="main-container" style={{flex:1,display:'flex',flexDirection:layoutMode==='horizontal'?'row':'column',overflow:'hidden',minHeight:0}}>
        <div style={{width:layoutMode==='horizontal'&&showGraph?`${leftPanelWidth}%`:'100%',height:layoutMode==='vertical'&&showGraph?`${leftPanelWidth}%`:'100%',display:'flex',flexDirection:'column',borderRight:showGraph&&layoutMode==='horizontal'?'1px solid #e5e7eb':'none',borderBottom:showGraph&&layoutMode==='vertical'?'1px solid #e5e7eb':'none',background:'#fff',minWidth:0,minHeight:0}}>
          <div style={{padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #e5e7eb',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:600}}>Story</span>
              <select value={selectedSampleId} onChange={handleSampleSelect} style={{padding:'4px 6px',border:'1px solid #d1d5db',borderRadius:4,fontSize:12,color:'#1f2937',background:'#fff',minWidth:180}}>
                <option value={CUSTOM_SAMPLE_ID}>Custom / Uploaded</option>
                {storySamples.map(sample => (
                  <option key={sample.id} value={sample.id}>{sample.name}</option>
                ))}
              </select>
              <select
                value={''}
                disabled={isLoadingExample}
                onChange={event => {
                  const file = event.target.value;
                  if (!file) return;
                  void handleExampleLoad(file);
                  event.currentTarget.value = '';
                }}
                style={{padding:'4px 6px',border:'1px solid #d1d5db',borderRadius:4,fontSize:12,color:'#1f2937',background:isLoadingExample ? '#e2e8f0' : '#e0f2fe',minWidth:200,marginLeft:8}}
              >
                <option value=''>Load from examples...</option>
                {exampleFiles.map(file => (
                  <option key={file.id} value={file.id}>{file.label}</option>
                ))}
              </select>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={handleUploadClick} style={{padding:'4px 8px',background:'#0ea5e9',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Upload Story</button>
              <button onClick={handleConvert} disabled={isConverting || isLoadingExample} style={{padding:'4px 8px',background:'#2563eb',color:'#fff',border:'none',borderRadius:4,cursor:isConverting||isLoadingExample?'not-allowed':'pointer'}}>{isConverting?'Converting...':isLoadingExample?'Loading...':'Convert'}</button>
              <button
                onClick={handleAiConvertBrief}
                disabled={isAiConverting || isLoadingExample}
                style={{padding:'4px 8px',background:'#4f46e5',color:'#fff',border:'none',borderRadius:4,cursor:isAiConverting||isLoadingExample?'not-allowed':'pointer'}}
              >
                {isAiConverting ? 'AI Converting...' : 'AI Convert'}
              </button>
              <button onClick={()=>setAssistVisible(v=>!v)} style={{padding:'4px 8px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>{assistVisible?'Hide Info':'Show Info'}</button>
              <button
                onClick={() => setShowClarifications(value => !value)}
                style={{
                  padding:'4px 8px',
                  background:showClarifications?'#0ea5e9':'#cbd5f5',
                  color:showClarifications?'#fff':'#1f2937',
                  border:'none',
                  borderRadius:4,
                  cursor:'pointer',
                }}
              >
                {showClarifications ? 'Clarifications ON' : 'Clarifications OFF'}
              </button>
              {showGraph && <button onClick={()=>setGraphFullscreen(true)} style={{padding:'4px 8px',background:'#3b82f6',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Fullscreen</button>}
            </div>
          </div>
          {activeSample && (
            <div style={{padding:'6px 12px',fontSize:12,color:'#4b5563',background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
              Loaded sample: <strong>{activeSample.name}</strong>
              {activeSample.description ? ` — ${activeSample.description}` : ''}
            </div>
          )}
          {uploadedFilename && selectedSampleId === CUSTOM_SAMPLE_ID && (
            <div style={{padding:'6px 12px',fontSize:12,color:'#0369a1',background:'#e0f2fe',borderBottom:'1px solid #bae6fd'}}>
              Loaded from file: <strong>{uploadedFilename}</strong>
            </div>
          )}
          {isLoadingExample && (
            <div style={{padding:'6px 12px',fontSize:12,color:'#0f172a',background:'#e2e8f0',borderBottom:'1px solid #cbd5e1'}}>
              Fetching example content…
            </div>
          )}
          <div style={{flex:1,position:'relative',display:'flex',flexDirection:'column',minHeight:0}}>
            <input ref={fileInputRef} type="file" accept=".txt,.story,.md,.yaml,.yml,.json,.kstory" style={{display:'none'}} onChange={handleFileChange} />
            <textarea ref={textareaRef} value={story} onChange={handleStoryChange} onKeyDown={handleTextareaKeyDown} style={{flex:1,minHeight:0,border:`2px solid ${aiEnabled?'#10b981':'#e5e7eb'}`,margin:12,borderRadius:6,padding:12,fontFamily:'Monaco, monospace',fontSize:14,resize:'none',background:aiEnabled?'#f0fdf4':'#fff'}} />
            {aiEnabled && <div style={{position:'absolute',top:14,right:20,background:'#10b981',color:'#fff',padding:'2px 6px',fontSize:10,borderRadius:3,fontWeight:600}}>AI ON</div>}
            {showSuggestions && suggestions.length>0 && (
              <div style={{position:'absolute',left:12,right:12,top:'calc(100% - 4px)',background:'#fff',border:'1px solid #10b981',borderRadius:6,boxShadow:'0 4px 12px rgba(0,0,0,0.15)',zIndex:20,maxHeight:180,overflowY:'auto'}}>
                <div style={{padding:6,fontSize:11,fontWeight:600,background:'#f0fdf4',color:'#059669'}}>AI Suggestions</div>
                {suggestions.map((s,i)=> (
                  <div key={i} onClick={()=>applySuggestion(s)} style={{padding:8,fontSize:12,cursor:'pointer',borderTop:'1px solid #f1f5f9'}}>{s.text}</div>
                ))}
              </div>
            )}
          </div>
          {error && <div style={{color:'#dc2626',background:'#fef2f2',border:'1px solid #fecaca',margin:12,padding:8,borderRadius:4,fontSize:12}}>Error: {error}</div>}
          {converted && assistVisible && (
            <pre style={{margin:12,background:'#f8fafc',border:'1px solid #e2e8f0',padding:12,borderRadius:6,fontSize:12,maxHeight:200,overflow:'auto'}}>{converted}</pre>
          )}
          {showClarifications && (
            <div
              style={{
                margin:'0 12px 12px',
                padding:'16px',
                border:'1px solid #e2e8f0',
                borderRadius:12,
                background:'#f8fafc',
                display:'flex',
                flexDirection:'column',
                gap:14,
                boxShadow:'0 10px 30px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <span style={{fontSize:12,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase',color:'#1f2937'}}>Analyst Clarifications</span>
                  <span style={{fontSize:12,color:'#475569'}}>{pluralize(clarifications.prompts.length, 'prompt')}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',justifyContent:'flex-end'}}>
                  {SEVERITY_ORDER.filter(level => severitySummary[level] > 0).map(level => (
                    <span
                      key={level}
                      style={{
                        fontSize:11,
                        fontWeight:600,
                        color:CLARIFICATION_TEXT[level],
                        background:CLARIFICATION_SURFACE[level],
                        padding:'4px 10px',
                        borderRadius:999,
                        border:`1px solid ${CLARIFICATION_PALETTE[level]}33`,
                      }}
                    >
                      {CLARIFICATION_SEVERITY_LABEL[level]} · {severitySummary[level]}
                    </span>
                  ))}
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:'#475569'}}>Confidence</span>
                    <div style={{width:120,height:6,background:'#e2e8f0',borderRadius:999,overflow:'hidden'}}>
                      <div style={{width:confidenceBarWidth,height:'100%',background:confidenceBarColor,transition:'width 0.25s ease'}} />
                    </div>
                    <span style={{fontSize:11,color:'#1f2937',fontWeight:600}}>
                      {confidencePercentage !== null ? `${confidencePercentage}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {clarifications.warnings.length > 0 && (
                <div
                  style={{
                    padding:'8px 10px',
                    borderRadius:10,
                    background:'#fff7ed',
                    color:'#9a3412',
                    fontSize:12,
                    border:'1px solid rgba(234, 179, 8, 0.35)'
                  }}
                >
                  <strong style={{marginRight:6}}>Warnings:</strong>
                  {clarifications.warnings.join(' • ')}
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:12}}>
                {sortedPrompts.map(prompt => (
                  <div
                    key={prompt.id}
                    style={{
                      padding:'12px',
                      borderRadius:12,
                      background:CLARIFICATION_SURFACE[prompt.severity],
                      border:`1px solid ${CLARIFICATION_PALETTE[prompt.severity]}33`,
                      boxShadow:'0 4px 12px rgba(15, 23, 42, 0.06)',
                      display:'flex',
                      flexDirection:'column',
                      gap:8
                    }}
                  >
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span
                        style={{
                          display:'inline-flex',
                          alignItems:'center',
                          justifyContent:'center',
                          width:22,
                          height:22,
                          borderRadius:'50%',
                          background:CLARIFICATION_PALETTE[prompt.severity],
                          color:'#fff',
                          fontSize:11,
                          fontWeight:700
                        }}
                      >
                        {CLARIFICATION_SEVERITY_LABEL[prompt.severity].charAt(0)}
                      </span>
                      <span style={{fontSize:11,color:'#1f2937',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase'}}>
                        {formatCategoryLabel(prompt.category)}
                      </span>
                    </div>
                    <div style={{fontSize:13,color:CLARIFICATION_TEXT[prompt.severity],fontWeight:600,lineHeight:1.5}}>{prompt.prompt}</div>
                    {prompt.suggestion && (
                      <div style={{fontSize:12,color:'#334155',lineHeight:1.55}}>{prompt.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{display:'flex',flexWrap:'wrap',gap:18,fontSize:12,color:'#475569'}}>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <strong style={{color:'#1f2937'}}>Actors</strong>
                  {insightTags.actorNames.length ? (
                    <>
                      {insightTags.actorNames.map(actor => (
                        <span key={actor} style={{padding:'2px 10px',background:'#e2e8f0',color:'#1f2937',borderRadius:999,fontSize:11,fontWeight:600}}>{actor}</span>
                      ))}
                      {insightTags.actorOverflow > 0 && (
                        <span style={{padding:'2px 10px',background:'#e0f2fe',color:'#0369a1',borderRadius:999,fontSize:11,fontWeight:600}}>+{insightTags.actorOverflow} more</span>
                      )}
                    </>
                  ) : (
                    <span style={{fontStyle:'italic',color:'#94a3b8'}}>none detected</span>
                  )}
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <strong style={{color:'#1f2937'}}>Variables</strong>
                  {insightTags.variableNames.length ? (
                    <>
                      {insightTags.variableNames.map(variable => (
                        <span key={variable} style={{padding:'2px 10px',background:'#ede9fe',color:'#5b21b6',borderRadius:999,fontSize:11,fontWeight:600}}>{variable}</span>
                      ))}
                      {insightTags.variableOverflow > 0 && (
                        <span style={{padding:'2px 10px',background:'#f3f4f6',color:'#374151',borderRadius:999,fontSize:11,fontWeight:600}}>+{insightTags.variableOverflow} more</span>
                      )}
                    </>
                  ) : (
                    <span style={{fontStyle:'italic',color:'#94a3b8'}}>none detected</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showGraph && (
          <div style={{display:'flex',flexDirection:layoutMode==='horizontal'?'row':'column',flex:1,minWidth:0,minHeight:0}}>
            <div onMouseDown={handleMouseDown} style={{width:layoutMode==='horizontal'?'4px':'100%',height:layoutMode==='vertical'?'4px':'100%',background:isDragging?'#3b82f6':'#e5e7eb',cursor:layoutMode==='horizontal'?'col-resize':'row-resize'}} />
            <div style={{flex:1,minWidth:0,minHeight:0,background:'#fff',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'6px 10px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,fontWeight:600}}>Graph</span>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setGraphFullscreen(true)} style={{padding:'4px 8px',background:'#3b82f6',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Fullscreen</button>
                </div>
              </div>
              <div style={{flex:1,minHeight:0}}>
                <WorkflowGraph 
                  key={`${kstory.sourceFilename}-${JSON.stringify(kstory.simpleScript)?.substring(0, 100)}`}
                  workflowData={kstory.simpleScript ?? null} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {graphFullscreen && (
        <div style={{position:'fixed',inset:0,background:'#fff',zIndex:9999,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid #e5e7eb'}}>
            <strong>Fullscreen Graph</strong>
            <button onClick={()=>setGraphFullscreen(false)} style={{padding:'4px 10px',background:'#dc2626',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Close</button>
          </div>
          <div style={{flex:1}}>
            <WorkflowGraph 
              key={`fullscreen-${kstory.sourceFilename}-${JSON.stringify(kstory.simpleScript)?.substring(0, 100)}`}
              workflowData={kstory.simpleScript ?? null} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
