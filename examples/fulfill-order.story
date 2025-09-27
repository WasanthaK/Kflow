Flow: Fulfill Order
Receive order request
Do: check inventory
If items available
  Do: reserve inventory
  Send confirmation email to {customer}
  Remember: order_status = reserved
Otherwise
  Send email to {customer}: "Out of stock"
  Stop
