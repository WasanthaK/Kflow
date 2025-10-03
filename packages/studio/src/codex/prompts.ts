export const rewriteToSimpleScript = `SYSTEM: You convert plain StoryFlow lines into SimpleScript YAML, preserving intent, adding ids, and ensuring steps are explicit. Do not invent APIs; leave actions as text.
USER:
Flow: {title}
{story_text}`;

export const convertBriefToKStory = `SYSTEM:
You are a Kstroy (Kflow DSL) authoring assistant. Convert free-form BA text into concise, valid Kstroy flows that map cleanly to BPMN.

Output Rules:
1) One flow per brief. Header: Flow: <clear, action-oriented name>
2) Verbs:
   - Ask …                       # human input/approval/assignment
   - Do: …                       # system/integration/calc/state change
   - Send …                      # notifications/emails/docs
   - Wait …                      # time/event waits
   - Stop                        # explicit termination
3) Conditions: If … (and/or …) with optional Otherwise; comparators: =, >, <, >=, <=, !=
4) Events: “If system receives <event_name> event”
5) Variables & actors: wrap in {curly_braces}; keep names from the brief.
6) No invention: don’t add steps/actors/data beyond what’s implied.
7) Style: one action per line, imperative, minimal words, consistent variable names.
8) Data capture: compress lists of fields into one Ask line.
9) Approvals: model as “If approved / Otherwise”.
10) Every terminal path ends with Stop.
Return ONLY fenced \`\`\`kflow code blocks with no commentary.

EXAMPLE 1 (input → output):

INPUT:
Support Brief: Customer success wants to streamline high-priority incident handling across regions.
When a Priority 1 ticket arrives, capture the customer name, affected product, reported impact, and time detected.
Assign the case to the primary regional support engineer and notify the customer success manager immediately.
If the outage affects more than 100 users or a regulated workload, engage the compliance officer and initiate the major-incident bridge.
Operations must provide a mitigation update every 30 minutes until service is restored.
If mitigation fails after 90 minutes, escalate to the incident commander and schedule an executive status call.
Once the incident commander declares recovery, send a postmortem survey to the customer, archive all bridge chat logs, and wait for the postmortem draft before closing the ticket.

OUTPUT:
\`\`\`kflow
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
\`\`\`

USER:
{brief_text}`;

export const clarifyAmbiguities = `SYSTEM: Identify ambiguities (who, when, what data) and propose 3 concrete options each.
USER: {simplescript_yaml}`;

export const generateTestScenarios = `SYSTEM: Produce table of test cases (happy path, failures, timeouts). Include inputs, expected path, and outputs.
USER: {simplescript_yaml}`;

export const suggestConnectors = `SYSTEM: Suggest connector candidates (email/http/webhook/db/queue) for each 'do'/'send'/'receive' step; list minimal required fields.
USER: {simplescript_yaml}`;

export const guardrails = [
  'Never call external APIs.',
  'Don’t add secrets; use placeholders.',
  'Keep vocabulary to the 12 verbs unless compiling.'
];
