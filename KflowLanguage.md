# Kflow Language Specification

**Version:** 1.0  
**Date:** September 2025  
**Status:** Production Ready

## Overview

Kflow is a human-first, AI-assisted workflow language designed to bridge the gap between natural language business process descriptions and executable workflow definitions. It compiles to BPMN 2.0 compliant SimpleScript while maintaining readability for non-technical stakeholders.

## Core Philosophy

1. **Human-First Design**: Workflows should be readable by business users, not just developers
2. **AI-Assisted Development**: Intelligent autocomplete and pattern recognition
3. **BPMN Compliance**: Industry-standard business process notation support
4. **Visual Representation**: Every workflow can be visualized as an interactive graph
5. **Template-Driven**: Parameterized workflows for reusability

## Language Structure

### 1. Flow Declaration

Every Kflow file must start with a flow declaration:

```kflow
Flow: [Workflow Name]
```

**Examples:**
```kflow
Flow: Employee Onboarding Process
Flow: Order Fulfillment System  
Flow: Expense Approval Workflow
```

### 2. Core Actions

#### 2.1 Ask Actions (User Tasks)
Used for human interactions, approvals, and input collection.

**Syntax:**
```kflow
Ask [actor] [action/request]
Ask [actor] for {variable}
```

**Examples:**
```kflow
Ask manager to approve the request
Ask customer for {payment_details} and {shipping_address}
Ask HR team to verify employee credentials
Ask system administrator to configure {database_settings}
```

**BPMN Mapping:** `userTask` with `assignee` and `type: 'human_input'`

#### 2.2 Do Actions

##### Service Tasks (System Operations)
Automated system operations and integrations.

**Keywords:** `create`, `update`, `delete`, `insert`, `process`, `execute`, `call`, `run`

```kflow
Do: create customer record in CRM system
Do: update inventory levels in warehouse database
Do: process payment using {payment_gateway}
Do: execute data backup procedure
```

**BPMN Mapping:** `serviceTask` with `type: 'system_operation'`

##### Script Tasks (Calculations & Processing)
Data processing, calculations, and transformations.

**Keywords:** `calculate`, `compute`, `transform`, `parse`, `analyze`, `format`, `sum`, `average`, `total`, `count`

```kflow
Do: calculate order total with taxes and shipping
Do: transform customer data to standard format
Do: analyze sales performance metrics
Do: compute risk score from {credit_data}
```

**BPMN Mapping:** `scriptTask` with subtypes:
- `financial_calculation`: Monetary computations
- `data_transformation`: Data format conversions
- `statistical_analysis`: Analytics and reporting
- `general_computation`: Other calculations

##### Manual Tasks (Human Work)
Tasks requiring human execution but not system interaction.

**Keywords:** `review`, `approve`, `check`, `verify`, `inspect`, `examine`

```kflow
Do: review contract terms and conditions
Do: verify customer identity documents
Do: inspect product quality standards
```

**BPMN Mapping:** `manualTask` with `type: 'human_work'`

##### Business Rule Tasks (Decision Logic)
Rules evaluation and decision making.

**Keywords:** `evaluate`, `determine`, `decide`, `classify`, `assess`

```kflow
Do: evaluate loan application criteria
Do: determine shipping method based on {location}
Do: classify support ticket priority
```

**BPMN Mapping:** `businessRuleTask` with `type: 'rule_evaluation'`

#### 2.3 Send Actions (Message Tasks)
Communications and notifications.

**Syntax:**
```kflow
Send [message/document] to [recipient]
Send [notification_type] to [actor]: "[message]"
```

**Examples:**
```kflow
Send confirmation email to customer: "Order received"
Send notification to {manager}
Send invoice to billing department
Send SMS alert to {emergency_contact}
```

**BPMN Mapping:** `messageTask` with message types:
- `email`: Email communications
- `notification`: System notifications  
- `sms`: Text messages
- `message`: Generic messages

#### 2.4 Wait Actions (Timer Events)
Delays, timeouts, and waiting for external events.

```kflow
Wait for manager approval
Wait for {delivery_confirmation}
Wait for system maintenance window
Wait 24 hours for payment processing
```

**BPMN Mapping:** `waitTask` with `type: 'timer'`

#### 2.5 Stop Actions (End Events)
Workflow termination points.

```kflow
Stop
```

**BPMN Mapping:** `endEvent` with `type: 'terminate'`

### 3. Control Flow

