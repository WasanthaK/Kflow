export interface StoryInsights {
  actors: string[];
  actions: string[];
  resources: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ACTOR_ALIASES: Record<string, string> = {
  'customer success manager': 'Customer Success Manager',
  'sales manager': 'Sales Manager',
  'finance manager': 'Finance Manager',
  'operations analyst': 'Operations Analyst',
  'operations team': 'Operations Team',
  'operations': 'Operations',
  'warehouse team': 'Warehouse',
  'warehouse': 'Warehouse',
  'warehouse analyst': 'Warehouse Analyst',
  'requester': 'Requester',
  'customer': 'Customer',
  'client': 'Customer',
  'user': 'Customer',
  'manager': 'Manager',
  'analyst': 'Analyst',
  'officer': 'Officer',
  'incident commander': 'Incident Commander',
  'compliance officer': 'Compliance Officer',
  'support engineer': 'Support Engineer',
  'engineer': 'Engineer',
  'finance': 'Finance',
  'billing': 'Finance',
  'finance analyst': 'Finance Analyst',
  'review board': 'Review Board',
  'system': 'Internal System',
  'automation': 'Internal System',
  'bot': 'Internal System',
  'team': 'Team',
};

const ACTION_KEYWORDS = [
  'collect',
  'verify',
  'check',
  'assign',
  'engage',
  'review',
  'approve',
  'reject',
  'notify',
  'send',
  'schedule',
  'wait',
  'archive',
  'capture',
  'monitor',
  'escalate',
  'prepare',
  'resolve',
  'calculate',
  'process',
  'update',
  'document',
  'coordinate',
  'confirm',
];

const RESOURCE_KEYWORDS = [
  'inventory',
  'pricing',
  'order',
  'ticket',
  'impact',
  'postmortem',
  'chat logs',
  'rush shipment',
  'ship date',
  'customer name',
  'requested items',
  'carrier pickup confirmation',
  'approval',
];

const ACTION_REGEX = new RegExp(`\\b(${ACTION_KEYWORDS.map(escapeRegExp).join('|')})\\b`, 'gi');
const RESOURCE_REGEX = new RegExp(`\\b(${RESOURCE_KEYWORDS.map(escapeRegExp).join('|')})\\b`, 'gi');

const actorRegex = (() => {
  const aliases = Object.keys(ACTOR_ALIASES)
    .sort((a, b) => b.length - a.length)
    .map(term => escapeRegExp(term));
  return new RegExp(`\\b(${aliases.join('|')})\\b`, 'gi');
})();

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function extractStoryInsights(text: string): StoryInsights {
  if (!text.trim()) {
    return { actors: [], actions: [], resources: [] };
  }

  const actors = new Set<string>();
  const actions = new Set<string>();
  const resources = new Set<string>();

  // Actors by alias detection
  for (const match of text.matchAll(actorRegex)) {
    const raw = match[1].toLowerCase();
    const mapped = ACTOR_ALIASES[raw];
    if (mapped) {
      actors.add(mapped);
    } else {
      actors.add(titleCase(raw));
    }
  }

  // Actors from sentence patterns "The X should|must"
  for (const match of text.matchAll(/\bthe\s+([a-z\s]+?)\s+(?:should|must|needs to|will|shall)\b/gi)) {
    const candidate = match[1].trim().toLowerCase();
    if (!candidate) continue;
    const mapped = ACTOR_ALIASES[candidate];
    if (mapped) {
      actors.add(mapped);
    } else {
      actors.add(titleCase(candidate));
    }
  }

  // Actors inferred from braces like {manager}
  for (const match of text.matchAll(/\{([^}]+)\}/g)) {
    const token = match[1].replace(/_/g, ' ').trim().toLowerCase();
    if (token.endsWith('manager') || token.endsWith('analyst') || token.endsWith('owner')) {
      actors.add(titleCase(token));
    }
  }

  // Extract actions
  for (const match of text.matchAll(ACTION_REGEX)) {
    const verb = match[1].toLowerCase();
    actions.add(verb);
  }

  // Capture richer action phrases (verb + object up to comma or and)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    const actionMatch = lower.match(/\b(collect|verify|assign|notify|send|schedule|wait|review|approve|reject|engage|escalate|calculate|process|update|confirm|document|resolve)\b/);
    if (actionMatch) {
      const verb = actionMatch[1];
      const start = lower.indexOf(verb);
      const slice = sentence.slice(start);
      const phrase = slice.split(/\band\b|\.|,/i)[0].trim();
      if (phrase.length > 3) {
        actions.add(phrase.replace(/\s+/g, ' '));
      }
    }
  });

  // Resources from braces and keywords
  for (const match of text.matchAll(/\{([^}]+)\}/g)) {
    const token = match[1].replace(/_/g, ' ').trim();
    resources.add(titleCase(token));
  }

  for (const match of text.matchAll(RESOURCE_REGEX)) {
    const resource = match[1].toLowerCase();
    resources.add(titleCase(resource));
  }

  // Resources that follow "for" or "with"
  for (const match of text.matchAll(/\b(?:for|with)\s+([a-z\s]{3,40}?)(?:,|\.|and|before)/gi)) {
    const candidate = match[1].trim();
    if (candidate && !/\b(?:to|the|a|an|and|when|if)\b/i.test(candidate)) {
      resources.add(titleCase(candidate));
    }
  }

  return {
    actors: dedupe(Array.from(actors)),
    actions: dedupe(Array.from(actions)).sort(),
    resources: dedupe(Array.from(resources)),
  };
}
