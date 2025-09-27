import OpenAI from 'openai';
import { WORKFLOW_PATTERNS, detectWorkflowType, getContextualPrompt, SMART_COMPLETIONS } from './workflow-patterns.js';

export interface AutocompleteSuggestion {
  text: string;
  type: 'action' | 'actor' | 'condition' | 'system' | 'continuation' | 'pattern';
  confidence: number;
  description?: string;
  category?: string;
}

export interface AutocompleteContext {
  currentLine: string;
  previousLines: string[];
  cursorPosition: number;
  workflowDomain?: string;
}

export class StoryFlowAutocomplete {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async getSuggestions(context: AutocompleteContext): Promise<AutocompleteSuggestion[]> {
    try {
      const prompt = this.buildAutocompletePrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.getFallbackSuggestions(context);
      }

      return this.parseSuggestions(content);
      
    } catch (error) {
      console.error('AI autocomplete failed:', error);
      return this.getFallbackSuggestions(context);
    }
  }

  private getSystemPrompt(): string {
    return `You are an intelligent StoryFlow writing assistant. Your job is to help users write workflow narratives by suggesting contextually appropriate next steps, actions, actors, and conditions.

STORYFLOW LANGUAGE RULES:
1. **Flow Declaration**: Must start with "Flow: [Name]"
2. **Actions**: Ask, Do, Send, Receive, Wait, Stop, Remember
3. **Actors**: People/roles who perform actions (manager, employee, customer, system)
4. **Conditions**: If/Otherwise statements for branching logic
5. **Variables**: Use {variable_name} for dynamic data
6. **Indentation**: Use spaces for nested steps under conditions

CONTEXT ANALYSIS:
- Analyze the workflow domain (HR, ecommerce, approval, etc.)
- Consider the logical flow and what typically comes next
- Suggest both generic and domain-specific options
- Prioritize common workflow patterns

SUGGESTION TYPES:
- **action**: Workflow verbs (Ask, Do, Send, etc.)
- **actor**: People/roles who perform actions  
- **condition**: If/Otherwise logic
- **system**: Target systems or services
- **continuation**: Complete phrases or next steps

OUTPUT FORMAT:
Return suggestions as JSON array:
[
  {
    "text": "suggested text",
    "type": "action|actor|condition|system|continuation", 
    "confidence": 0.8,
    "description": "Brief explanation"
  }
]

Focus on practical, commonly used workflow patterns. Prioritize suggestions that help users build complete, executable workflows.`;
  }

  private buildAutocompletePrompt(context: AutocompleteContext): string {
    const { currentLine, previousLines, cursorPosition, workflowDomain } = context;
    
    const beforeCursor = currentLine.substring(0, cursorPosition);
    const afterCursor = currentLine.substring(cursorPosition);
    
    return `Analyze this StoryFlow being written and suggest contextually appropriate continuations:

WORKFLOW CONTEXT:
${previousLines.length > 0 ? previousLines.join('\n') : 'Flow: [New Workflow]'}

CURRENT LINE: "${currentLine}"
CURSOR POSITION: ${cursorPosition}
TEXT BEFORE CURSOR: "${beforeCursor}"
TEXT AFTER CURSOR: "${afterCursor}"
${workflowDomain ? `DOMAIN: ${workflowDomain}` : ''}

ANALYSIS NEEDED:
1. What type of input is the user likely trying to complete?
2. What are the logical next steps in this workflow?
3. What actors, actions, or conditions would make sense here?
4. Are there common patterns for this workflow type?

Provide 3-5 most relevant suggestions that would help the user continue writing their workflow effectively.`;
  }

  private parseSuggestions(content: string): AutocompleteSuggestion[] {
    try {
      const jsonMatch = content.match(/\[([\s\S]*)\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.filter((s: any) => s.text && s.type);
      }
      
      return this.parseSimpleSuggestions(content);
    } catch (error) {
      console.error('Failed to parse AI suggestions:', error);
      return [];
    }
  }

  private parseSimpleSuggestions(content: string): AutocompleteSuggestion[] {
    const lines = content.split('\n').filter(line => line.trim());
    const suggestions: AutocompleteSuggestion[] = [];
    
    for (const line of lines) {
      if (line.includes('Ask ') || line.includes('Do ') || line.includes('Send ')) {
        suggestions.push({
          text: line.trim(),
          type: 'action',
          confidence: 0.7
        });
      }
    }
    
    return suggestions.slice(0, 5);
  }

  private getFallbackSuggestions(context: AutocompleteContext): AutocompleteSuggestion[] {
    const { currentLine, previousLines } = context;
    const suggestions: AutocompleteSuggestion[] = [];
    const fullText = previousLines.join('\n') + '\n' + currentLine;
    const workflowType = detectWorkflowType(fullText);
    
    // Check if we're at the start or need a flow declaration
    if (previousLines.length === 0 && !currentLine.startsWith('Flow:')) {
      suggestions.push({
        text: 'Flow: ',
        type: 'continuation',
        confidence: 0.9,
        description: 'Start with workflow name'
      });
    }
    
    // Smart pattern completions based on current input
    const trimmedLine = currentLine.trim();
    
    if (trimmedLine === 'Ask' || trimmedLine === 'Ask ') {
      SMART_COMPLETIONS.askPatterns.forEach(pattern => {
        suggestions.push({
          text: pattern,
          type: 'pattern',
          confidence: 0.7,
          description: 'Common ask pattern'
        });
      });
    }
    
    if (trimmedLine === 'Do:' || trimmedLine === 'Do: ') {
      SMART_COMPLETIONS.doPatterns.forEach(pattern => {
        suggestions.push({
          text: pattern,
          type: 'pattern', 
          confidence: 0.7,
          description: 'Common action pattern'
        });
      });
    }
    
    if (trimmedLine === 'Send' || trimmedLine === 'Send ') {
      SMART_COMPLETIONS.sendPatterns.forEach(pattern => {
        suggestions.push({
          text: pattern,
          type: 'pattern',
          confidence: 0.7,
          description: 'Common send pattern'
        });
      });
    }
    
    if (trimmedLine === 'If' || trimmedLine === 'If ') {
      SMART_COMPLETIONS.ifPatterns.forEach(pattern => {
        suggestions.push({
          text: pattern,
          type: 'condition',
          confidence: 0.7,
          description: 'Common condition pattern'
        });
      });
    }
    
    // Common action starters when line is empty
    if (!currentLine.trim() || currentLine.match(/^\s*$/)) {
      const actions = [
        { text: 'Ask ', type: 'action' as const, desc: 'Request input or approval' },
        { text: 'Do: ', type: 'action' as const, desc: 'Perform an action' },
        { text: 'Send ', type: 'action' as const, desc: 'Send message or data' },
        { text: 'If ', type: 'condition' as const, desc: 'Add conditional logic' },
        { text: 'Stop', type: 'action' as const, desc: 'End the workflow' }
      ];
      
      actions.forEach(action => {
        suggestions.push({
          text: action.text,
          type: action.type,
          confidence: 0.6,
          description: action.desc
        });
      });
      
      // Add workflow-specific suggestions
      if (workflowType) {
        const pattern = WORKFLOW_PATTERNS[workflowType];
        pattern.commonActions.forEach(action => {
          suggestions.push({
            text: action,
            type: 'action',
            confidence: 0.8,
            description: `Common ${workflowType} action`,
            category: workflowType
          });
        });
      }
    }
    
    return suggestions.slice(0, 8);
  }
}