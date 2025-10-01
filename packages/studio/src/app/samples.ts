export interface StorySample {
  id: string;
  name: string;
  description?: string;
  content: string;
}

export const DEFAULT_SAMPLE_ID = 'advanced-order-processing';

export const storySamples: StorySample[] = [
  {
    id: DEFAULT_SAMPLE_ID,
    name: 'Advanced Order Processing (default)',
    description: 'Multi-branch ecommerce order fulfillment flow with manager approval.',
    content: `Flow: Advanced Order Processing System

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
  Stop`
  },
  {
    id: 'support-escalation-brief',
    name: 'Support Escalation Brief',
    description: 'Priority-1 incident escalation workflow with compliance and executive updates.',
    content: `Support Brief: Customer success wants to streamline high-priority incident handling across regions.
When a Priority 1 ticket arrives, capture the customer name, affected product, reported impact, and time detected.
Assign the case to the primary regional support engineer and notify the customer success manager immediately.
If the outage affects more than 100 users or a regulated workload, engage the compliance officer and initiate the major-incident bridge.
Operations must provide a mitigation update every 30 minutes until service is restored.
If mitigation fails after 90 minutes, escalate to the incident commander and schedule an executive status call.
Once the incident commander declares recovery, send a postmortem survey to the customer, archive all bridge chat logs, and wait for the postmortem draft before closing the ticket.`
  }
];

export function getSampleById(id: string): StorySample | undefined {
  return storySamples.find(sample => sample.id === id);
}
