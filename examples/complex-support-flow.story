Flow: Enhanced Customer Support

Ask customer for {issue_description} and {priority_level}
Do: calculate urgency score using priority algorithm
Do: create support ticket in system

If {priority_level} is "critical"
  Ask senior_agent to handle immediately
  Do: escalate to management team
  Send urgent notification to customer
  Stop
Otherwise
  Ask regular_agent to investigate
  Do: assign to standard queue
  If issue_complexity is "high"
    Ask technical_specialist for assistance
    Do: transfer to specialized team
    Stop
  Otherwise
    Do: process standard resolution
    Send status update to customer
    Stop