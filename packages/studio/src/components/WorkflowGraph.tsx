import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Handle,
  Position,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node types for different workflow elements
const TaskNode = ({ data }: { data: any }) => {
  const getTaskIcon = (taskType: string) => {
    const icons = {
      userTask: '👤',
      serviceTask: '⚙️',
      scriptTask: '🧮',
      businessRuleTask: '📋',
      messageTask: '📧',
      waitTask: '⏳',
      endEvent: '🛑',
      ask: '👤',
      do: '⚙️',
      send: '�',
      wait: '⏳',
      stop: '🛑'
    };
    return icons[taskType as keyof typeof icons] || '❓';
  };

  const getTaskColor = (taskType: string) => {
    const colors = {
      userTask: '#3b82f6',      // Blue
      serviceTask: '#10b981',   // Green  
      scriptTask: '#8b5cf6',    // Purple
      businessRuleTask: '#f59e0b', // Orange
      messageTask: '#ef4444',   // Red
      waitTask: '#6b7280',      // Gray
      endEvent: '#dc2626',      // Dark red
      ask: '#3b82f6',
      do: '#10b981',
      send: '#ef4444',
      wait: '#6b7280',
      stop: '#dc2626'
    };
    return colors[taskType as keyof typeof colors] || '#6b7280';
  };

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '6px',
      backgroundColor: 'white',
      border: `3px solid ${getTaskColor(data.taskType)}`,
      minWidth: '160px',
      maxWidth: '220px',
      boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
      position: 'relative'
    }}>
      <Handle 
        type="target" 
        position={Position.Top}
        style={{
          backgroundColor: getTaskColor(data.taskType),
          border: '2px solid white',
          width: '10px',
          height: '10px'
        }}
      />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px'
      }}>
        <span style={{ fontSize: '18px' }}>{getTaskIcon(data.taskType)}</span>
        <span style={{ 
          fontSize: '11px', 
          fontWeight: '700',
          color: getTaskColor(data.taskType),
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {data.taskType.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: '500',
        color: '#1f2937',
        lineHeight: '1.4',
        marginBottom: data.subtype ? '4px' : '0'
      }}>
        {data.description}
      </div>
      {data.subtype && (
        <div style={{
          fontSize: '10px',
          color: '#6b7280',
          fontStyle: 'italic',
          backgroundColor: '#f9fafb',
          padding: '2px 6px',
          borderRadius: '3px',
          display: 'inline-block'
        }}>
          {data.subtype.replace(/_/g, ' ')}
        </div>
      )}
      {/* Multi-directional handles for flexible flow layouts */}
      
      {/* Input handles */}
      <Handle 
        type="target" 
        position={Position.Top}
        id="top-in"
        style={{
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: getTaskColor(data.taskType),
          border: '2px solid white',
          width: '10px',
          height: '10px',
          borderRadius: '50%'
        }}
      />
      
      <Handle 
        type="target" 
        position={Position.Left}
        id="left-in"
        style={{
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: getTaskColor(data.taskType),
          border: '2px solid white',
          width: '10px',
          height: '10px',
          borderRadius: '50%'
        }}
      />
      
      {/* Output handles */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="bottom-out"
        style={{
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: getTaskColor(data.taskType),
          border: '2px solid white',
          width: '10px',
          height: '10px',
          borderRadius: '50%'
        }}
      />
      
      <Handle 
        type="source" 
        position={Position.Right}
        id="right-out"
        style={{
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: getTaskColor(data.taskType),
          border: '2px solid white',
          width: '10px',
          height: '10px',
          borderRadius: '50%'
        }}
      />
    </div>
  );
};

