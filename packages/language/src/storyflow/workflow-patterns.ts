export const WORKFLOW_PATTERNS = {
  approval: {
    name: 'Approval Workflow',
    keywords: ['approve', 'approval', 'review', 'accept', 'reject', 'decision'],
    commonActions: [
      'Ask manager to approve',
      'Send approval notification',
      'Do: update approval status',
      'If approved'
    ],
    variables: ['approver', 'approval_status', 'request_id']
  },
  
  ecommerce: {
    name: 'E-commerce Order Processing',
    keywords: ['order', 'payment', 'inventory', 'shipping', 'product', 'customer'],
    commonActions: [
      'Ask customer for payment details',
      'Do: process payment',
      'Do: reserve inventory',
      'Send order confirmation'
    ],
    variables: ['order_id', 'payment_amount', 'customer_id', 'product_id']
  },
  
  hr: {
    name: 'HR Process',
    keywords: ['employee', 'vacation', 'onboarding', 'training', 'performance'],
    commonActions: [
      'Ask HR for approval',
      'Do: update employee record',
      'Send notification to manager',
      'Wait for HR response'
    ],
    variables: ['employee_id', 'manager', 'hr_system', 'approval_date']
  },
  
  support: {
    name: 'Customer Support',
    keywords: ['ticket', 'issue', 'customer', 'support', 'resolution', 'escalate'],
    commonActions: [
      'Ask customer for issue details',
      'Do: create support ticket',
      'Ask agent to investigate',
      'Send status update'
    ],
    variables: ['ticket_id', 'customer_id', 'agent', 'issue_description']
  },
  
  financial: {
    name: 'Financial Process',
    keywords: ['payment', 'invoice', 'budget', 'expense', 'calculation', 'audit'],
    commonActions: [
      'Do: calculate total amount',
      'Ask finance team for approval',
      'Do: process payment',
      'Send payment confirmation'
    ],
    variables: ['amount', 'invoice_id', 'payment_date', 'finance_team']
  }
};

export const SMART_COMPLETIONS = {
  askPatterns: [
    'Ask {actor} to approve the {item}',
    'Ask {actor} for {information}',
    'Ask {system} to process {data}',
    'Ask {actor} to review {document}',
    'Ask {actor} to verify {details}'
  ],
  
  doPatterns: [
    'Do: update {system} with {data}',
    'Do: create {item} in {system}',
    'Do: process {data} using {method}',
    'Do: calculate {value} from {inputs}',
    'Do: validate {data} against {rules}'
  ],
  
  sendPatterns: [
    'Send email to {recipient}: "{message}"',
    'Send notification to {actor}',
    'Send {document} to {recipient}',
    'Send confirmation to {actor}',
    'Send update to {stakeholder}'
  ],
  
  ifPatterns: [
    'If {condition} is true',
    'If {status} is "approved"',
    'If {value} > {threshold}',
    'If {actor} confirms',
    'If {system} responds'
  ]
};

export function detectWorkflowType(text: string): keyof typeof WORKFLOW_PATTERNS | null {
  const textLower = text.toLowerCase();
  
  for (const [type, pattern] of Object.entries(WORKFLOW_PATTERNS)) {
    const matchCount = pattern.keywords.filter(keyword => 
      textLower.includes(keyword.toLowerCase())
    ).length;
    
    if (matchCount >= 2) {
      return type as keyof typeof WORKFLOW_PATTERNS;
    }
  }
  
  return null;
}

export function getContextualPrompt(workflowType: keyof typeof WORKFLOW_PATTERNS | null): string {
  if (!workflowType) return 'Generic workflow assistance';
  
  const pattern = WORKFLOW_PATTERNS[workflowType];
  return `${pattern.name} context - common actions include: ${pattern.commonActions.join(', ')}`;
}