#### 3.1 Conditional Logic (Gateways)

**If Statements:**
```kflow
If [condition]
  [actions if true]
Otherwise
  [actions if false]
```

**Examples:**
```kflow
If {order_total} > 1000
  Ask manager to approve high-value order
  If approved
    Do: process payment using secure gateway
    Send confirmation email to customer
  Otherwise
    Send rejection email: "Requires manager approval"
    Stop
Otherwise
  Do: process standard payment automatically
```

**Advanced Conditions:**
```kflow
If {customer_type} = "premium"
If approved and {payment_verified}
If {inventory_level} < {minimum_threshold}
If {business_hours} = true
```

**BPMN Mapping:** Multiple gateway types supported:
- **Exclusive Gateway (XOR)**: Simple If/Otherwise conditions
- **Parallel Gateway (AND)**: Conditions with "and" logic
- **Inclusive Gateway (OR)**: Conditions with "or" logic  
- **Complex Gateway**: Multiple operators and complex expressions
- **Event-Based Gateway**: Event-driven conditions

#### 3.2 Gateway Types and Usage

**Exclusive Gateway (XOR) - Default:**
```kflow
If {payment_verified}
  Do: process order
Otherwise
  Send payment error notification
```

**Parallel Gateway (AND) - Concurrent Execution:**
```kflow
If {payment_verified} and {inventory_available}
  Do: process order and reserve inventory
  Do: generate shipping label and send notification
```

**Inclusive Gateway (OR) - Optional Parallel Paths:**
```kflow
If {priority_customer} or {large_order}
  Ask manager for special handling
  Do: apply priority processing
```

**Complex Gateway - Advanced Logic:**
```kflow
If {order_value} > 1000 and {customer_rating} < 3
  Ask credit team for approval
  Do: run additional verification checks
```

**Event-Based Gateway - Event-Driven:**
```kflow
If system receives payment_confirmation event
  Do: update order status
  Send confirmation to customer
```

#### 3.3 Nested Branching
Kflow supports unlimited nesting of conditional logic:

```kflow
If {priority} = "high"
  If {manager_available}
    Ask manager for immediate approval
    If approved
      Do: expedite processing
    Otherwise
      Ask backup manager for approval
  Otherwise
    Add to {manager_queue}
    Send notification: "Waiting for manager availability"
Otherwise
  Do: process using standard workflow
```

### 4. Variables and Templating

#### 4.1 Template Variables
Use curly braces `{variable_name}` for parameterized workflows:

```kflow
Ask {approving_manager} to review {request_type}
Do: update {target_system} with {updated_data}
Send {notification_type} to {stakeholder}: "{custom_message}"
```

#### 4.2 Variable Types
Kflow automatically categorizes variables:

- **Input Variables**: `{order_id}`, `{customer_data}`, `{amount}`
- **Workflow Actors**: `{manager}`, `{customer}`, `{admin}`
- **System References**: `{crm_system}`, `{payment_gateway}`, `{database}`
- **Boolean States**: `approved`, `rejected`, `available`, `completed`

#### 4.3 Variable Extraction
The compiler automatically extracts and categorizes variables:

```json
{
  "vars": {
    "customer_id": "input variable (customer_id)",
    "manager": "workflow actor",
    "payment_gateway": "target system",
    "approved": "boolean state from approval decision"
  }
}
```

### 5. Actor Recognition

Kflow automatically recognizes common workflow roles:

- **Management**: `manager`, `supervisor`, `director`, `admin`
- **Staff**: `employee`, `agent`, `representative`, `staff`
- **External**: `customer`, `user`, `client`, `vendor`
- **Teams**: `hr team`, `finance team`, `support team`, `it team`

### 6. Domain-Specific Patterns

#### 6.1 Approval Workflows
```kflow
Flow: Document Approval Process

Ask employee for {document} and {justification}
Do: validate document format and completeness
Ask {manager} to review and approve {document}

If approved
  Do: update document status to "approved"
  Send confirmation to employee: "Document approved"
  Do: archive document in {document_management_system}
Otherwise
  Ask employee to revise {document} with feedback
  Send revision request: "{feedback_message}"
```