const GatewayNode = ({ data }: { data: any }) => {
  // Determine gateway type and styling
  const getGatewayConfig = (gatewayType: string) => {
    const configs = {
      'exclusive': {
        symbol: '×',
        color: '#f59e0b',
        backgroundColor: '#fbbf24',
        description: 'Exclusive (XOR)',
        handles: ['top', 'bottom', 'right'] // Yes/No branches
      },
      'parallel': {
        symbol: '+',
        color: '#3b82f6',
        backgroundColor: '#60a5fa',
        description: 'Parallel (AND)',
        handles: ['top', 'bottom', 'left', 'right'] // Multiple parallel branches
      },
      'inclusive': {
        symbol: '○',
        color: '#8b5cf6',
        backgroundColor: '#a78bfa',
        description: 'Inclusive (OR)',
        handles: ['top', 'bottom', 'left', 'right'] // Optional parallel branches
      },
      'complex': {
        symbol: '*',
        color: '#ef4444',
        backgroundColor: '#f87171',
        description: 'Complex Gateway',
        handles: ['top', 'bottom', 'left', 'right'] // Complex logic
      },
      'event': {
        symbol: '⚡',
        color: '#10b981',
        backgroundColor: '#34d399',
        description: 'Event-Based',
        handles: ['top', 'bottom', 'left', 'right'] // Event-driven branches
      }
    };
    
    return configs[gatewayType as keyof typeof configs] || configs.exclusive;
  };

  const gatewayType = data.gatewayType || 'exclusive';
  const config = getGatewayConfig(gatewayType);

  return (
    <div style={{ position: 'relative' }}>
      {/* BPMN-compliant diamond shape */}
      <div style={{
        width: '60px',
        height: '60px',
        backgroundColor: config.backgroundColor,
        border: `3px solid ${config.color}`,
        borderRadius: '4px',
        transform: 'rotate(45deg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        position: 'relative'
      }}>
        {/* Gateway symbol */}
        <div style={{ 
          transform: 'rotate(-45deg)',
          fontWeight: 'bold',
          color: gatewayType === 'inclusive' ? 'white' : '#1f2937',
          fontSize: gatewayType === 'event' ? '16px' : '20px',
          lineHeight: '1'
        }}>
          {config.symbol}
        </div>
      </div>
      
      {/* Gateway type label */}
      <div style={{
        position: 'absolute',
        top: '-35px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: config.color,
        color: 'white',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '9px',
        fontWeight: '700',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        letterSpacing: '0.5px'
      }}>
        {config.description}
      </div>
      
      {/* Condition label below the diamond */}
      <div style={{
        position: 'absolute',
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        border: `1px solid ${config.color}`,
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#374151',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap',
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {data.condition || data.description || 'Gateway'}
      </div>
      
      {/* Dynamic handles based on gateway type */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ 
          top: '-5px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: config.color,
          border: '2px solid white',
          width: '10px',
          height: '10px'
        }} 
      />
      
      {/* Enhanced gateway handles for better flow control */}
      
      {/* Left handle - "Yes/True" branch for XOR, primary output for others */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left"
        style={{ 
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: gatewayType === 'exclusive' ? '#059669' : config.color,
          border: '3px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} 
      />
      
      {/* Right handle - "No/False" branch for XOR, secondary output for others */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        style={{ 
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: gatewayType === 'exclusive' ? '#dc2626' : config.color,
          border: '3px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} 
      />
      
      {/* Bottom handle - Additional output for parallel/inclusive gateways */}
      {(gatewayType === 'parallel' || gatewayType === 'inclusive' || gatewayType === 'complex') && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="bottom"
          style={{ 
            bottom: '-8px',
            left: '50%', 
            transform: 'translateX(-50%)',
            backgroundColor: config.color,
            border: '3px solid white',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} 
        />
      )}
      
      {/* Top handle - Additional output for event gateways */}
      {gatewayType === 'event' && (
        <Handle 
          type="source" 
          position={Position.Top} 
          id="top-out"
          style={{ 
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: config.color,
            border: '3px solid white',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} 
        />
      )}
    </div>
  );
};

const StartNode = ({ data }: { data: any }) => {
  return (
    <div style={{
      width: '60px',
      height: '60px',
      backgroundColor: '#10b981',
      border: '3px solid #059669',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '700',
      fontSize: '24px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      position: 'relative'
    }}>
      ▶
      {/* Multiple output handles for flexible start connections */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="bottom-out"
        style={{
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#059669',
          border: '3px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
      
      <Handle 
        type="source" 
        position={Position.Right}
        id="right-out"
        style={{
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: '#059669',
          border: '3px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
      {/* Start label */}
      <div style={{
        position: 'absolute',
        bottom: '-25px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#059669',
        whiteSpace: 'nowrap'
      }}>
        START
      </div>
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
  gateway: GatewayNode,
  start: StartNode,
};

interface WorkflowGraphProps {
  workflowData: any;
}

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({ workflowData }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!workflowData || !workflowData.steps) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Enhanced layout system with improved connection points
    const centerX = 500;
    const minNodeSpacing = 180;
    const branchOffset = 400; // Reduced for better symmetry
    const nodeWidth = 240;
    const nodeHeight = 100;
    let yPosition = 80;
    let nodeCounter = 0;
    
    // Track branch levels and positions
    interface BranchLayout {
      ifNodes: Array<{id: string, y: number}>;
      otherwiseNodes: Array<{id: string, y: number}>;
      maxY: number;
      gatewayY: number;
    }
    
    const branchLayouts: Map<string, BranchLayout> = new Map();
    let currentBranchLayout: BranchLayout | null = null;
    
    // Function to start a new branch layout
    const startBranchLayout = (gatewayId: string, gatewayY: number) => {
      const layout: BranchLayout = {
        ifNodes: [],
        otherwiseNodes: [],
        maxY: gatewayY,
        gatewayY
      };
      branchLayouts.set(gatewayId, layout);
      currentBranchLayout = layout;
    };
    
    // Function to add node to current branch
    const addNodeToBranch = (nodeId: string, y: number, branch: 'if' | 'otherwise') => {
      if (currentBranchLayout) {
        if (branch === 'if') {
          currentBranchLayout.ifNodes.push({id: nodeId, y});
        } else {
          currentBranchLayout.otherwiseNodes.push({id: nodeId, y});
        }
        currentBranchLayout.maxY = Math.max(currentBranchLayout.maxY, y);
      }
    };
    
    // Function to balance branch heights
    const balanceBranchHeights = () => {
      branchLayouts.forEach(layout => {
        const maxIfY = layout.ifNodes.length > 0 ? Math.max(...layout.ifNodes.map(n => n.y)) : layout.gatewayY;
        const maxOtherwiseY = layout.otherwiseNodes.length > 0 ? Math.max(...layout.otherwiseNodes.map(n => n.y)) : layout.gatewayY;
        const maxBranchY = Math.max(maxIfY, maxOtherwiseY);
        
        // Align branches to same levels where possible
        const maxNodes = Math.max(layout.ifNodes.length, layout.otherwiseNodes.length);
        
        for (let i = 0; i < maxNodes; i++) {
          const baseY = layout.gatewayY + minNodeSpacing + (i * minNodeSpacing);
          
          if (layout.ifNodes[i]) {
            const node = nodes.find(n => n.id === layout.ifNodes[i].id);
            if (node) node.position.y = baseY;
          }
          
          if (layout.otherwiseNodes[i]) {
            const node = nodes.find(n => n.id === layout.otherwiseNodes[i].id);
            if (node) node.position.y = baseY;
          }
        }
      });
    };

    // Add start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: centerX, y: yPosition },
      data: { label: 'Start' }
    });

    let previousNodeId = 'start';
    yPosition += minNodeSpacing;

    // Enhanced branch tracking with nesting support
    let currentBranch: 'main' | 'if' | 'otherwise' = 'main';
    let branchStack: Array<{
      gatewayId: string;
      type: 'if' | 'otherwise';
      returnY: number;
      returnX: number;
    }> = [];
    let gatewayNodeId: string | null = null;
    let branchStartY = yPosition;

    // Process each step with improved branching logic
    workflowData.steps.forEach((step: any, index: number) => {
      const nodeId = `node-${++nodeCounter}`;
      let nodeType = 'task';
      let taskType = 'unknown';
      let description = '';
      let subtype = '';

      // Handle IF condition (Gateway)
      if (step.if) {
        nodeType = 'gateway';
        taskType = 'gateway';
        description = step.if;
        gatewayNodeId = nodeId;

        // Determine gateway type based on condition complexity
        let gatewayType = 'exclusive'; // Default XOR gateway
        
        // Check for parallel conditions (AND logic)
        if (description.includes(' and ') || description.includes(' && ')) {
          gatewayType = 'parallel';
        }
        // Check for inclusive conditions (OR logic)  
        else if (description.includes(' or ') || description.includes(' || ')) {
          gatewayType = 'inclusive';
        }
        // Check for complex conditions (multiple operators)
        else if ((description.match(/[<>=!]/g) || []).length > 1) {
          gatewayType = 'complex';
        }
        // Check for event-based conditions
        else if (description.includes('receives') || description.includes('triggered') || description.includes('event')) {
          gatewayType = 'event';
        }

        // Position gateway at center
        nodes.push({
          id: nodeId,
          type: nodeType,
          position: { x: centerX, y: yPosition },
          data: { 
            taskType,
            description: `If ${description}`,
            condition: step.if,
            gatewayType: gatewayType
          }
        });

        // Start branch layout tracking
        startBranchLayout(nodeId, yPosition);

        // Connect previous to gateway using appropriate handles
        if (previousNodeId) {
          const sourceHandle = previousNodeId === 'start' ? 'bottom-out' : 'bottom-out';
          edges.push({
            id: `edge-${previousNodeId}-${nodeId}`,
            source: previousNodeId,
            target: nodeId,
            sourceHandle: sourceHandle,
            targetHandle: 'top',
            type: 'smoothstep',
            animated: false,
            style: { 
              stroke: '#6b7280', 
              strokeWidth: 2
            }
          });
        }

        // Save current state for branching
        branchStack.push({
          gatewayId: nodeId,
          type: 'if',
          returnY: yPosition,
          returnX: centerX
        });

        previousNodeId = nodeId;
        yPosition += minNodeSpacing;
        currentBranch = 'if';
        branchStartY = yPosition;
        return;
      }

      // Handle OTHERWISE condition
      if (step.otherwise) {
        // Switch to otherwise branch
        currentBranch = 'otherwise';
        // Reset to gateway level for otherwise branch - start at same Y as IF branch
        if (branchStack.length > 0) {
          const currentGateway = branchStack[branchStack.length - 1];
          yPosition = currentGateway.returnY + minNodeSpacing;
          branchStartY = yPosition;
        }
        return;
      }

      // Handle regular task nodes
      const stepKeys = Object.keys(step);
      const mainKey = stepKeys.find(key => key !== 'branchContext') || stepKeys[0];
      
      if (mainKey) {
        taskType = mainKey;
        const taskData = step[mainKey];
        
        if (typeof taskData === 'object' && taskData !== null) {
          description = taskData.description || JSON.stringify(taskData);
          subtype = taskData.subtype || taskData.type;
        } else if (typeof taskData === 'string') {
          description = taskData;
        } else if (typeof taskData === 'boolean') {
          description = `${mainKey}: ${taskData}`;
        } else {
          description = mainKey;
        }
      }

      // Determine position based on current branch with improved alignment
      const nodeX = currentBranch === 'if' ? centerX - branchOffset :
                    currentBranch === 'otherwise' ? centerX + branchOffset :
                    centerX;

      // Create the node at current yPosition
      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: nodeX, y: yPosition },
        data: { 
          taskType,
          description: description.length > 60 ? description.substring(0, 57) + '...' : description,
          subtype,
          fullDescription: description
        }
      });

      // Add to branch tracking
      if (currentBranch === 'if' || currentBranch === 'otherwise') {
        addNodeToBranch(nodeId, yPosition, currentBranch);
      }

      // Connect nodes with enhanced handle-specific logic
      if (currentBranch === 'if' && gatewayNodeId && yPosition === branchStartY) {
        // First node in IF branch - connect from gateway LEFT handle (Yes branch)
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          sourceHandle: 'left',
          targetHandle: 'top-in',
          type: 'smoothstep',
          label: '✓ Yes',
          labelStyle: { 
            fill: '#059669', 
            fontWeight: 600, 
            fontSize: '12px',
            backgroundColor: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #059669'
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
          animated: false,
          style: { 
            stroke: '#059669', 
            strokeWidth: 3
          }
        });
      } else if (currentBranch === 'otherwise' && gatewayNodeId && yPosition === branchStartY) {
        // First node in OTHERWISE branch - connect from gateway RIGHT handle (No branch)
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          sourceHandle: 'right',
          targetHandle: 'top-in',
          type: 'smoothstep',
          label: '✗ No',
          labelStyle: { 
            fill: '#dc2626', 
            fontWeight: 600, 
            fontSize: '12px',
            backgroundColor: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #dc2626'
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
          animated: false,
          style: { 
            stroke: '#dc2626', 
            strokeWidth: 3
          }
        });
      } else if (previousNodeId && 
                 (currentBranch === 'main' || 
                  (currentBranch === 'if' && yPosition > branchStartY) ||
                  (currentBranch === 'otherwise' && yPosition > branchStartY))) {
        // Connect within branch or main flow using appropriate handles
        const sourceHandle = currentBranch === 'main' ? 'bottom-out' : 'bottom-out';
        const targetHandle = currentBranch === 'main' ? 'top-in' : 'top-in';
        
        edges.push({
          id: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: '#6b7280', 
            strokeWidth: 2
          }
        });
      }

      previousNodeId = nodeId;
      
      // Always increment Y position to ensure vertical separation
      yPosition += minNodeSpacing;

      // Handle end events - reset branch context
      if (taskType === 'endEvent' || taskType === 'stop') {
        if (currentBranch !== 'main') {
          // Pop the branch context
          if (branchStack.length > 0) {
            branchStack.pop();
          }
          currentBranch = 'main';
          // Ensure next nodes continue below both branches
          if (currentBranchLayout) {
            yPosition = Math.max(yPosition, currentBranchLayout.maxY + minNodeSpacing);
          }
        }
      }
    });

    // Post-processing: Improve alignment and spacing
    const postProcessLayout = () => {
      // First pass: Ensure adequate spacing between consecutive nodes
      const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
      
      for (let i = 1; i < sortedNodes.length; i++) {
        const prevNode = sortedNodes[i - 1];
        const currentNode = sortedNodes[i];
        const requiredSpacing = minNodeSpacing * 0.9;
        
        if (currentNode.position.y - prevNode.position.y < requiredSpacing) {
          // Push down this node and all subsequent nodes at same Y
          const adjustment = requiredSpacing - (currentNode.position.y - prevNode.position.y);
          const nodesToAdjust = nodes.filter(n => n.position.y >= currentNode.position.y);
          nodesToAdjust.forEach(n => {
            n.position.y += adjustment;
          });
        }
      }
      
      // Second pass: Align end nodes that should merge back to center
      const endNodes = nodes.filter(n => 
        n.data.taskType === 'endEvent' || 
        n.data.taskType === 'stop' ||
        n.data.description?.toLowerCase().includes('stop')
      );
      
      // Move end nodes that are in branches back toward center
      endNodes.forEach(node => {
        if (Math.abs(node.position.x - centerX) > 100) {
          // This is a branch end node, move it closer to center
          node.position.x = centerX + (node.position.x - centerX) * 0.3;
        }
      });
    };
    
    // Apply branch balancing and post-processing
    balanceBranchHeights();
    postProcessLayout();

    // Add implicit connections for better flow visualization
    nodes.forEach((node, index) => {
      if (node.data.taskType === 'endEvent' || node.data.taskType === 'stop') {
        // Make sure end nodes are clearly marked
        node.data.description = node.data.description || 'End';
      }
    });

    return { nodes, edges };
  }, [workflowData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when workflowData changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!workflowData || !workflowData.steps || workflowData.steps.length === 0) {
    return (
      <div style={{
        height: '100%',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        color: '#6b7280',
        fontSize: '16px',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div>📊 Create a workflow to see the visual graph</div>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          {!workflowData ? 'No data' : !workflowData.steps ? 'No steps' : 'Empty workflow'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      minHeight: '500px', 
      width: '100%',
      position: 'relative',
      backgroundColor: '#fafafa'
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: '#6b7280', strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6b7280', strokeWidth: 2 }
        }}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.5
        }}
        attributionPosition="bottom-left"
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
      >
        <Controls position="top-right" />
        <MiniMap 
          style={{
            height: 120,
            width: 200,
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb'
          }}
          zoomable
          pannable
          position="bottom-right"
        />
        <Background gap={20} size={2} color="#e5e7eb" />
      </ReactFlow>
    </div>
  );
};