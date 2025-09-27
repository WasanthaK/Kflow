Flow: BPMN Gateway Types Demonstration

# Exclusive Gateway (XOR) - Default behavior
Ask customer for {payment_method}
Do: validate payment details

If {payment_verified}
  Do: process standard payment
  Send confirmation email
Otherwise
  Send payment error notification
  Stop

# Parallel Gateway (AND) - Multiple conditions must be true
Do: check inventory levels and payment status

If {inventory_available} and {payment_processed}
  Do: reserve inventory items
  Do: generate shipping label
  Send order confirmation: "Items reserved and shipping arranged"

# Inclusive Gateway (OR) - One or more conditions can be true  
Do: evaluate customer status and order value

If {premium_customer} or {order_value} > 500
  Ask manager for special handling
  Do: apply priority processing queue
  Send VIP notification to warehouse

# Complex Gateway - Multiple operators and complex logic
Do: analyze order risk factors

If {order_value} > 1000 and {customer_rating} < 3 and {payment_method} = "credit"
  Ask credit team for manual approval
  Do: run enhanced fraud detection
  Do: require additional verification documents

# Event-Based Gateway - Triggered by external events
Wait for system events

If system receives payment_confirmation event
  Do: update order status to confirmed
  Send tracking information to customer
Otherwise
  If system receives payment_failure event
    Ask customer to update payment method
    Stop

Stop