#### 6.2 E-commerce Workflows
```kflow
Flow: Order Processing System

Ask customer for {order_details} and {payment_method}
Do: validate inventory availability for {ordered_items}
Do: calculate total amount including {taxes} and {shipping}

If {payment_verified}
  Do: reserve inventory items
  Do: generate shipping label with {tracking_number}
  Send order confirmation to customer
  
  Wait for shipping confirmation
  
  If shipped
    Send tracking notification with {tracking_number}
    Wait for delivery confirmation
    Send feedback request to customer
  Otherwise
    Ask warehouse team to investigate shipping delay
Otherwise
  Send payment failure notification
  Ask customer to update payment method
```

#### 6.3 Support Workflows
```kflow
Flow: Customer Support Ticket Resolution

Ask customer for {issue_description} and {contact_information}
Do: create support ticket with unique {ticket_id}
Do: classify issue priority based on {severity_criteria}

If {priority} = "critical"
  Ask senior agent to handle immediately
  Send escalation notification to {support_manager}
Otherwise
  Assign to available agent from {support_queue}

Do: investigate and diagnose {reported_issue}
Ask agent to provide {solution} or {workaround}

If resolved
  Send resolution summary to customer
  Ask customer to confirm issue resolution
  Do: close ticket and update metrics
Otherwise
  Escalate to {technical_specialist}
  Send status update to customer
```

## 7. Advanced Features

### 7.1 Script Task Subtypes

The compiler automatically categorizes script tasks:

- **Financial Calculations**: Interest, taxes, payments, discounts
- **Data Transformations**: Format conversions, data mapping
- **Statistical Analysis**: Metrics, averages, aggregations
- **Data Validation**: Verification, compliance checks
- **Security Operations**: Encryption, authentication
- **Text Processing**: String manipulation, formatting

### 7.2 Branch Labeling

Complex workflows automatically generate labeled branches:

```kflow
If {order_value} > 10000
  # Branch: High-Value Order Processing
  Ask director for approval
Otherwise
  # Branch: Standard Order Processing
  Do: process automatically
```

### 7.3 Template Conversion

The compiler converts recognized entities to template variables:

**Input:**
```kflow
Ask manager to update CRM system with customer data
```

**Compiled Output:**
```kflow
Ask {manager} to update {crm_system} with {customer_data}
```

## 8. AI Integration

### 8.1 Intelligent Autocomplete

- **Context Awareness**: Suggestions based on workflow domain
- **Pattern Recognition**: Common workflow patterns
- **Smart Completion**: Multi-word phrase suggestions
- **Fallback Logic**: Rule-based suggestions when AI unavailable

### 8.2 Domain Detection

Automatic workflow categorization:
- **Approval Workflows**: Management, review, decision processes
- **E-commerce**: Orders, payments, inventory, shipping
- **HR Processes**: Onboarding, performance, leave management
- **Support**: Tickets, issues, resolution, escalation
- **Financial**: Payments, budgeting, auditing, compliance

### 8.3 Smart Suggestions

**Trigger**: Press `Tab` in the editor
**Context**: Based on current line and previous workflow steps
**Suggestions**: 3-5 contextually relevant completions

## 9. BPMN 2.0 Compliance

### 9.1 Task Types Mapping

| Kflow Element | BPMN Element | Description |
|---------------|--------------|-------------|
| Ask | User Task | Human interactions |
| Do: (system) | Service Task | Automated operations |
| Do: (calculate) | Script Task | Computations |
| Do: (review) | Manual Task | Human work |
| Do: (evaluate) | Business Rule Task | Decision logic |
| Send | Message Task | Communications |
| Wait | Timer Event | Delays and timeouts |
| If/Otherwise | Exclusive Gateway | Decision points |
| Stop | End Event | Workflow termination |

### 9.2 Visual Elements

- **Start Events**: Green circles with rocket icon
- **User Tasks**: Blue rectangles with person icon
- **Service Tasks**: Green rectangles with gear icon
- **Script Tasks**: Purple rectangles with calculator icon
- **Gateways**: Orange diamonds with question mark
- **End Events**: Red circles with stop icon

## 10. Best Practices

### 10.1 Workflow Design

1. **Start with Flow Declaration**: Always begin with descriptive flow name
2. **Use Clear Actions**: Prefer specific verbs over generic terms
3. **Parameterize Values**: Use `{variables}` for reusable workflows
4. **Handle Edge Cases**: Include error handling and alternative paths
5. **Keep Actions Atomic**: One clear action per line

### 10.2 Naming Conventions

- **Variables**: `snake_case` - `{customer_id}`, `{payment_amount}`
- **Actors**: `lowercase` - `manager`, `customer`, `admin`
- **Systems**: `snake_case` - `{crm_system}`, `{payment_gateway}`
- **Flow Names**: `Title Case` - `Order Processing System`

