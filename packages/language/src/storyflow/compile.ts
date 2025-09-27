// Enhanced StoryFlow to SimpleScript compiler with BPMN compliance
export function storyToSimple(story: string): string {
  return storyToSimpleRuleBased(story);
}

export function storyToSimpleRuleBased(story: string): string {
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
  
  // 3. Extract actor references and add them as template variables
  const actors = story.match(/\b(manager|employee|user|customer|admin|supervisor|owner|agent|lead)\b/gi) || [];
  const uniqueActors = [...new Set(actors.map(a => a.toLowerCase()))];
  uniqueActors.forEach(actor => {
    if (!vars[actor] && !uniqueTemplateVars.includes(actor)) {
      vars[actor] = `workflow actor`;
    }
  });

  // 4. Extract system references
  const systems = story.match(/\b(HR system|database|API|server|service|application|system|platform)\b/gi) || [];
  const uniqueSystems = [...new Set(systems.map(s => s.toLowerCase().replace(/\s+/g, '_')))];
  uniqueSystems.forEach(system => {
    const systemVar = system.replace(/\s+/g, '_');
    if (!vars[systemVar] && !uniqueTemplateVars.includes(systemVar)) {
      vars[systemVar] = `target system`;
    }
  });

  // 5. Extract action verbs that could be parameterized
  const actions = story.match(/\b(update|create|send|delete|modify|insert|process|execute|run|call)\b/gi) || [];
  const uniqueActions = [...new Set(actions.map(a => a.toLowerCase()))];
  uniqueActions.forEach(action => {
    if (!vars[action] && !uniqueTemplateVars.includes(action)) {
      vars[action] = `workflow action`;
    }
  });
  
  // Helper function to convert references to template variables
  const convertToTemplates = (text: string): string => {
    let converted = text;
    
    // Convert actors
    uniqueActors.forEach(actor => {
      if (!uniqueTemplateVars.includes(actor)) {
        const regex = new RegExp(`\\b${actor}\\b`, 'gi');
        converted = converted.replace(regex, `{${actor}}`);
      }
    });
    
    // Convert systems  
    uniqueSystems.forEach(system => {
      const originalSystem = system.replace(/_/g, ' ');
      if (!uniqueTemplateVars.includes(system)) {
        const regex = new RegExp(`\\b${originalSystem}\\b`, 'gi');
        converted = converted.replace(regex, `{${system}}`);
      }
    });
    
    // Convert actions (only at the beginning of action phrases)
    uniqueActions.forEach(action => {
      if (!uniqueTemplateVars.includes(action)) {
        const regex = new RegExp(`\\b${action}\\b(?=\\s)`, 'gi');
        converted = converted.replace(regex, `{${action}}`);
      }
    });
    
    return converted;
  };

  // Convert lines to steps with template variable conversion and enhanced task types
  const steps = lines
    .filter(l => !/^flow:|^trigger:/i.test(l))
    .map(l => {
      // Handle control flow structures properly
      if (/^if\s+/i.test(l)) {
        return { 
          if: convertToTemplates(l.replace(/^if\s+/i, '').trim())
        };
      }
      if (/^otherwise/i.test(l)) {
        return { 
          otherwise: true
        };
      }
      
      // Enhanced task type detection
      if (/^ask /i.test(l)) {
        return { 
          userTask: {
            description: convertToTemplates(l.slice(4).trim()),
            assignee: extractAssignee(l),
            type: 'human_input'
          }
        };
      }
      
      // Service tasks (automated system operations)
      if (/^do:\s*(create|update|delete|insert|process|execute|call|run|api|database)/i.test(l)) {
        return { 
          serviceTask: {
            description: convertToTemplates(l.replace(/^do:?\s*/i,'')),
            type: 'system_operation'
          }
        };
      }
      
      // Manual tasks (human work)
      if (/^do:\s*(review|approve|check|verify|inspect|examine|sign|validate)/i.test(l)) {
        return { 
          manualTask: {
            description: convertToTemplates(l.replace(/^do:?\s*/i,'')),
            type: 'human_work'
          }
        };
      }
      
      // Script tasks (calculations/transformations/data processing)
      if (/^do:\s*(calculate|compute|transform|parse|analyze|format|sum|average|total|count|aggregate|convert|round|truncate|normalize|validate|encrypt|decrypt|hash|encode|decode|sort|filter|map|reduce|merge|split|join|extract|generate|derive|interpolate|extrapolate|reconcile|balance)/i.test(l)) {
        const description = l.replace(/^do:?\s*/i,'');
        const taskSubtype = getScriptTaskSubtype(description);
        return { 
          scriptTask: {
            description: convertToTemplates(description),
            type: 'computation',
            subtype: taskSubtype,
            executable: isExecutableScript(description)
          }
        };
      }
      
      // Business rule tasks
      if (/^do:\s*(evaluate|determine|decide|classify|assess)/i.test(l)) {
        return { 
          businessRuleTask: {
            description: convertToTemplates(l.replace(/^do:?\s*/i,'')),
            type: 'rule_evaluation'
          }
        };
      }
      
      // Generic do task
      if (/^do:/i.test(l) || /^do /i.test(l)) return { do: convertToTemplates(l.replace(/^do:?\s*/i,'')) };
      
      // Message tasks
      if (/^send /i.test(l)) {
        return {
          messageTask: {
            description: convertToTemplates(l.slice(5).trim()),
            type: 'send',
            messageType: extractMessageType(l)
          }
        };
      }
      
      // Wait tasks
      if (/^wait /i.test(l)) {
        return {
          waitTask: {
            description: convertToTemplates(l.slice(5).trim()),
            type: 'timer'
          }
        };
      }
      
      if (/^receive /i.test(l)) return { receive: convertToTemplates(l.slice(8).trim()) };
      if (/^stop/i.test(l)) return { endEvent: { type: 'terminate' } };
      
      return { remember: { note: l } };
    });
    
  // Helper functions for enhanced parsing
  function extractAssignee(line: string): string | undefined {
    const match = line.match(/ask\s+([^{\s]+)/i);
    return match ? match[1] : undefined;
  }
  
  function extractMessageType(line: string): string {
    if (line.includes('email')) return 'email';
    if (line.includes('notification')) return 'notification';
    if (line.includes('sms')) return 'sms';
    if (line.includes('slack')) return 'slack';
    return 'message';
  }

  function getScriptTaskSubtype(description: string): string {
    // Financial calculations
    if (/calculate|compute|sum|average|total|interest|payment|tax|discount|profit|loss|roi|depreciation/i.test(description)) {
      return 'financial_calculation';
    }
    
    // Data transformations
    if (/transform|convert|format|normalize|encode|decode|parse|extract|merge|split|join/i.test(description)) {
      return 'data_transformation';
    }
    
    // Statistical/analytical
    if (/analyze|aggregate|count|average|median|variance|correlation|trend|forecast/i.test(description)) {
      return 'statistical_analysis';
    }
    
    // Validation/verification
    if (/validate|verify|check|reconcile|balance|audit|confirm/i.test(description)) {
      return 'data_validation';
    }
    
    // Security operations
    if (/encrypt|decrypt|hash|sign|authenticate|authorize|token/i.test(description)) {
      return 'security_operation';
    }
    
    // String/text processing
    if (/generate|derive|interpolate|concatenate|substring|replace|regex/i.test(description)) {
      return 'text_processing';
    }
    
    return 'general_computation';
  }

  function isExecutableScript(description: string): boolean {
    // Check if the description contains executable elements
    const executablePatterns = [
      /using\s+(formula|function|algorithm|script|code)/i,
      /with\s+(parameters|arguments|inputs)/i,
      /=\s*[^=]/,  // Assignment or equals
      /\+|\-|\*|\//,  // Math operators
      /\(\s*.*\s*\)/,  // Function calls
      /{[^}]+}\s*[+\-*\/=]/,  // Variable operations
    ];
    
    return executablePatterns.some(pattern => pattern.test(description));
  }

  return JSON.stringify({ flow: title, vars, steps }, null, 2);
}
