import { describe, expect, it } from 'vitest';
import { storyToIr } from '../src/storyflow/compile';
import { irToBpmnXml } from '../src/compile/bpmn';
import { assertValidBpmn } from './utils/bpmnModdle';

const incidentStory = `Flow: Cross-Region Latency Spike Response

If system receives sustained_latency_above_400ms_5min event
  Ask monitoring_platform for {affected_services}, {customer_cohorts}, {timestamped_metrics}
  Ask on_call_site_reliability_engineer to validate alert for {affected_services}
  Do: initiate incident_bridge for {incident_id}
  Do: assign status_scribe for {incident_id}
  If {customer_impact} > {enterprise_SLA_threshold} or {workload_type} = "regulated"
    Send notification to compliance_steward: "Impact exceeds SLA or regulated workload on {affected_services}"
    Do: open severity_one_pager for {incident_id}
  Ask capacity_management to analyze {auto_scaling_events}
  If {saturation_percent} > 85
    Ask capacity_management to request emergency_compute_credits for {incident_id}
  Ask communications_lead for {customer_advisories}, {status_page_update}
  Do: queue {status_page_update} pending approval for {incident_id}

If system receives stabilized_latency_under_200ms_10min event
  Do: convene executive_review for {incident_id}
  Ask executive_review_team to decide {go_no_go}
  If {go_no_go} = "go"
    Send announcement to all: "Resolution declared for {affected_services}"
    Do: schedule post_incident_retrospective capturing {root_cause}, {follow_up_actions}, {ownership}
    Stop
  Otherwise
    Stop
`;

describe('storyToIr to BPMN', () => {
  it('creates BPMN-compliant XML for the cross-region latency response', async () => {
    const ir = storyToIr(incidentStory);

    expect(ir.name).toBe('Cross-Region Latency Spike Response');
    expect(ir.start).toBeDefined();

    const startState = ir.states.find(state => state.id === ir.start);
    expect(startState?.kind).toBe('receive');

    const xml = irToBpmnXml(ir);

  expect(xml).toContain('<bpmn:startEvent');
  expect(xml).toContain('<bpmn:message id="Message_sustained_latency_above_400ms_5min"');
  expect(xml).toContain('<bpmn:messageEventDefinition messageRef="Message_sustained_latency_above_400ms_5min"');
  expect(xml).toContain('Wait for stabilized_latency_under_200ms_10min');
  expect(xml).toContain('<bpmn:sendTask');
  expect(xml).toContain('messageRef="Message_SendTask_notification_compliance_steward"');
  expect(xml).toContain('ExclusiveGateway_Choice_latency_stability_guard');
  expect(xml).toContain('Monitor Latency under 200ms for 10 minutes');
  expect(xml).toContain('<bpmn:boundaryEvent');
  expect(xml).toContain('attachedToRef="ServiceTask_ServiceTask_latency_stability_monitor"');
  expect(xml).toContain('<bpmn:timeDuration>PT10M0S</bpmn:timeDuration>');
    expect(xml).toContain('<bpmn:exclusiveGateway');
    expect(xml).not.toContain('messageTask');

    await assertValidBpmn(xml);
  });
});