### 10.3 Structure Guidelines

```kflow
Flow: [Descriptive Name]

# Input Collection
Ask [actor] for {required_data}

# Validation and Processing  
Do: validate {data} against {criteria}
Do: calculate {derived_values}

# Decision Logic
If {condition}
  # Happy path actions
  Do: process {data}
  Send confirmation
Otherwise
  # Error handling
  Send error notification
  Stop

# Completion
Do: update {system} with results
Send final notification
```

## 11. Error Handling Patterns

### 11.1 Validation Errors
```kflow
Do: validate {customer_data} format
If validation_failed
  Send error message: "Invalid data format"
  Ask customer to resubmit {corrected_data}
Otherwise
  Do: proceed with processing
```

### 11.2 System Failures
```kflow
Do: attempt payment processing
If payment_failed
  Ask customer to verify {payment_method}
  Do: retry payment processing
  If still_failed
    Send failure notification
    Stop
Otherwise
  Send success confirmation
```

### 11.3 Timeout Handling
```kflow
Wait for manager approval within 24 hours
If timeout_reached
  Ask backup manager for approval
  Send escalation notification
Otherwise
  Do: process approved request
```

## 12. Integration Examples

### 12.1 API Integration
```kflow
Do: call {external_api} with {request_data}
If api_response_success
  Do: parse {response_data}
  Do: update {local_database}
Otherwise
  Ask system admin to check {api_connectivity}
  Send alert: "API integration failure"
```

### 12.2 Database Operations
```kflow
Do: query {customer_database} for {customer_id}
If customer_found
  Do: update customer record with {new_data}
  Send confirmation: "Customer updated successfully"
Otherwise
  Do: create new customer record
  Send notification: "New customer created"
```

### 12.3 File Processing
```kflow
Ask user to upload {document_file}
Do: validate file format and size
If valid_file
  Do: extract data from {document_file}
  Do: process extracted {data}
  Send processing summary
Otherwise
  Send error: "Invalid file format"
  Ask user to upload corrected file
```

## 13. Visual Graph Features

### 13.1 Interactive Elements
- **Drag and Drop**: Rearrange workflow elements
- **Zoom Controls**: Navigate complex workflows
- **Node Details**: Hover for task information
- **Branch Highlighting**: Visual flow paths

### 13.2 BPMN Styling
- **Color Coding**: Task types have distinct colors
- **Shape Compliance**: BPMN-standard shapes (diamonds, rectangles)
- **Flow Arrows**: Directional workflow progression
- **Branch Labels**: "Yes"/"No" gateway labels

### 13.3 Real-time Updates
- **Live Compilation**: Graph updates as you type
- **Error Highlighting**: Visual indicators for syntax issues
- **Layout Optimization**: Automatic node positioning

## 14. Future Enhancements

### 14.1 Planned Features
- **Parallel Processing**: Support for concurrent workflow branches
- **Loop Constructs**: Iterative process support
- **Event Triggers**: External event-driven workflows
- **Sub-processes**: Modular workflow composition
- **Role-based Access**: Actor permission management

### 14.2 Advanced AI Features
- **Workflow Generation**: Complete workflow creation from descriptions
- **Process Mining**: Pattern analysis from existing workflows
- **Optimization Suggestions**: Performance improvement recommendations
- **Compliance Checking**: Automated regulatory compliance validation

---

## Quick Reference

### Essential Syntax
```kflow
Flow: [Name]                    # Flow declaration
Ask [actor] [action]           # User task
Do: [action] [object]          # Various task types
Send [message] to [recipient]  # Message task
Wait for [event]               # Timer event
If [condition]                 # Gateway start
Otherwise                      # Alternative branch
Stop                          # End event
{variable}                    # Template variable
```

### Task Type Keywords
- **User Tasks**: `Ask`
- **Service Tasks**: `create`, `update`, `delete`, `process`, `execute`
- **Script Tasks**: `calculate`, `compute`, `transform`, `analyze`
- **Manual Tasks**: `review`, `approve`, `check`, `verify`
- **Business Rules**: `evaluate`, `determine`, `decide`, `classify`
- **Message Tasks**: `Send`
- **Wait Tasks**: `Wait`

---

**© 2025 Kflow Language Specification. This document is part of the Kflow project and is released under the same license terms.**