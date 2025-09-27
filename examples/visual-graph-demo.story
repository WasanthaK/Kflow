Flow: E-commerce Order Processing
Ask customer for {product_selection} and {payment_details}
Do: validate payment information using security checks
Do: calculate total amount including tax and shipping

If {payment_amount} > 500
  Ask manager to approve high-value transaction
  Do: encrypt sensitive payment data using AES
  If manager_approved
    Do: process payment via secure gateway
    Send confirmation email to customer
    Do: reserve inventory for {product_selection}
    Stop
  Otherwise
    Send rejection email: "Transaction requires approval"
    Stop
Otherwise
  Do: process standard payment automatically
  Do: update inventory levels in real-time
  Send order confirmation to customer
  Stop