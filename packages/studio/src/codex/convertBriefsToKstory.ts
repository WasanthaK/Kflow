import OpenAI from 'openai';

export interface ConvertBriefsOptions {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  retries: number;
}

export type ResponsesClient = Pick<OpenAI, 'responses'>;

const SYSTEM_PROMPT = `You are a Kstroy (Kflow DSL) authoring assistant. Convert free-form BA text into concise, valid Kstroy flows that map to BPMN.

Output Rules:
1) One flow per brief. Header: Flow: <clear, action-oriented name>
2) Verbs:
   - Ask …                       # human input/approval/assignment
   - Do: …                       # system/integration/calc/state change
   - Send …                      # notifications/emails/docs
   - Wait …                      # time/event waits
   - Stop                        # explicit termination
3) Conditions: If … (and/or …) with optional Otherwise; comparators: =, >, <, >=, <=, !=
4) Events: "If system receives <event_name> event"
5) Variables & actors: wrap in {curly_braces}; keep names from the brief.
6) No invention beyond what’s implied.
7) One action per line; consistent variable names.
8) Data capture: compress lists into one Ask line.
9) Approvals: "If approved / Otherwise".
10) Every terminal path ends with Stop.
Return ONLY fenced \`\`\`kflow code blocks with no commentary.`;

const EXAMPLE_INPUT_1 = `Support Brief: Customer success wants to streamline high-priority incident handling across regions.
When a Priority 1 ticket arrives, capture the customer name, affected product, reported impact, and time detected.
Assign the case to the primary regional support engineer and notify the customer success manager immediately.
If the outage affects more than 100 users or a regulated workload, engage the compliance officer and initiate the major-incident bridge.
Operations must provide a mitigation update every 30 minutes until service is restored.
If mitigation fails after 90 minutes, escalate to the incident commander and schedule an executive status call.
Once the incident commander declares recovery, send a postmortem survey to the customer, archive all bridge chat logs, and wait for the postmortem draft before closing the ticket.`;

const EXAMPLE_OUTPUT_1 = `\`\`\`kflow
Flow: Priority 1 Incident Handling

Ask service_desk for {customer_name}, {affected_product}, {reported_impact}, {detected_time}
Do: create incident ticket in {itsm_system}
Do: store {ticket_id}

Ask regional_primary_engineer to take ownership of {ticket_id}
Send notification to customer_success_manager: "P1 ticket {ticket_id} received for {affected_product}."

If {affected_users} > 100 or {workload_type} = "regulated"
  Ask compliance_officer to engage on {ticket_id}
  Do: initiate major_incident_bridge for {ticket_id}

Do: schedule mitigation updates every 30 minutes for {ticket_id}
Wait 30 minutes for mitigation update

If {mitigation_duration_minutes} >= 90 and {service_restored} != true
  Ask incident_commander to lead escalation for {ticket_id}
  Do: schedule executive status call

If {incident_commander_recovery_declared} = true
  Send survey to {customer_name}: "Postmortem feedback for {ticket_id}"
  Do: archive bridge chat logs for {ticket_id}
  Wait for {postmortem_draft}
  Do: close {ticket_id}
  Stop
\`\`\``;

const EXAMPLE_INPUT_2 = `Requirement Brief: The sales manager needs a simple approval flow for rush orders. When a rush order request arrives, collect the customer name, requested items, and promised ship date. The operations analyst should verify inventory availability in the warehouse system. If stock is available and the order value is greater than $5,000, the finance manager must review the pricing and either approve or reject. For rejected requests, notify the requester with the reason and stop. When approved, send an email confirmation to the requester, schedule a rush shipment, and wait for the carrier pickup confirmation before closing the request.`;

const EXAMPLE_OUTPUT_2 = `\`\`\`kflow
Flow: Rush Order Approval

Ask requester for {customer_name}, {requested_items}, {promised_ship_date}
Do: capture rush order in {order_system}
Ask operations_analyst to verify {inventory_availability} in {warehouse_system}

If {inventory_availability} = true and {order_value} > 5000
  Ask finance_manager to review pricing for {requested_items}
  If approved
    Send email to requester: "Approved"
    Do: schedule rush_shipment for {requested_items}
    Wait for {carrier_pickup_confirmation}
    Do: close rush order
    Stop
  Otherwise
    Send email to requester: "Not approved — {reason}"
    Stop
Otherwise
  Send email to requester: "Insufficient stock or value threshold not met"
  Stop
\`\`\``;

const DEFAULT_OPTIONS: ConvertBriefsOptions = {
  model: 'o4-mini',
  temperature: 0.2,
  maxOutputTokens: 6400,
  retries: 2,
};

// Models that don't support temperature parameter
const MODELS_WITHOUT_TEMPERATURE = ['o4-mini', 'o1-mini', 'o1-preview', 'o1'];

export async function convertBriefsToKstory(
  briefs: string[],
  client: ResponsesClient,
  options: Partial<ConvertBriefsOptions> = {}
): Promise<string[]> {
  if (!Array.isArray(briefs) || briefs.length === 0) {
    throw new Error('Provide a non-empty array of BA briefs.');
  }

  const resolved: ConvertBriefsOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const joined = briefs
    .map((brief, index) => `### BRIEF ${index + 1}\n${brief.trim()}`)
    .join('\n\n');

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: `Example input:\n${EXAMPLE_INPUT_1}` },
    { role: 'assistant' as const, content: EXAMPLE_OUTPUT_1 },
    { role: 'user' as const, content: `Example input:\n${EXAMPLE_INPUT_2}` },
    { role: 'assistant' as const, content: EXAMPLE_OUTPUT_2 },
    {
      role: 'user' as const,
      content:
        'Convert each of the following briefs to Kstroy. Return only ```kflow code blocks, one block per brief, in the same order as provided.\n\n' +
        joined,
    },
  ];

  let attempt = 0;
  let lastError: unknown;
  
  // Check if model supports temperature parameter
  const supportsTemperature = !MODELS_WITHOUT_TEMPERATURE.includes(resolved.model);

  while (attempt <= resolved.retries) {
    try {
      const payload: Parameters<ResponsesClient['responses']['create']>[0] = {
        model: resolved.model,
        max_output_tokens: resolved.maxOutputTokens,
        input: messages,
      };

      if (supportsTemperature && typeof resolved.temperature === 'number') {
        (payload as { temperature: number }).temperature = resolved.temperature;
      }

      const response = await client.responses.create(payload);

      const text = (response as { output_text?: string }).output_text ?? '';
      const blocks = extractKflowBlocks(text);

      if (blocks.length === briefs.length) {
        return blocks;
      }

      if (blocks.length === 0) {
        throw new Error('No kflow blocks found in model output.');
      }

      return blocks;
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > resolved.retries) {
        break;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error('Failed to convert briefs after retries.');
}

export function extractKflowBlocks(text: string): string[] {
  const regex = /```kflow[\s\S]*?```/g;
  const matches = text.match(regex) || [];
  return matches.map(block => block.trim());
}

export function createOpenAIClient(apiKey: string): OpenAI {
  if (!apiKey) {
    throw new Error('Missing OpenAI API key');
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export { SYSTEM_PROMPT, EXAMPLE_INPUT_1, EXAMPLE_OUTPUT_1, EXAMPLE_INPUT_2, EXAMPLE_OUTPUT_2, DEFAULT_OPTIONS };
