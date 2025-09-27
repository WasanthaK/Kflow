Flow: Approve Vacation
Ask manager to approve the {dates} for {employee}
If approved
  Do: update HR system with {dates}
  Send email to {employee}: "Approved"
  Stop
Otherwise
  Send email to {employee}: "Not approved"
  Stop
