# BPMN Master Prompt Integration

## Overview
This document describes the integration of the BPMN Master Prompt system into the Kflow workflow visualization engine. The system automatically analyzes workflow definitions and generates proper BPMN 2.0 compliant swim lanes, pools, and lane assignments.

## Key Features

### 1. BPMN-Aware Swim Lane Detection
- **Pool Discovery**: Automatically identifies external systems (black-box pools) vs internal departments (lanes)
- **Lane Classification**: Uses BPMN 2.0 semantics to properly categorize actors as lanes within the company pool
- **Centered Alignment**: All nodes are perfectly aligned to the center X coordinate of their assigned swim lane

### 2. Master Prompt Heuristics Implementation
The system implements the Master Prompt's pool/lane discovery heuristics in priority order:

1. **Explicit Actors**: Detects `workflow actor` declarations in variables
2. **External Systems**: Identifies third-party services (verification service, payment gateway, email service)
3. **Internal Departments**: Classifies manager, warehouse, finance, support as internal lanes
4. **Automated Actions**: Groups system/automated tasks under "Internal System" lane
5. **Lane Consolidation**: Keeps lanes to 3-7 total for optimal visualization

### 3. BPMN Semantic Analysis
```typescript
// Example BPMN Structure Detection
const bpmnAnalysis = {
  model_style: "role-centric",
  pools: [
    {
      name: "Company",
      type: "company", 
      blackBox: false,
      lanes: ["Customer", "Manager", "Internal System", "Warehouse"]
    },
    {
      name: "Payment Gateway",
      type: "system",
      blackBox: true
    }
  ],
  confidence: 0.85
}
```

### 4. Perfect Node Alignment
Every node is now positioned using the swim lane's center X coordinate:
```typescript
position: { x: swimLaneX, y: nodeY }  // No more branch offsets!
```

## Current Implementation Status

### ✅ Completed Features
- [x] BPMN pool/lane discovery heuristics
- [x] External system detection (black-box pools)
- [x] Internal lane classification 
- [x] Perfect center alignment to swim lanes
- [x] Smart actor consolidation
- [x] Canvas-unified zoom with swim lane scaling

### 🔄 Ready for AI Integration
The system is architected to easily integrate with AI services:

```typescript
// Future AI Integration Point
const masterPrompt = `[Complete BPMN Master Prompt]`;
const bpmnAnalysis = await aiService.analyzeBPMN(workflow, masterPrompt);
```

### 📋 Future Enhancements
- [ ] Full AI service integration for BPMN analysis
- [ ] Gateway type inference (Exclusive, Parallel, Inclusive, Complex)
- [ ] Message flow detection between pools
- [ ] Event type classification (Timer, Message, Signal)
- [ ] BPMN XML export capability

## Visual Results

### Before: Misaligned Nodes
- Nodes scattered across lanes with arbitrary offsets
- Branch conditions pushing nodes off-center
- Inconsistent swim lane boundaries

### After: Perfect BPMN Alignment
- All nodes centered to their swim lane's middle X coordinate
- Clean, professional BPMN 2.0 compliant layout
- Proper pool/lane semantic organization
- Scalable swim lane backgrounds

## Usage Example

```javascript
// The system automatically analyzes any workflow:
const workflow = {
  steps: [
    { "task": "customer provides order details" },
    { "task": "validate customer information using verification service" }, 
    { "task": "manager approval required for orders > $1000" },
    { "task": "process payment via secure gateway" },
    { "task": "warehouse ships the order" }
  ]
};

// Results in BPMN-compliant swim lanes:
// Lane 1: "Customer" (center X: 125px)
// Lane 2: "Manager" (center X: 375px)  
// Lane 3: "Internal System" (center X: 625px)
// Lane 4: "Warehouse" (center X: 875px)
```

## Technical Architecture

The implementation follows a layered approach:

1. **Analysis Layer**: BPMN Master Prompt heuristics
2. **Semantic Layer**: Pool/lane classification 
3. **Layout Layer**: Perfect center alignment
4. **Rendering Layer**: Professional BPMN visualization

This creates a solid foundation for full BPMN 2.0 compliance and future AI-powered workflow analysis.