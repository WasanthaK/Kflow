Flow: Advanced Order Processing System

Ask customer for {order_details} and {payment_method}
Do: validate customer information using verification service
Do: calculate order total with taxes and shipping

If {order_total} > 1000
  Ask manager to approve high-value order
  If manager_approved
    Do: process payment using secure gateway
    Do: reserve inventory items in warehouse system
    Send confirmation email to customer: "Large order approved"
  Otherwise
    Send rejection email: "High-value order requires approval"
    Stop
Otherwise
  Do: process standard payment automatically
  Do: reserve inventory items

Do: generate shipping label with tracking number
Send tracking notification to customer
Wait for shipping confirmation

If items_shipped
  Do: update order status to "shipped"
  Send shipping notification with {tracking_number}
  Wait for delivery confirmation
  
  If delivered
    Do: calculate customer satisfaction score
    Send feedback request to customer
    Do: update analytics dashboard
    Stop
  Otherwise
    Ask shipping team to investigate delayed delivery
    Stop
Otherwise
  Ask warehouse team to resolve shipping issue
  Do: create incident report
  Stop