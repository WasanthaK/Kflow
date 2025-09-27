import React, { useCallback, useMemo } from 'react';
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
      ask: '❓',
      do: '⚡',
      send: '📤',
      wait: '⏳',
      stop: '⏹️'
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
      padding: '10px 15px',
      borderRadius: '8px',
      backgroundColor: 'white',
      border: `2px solid ${getTaskColor(data.taskType)}`,
      minWidth: '150px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px'
      }}>
        <span style={{ fontSize: '16px' }}>{getTaskIcon(data.taskType)}</span>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '600',
          color: getTaskColor(data.taskType),
          textTransform: 'uppercase'
        }}>
          {data.taskType}
        </span>
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: '500',
        color: '#374151',
        lineHeight: '1.3'
      }}>
        {data.description}
      </div>
      {data.subtype && (
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          marginTop: '4px',
          fontStyle: 'italic'
        }}>
          {data.subtype}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const GatewayNode = ({ data }: { data: any }) => {
  return (
    <div style={{
      width: '80px',
      height: '80px',
      backgroundColor: '#fbbf24',
      border: '3px solid #f59e0b',
      borderRadius: '8px',
      transform: 'rotate(45deg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Top} style={{ transform: 'rotate(-45deg)' }} />
      <div style={{ 
        transform: 'rotate(-45deg)',
        fontWeight: 'bold',
        color: '#92400e',
        textAlign: 'center',
        fontSize: '12px',
        lineHeight: '1.2'
      }}>
        ?
      </div>
      <Handle type="source" position={Position.Bottom} style={{ transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Left} style={{ transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Right} style={{ transform: 'rotate(-45deg)' }} />
    </div>
  );
};

const StartNode = ({ data }: { data: any }) => {
  return (
    <div style={{
      width: '80px',
      height: '40px',
      backgroundColor: '#10b981',
      border: '3px solid #059669',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '600',
      fontSize: '14px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      🚀 Start
      <Handle type="source" position={Position.Bottom} />
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
    
    // Layout configuration
    const centerX = 300;
    const nodeSpacing = 120;
    const branchOffset = 250;
    let yPosition = 50;
    let nodeCounter = 0;

    // Add start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: centerX, y: yPosition },
      data: { label: 'Start' }
    });

    let previousNodeId = 'start';
    yPosition += nodeSpacing;

    // Track branch context
    let currentBranch: 'main' | 'if' | 'otherwise' = 'main';
    let gatewayNodeId: string | null = null;
    let ifBranchNodes: string[] = [];
    let otherwiseBranchNodes: string[] = [];
    let joinNodeId: string | null = null;

    workflowData.steps.forEach((step: any, index: number) => {
      const nodeId = `node-${++nodeCounter}`;
      let nodeType = 'task';
      let taskType = 'unknown';
      let description = '';
      let subtype = '';
      let xPosition = centerX;

      // Handle IF condition
      if (step.if) {
        nodeType = 'gateway';
        taskType = 'gateway';
        description = step.if;
        gatewayNodeId = nodeId;
        currentBranch = 'main';

        nodes.push({
          id: nodeId,
          type: nodeType,
          position: { x: centerX, y: yPosition },
          data: { 
            taskType,
            description: `If ${description}`,
            condition: step.if
          }
        });

        // Connect previous to gateway
        edges.push({
          id: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          animated: true
        });

        previousNodeId = nodeId;
        yPosition += nodeSpacing;
        currentBranch = 'if';
        return;
      }

      // Handle OTHERWISE condition
      if (step.otherwise) {
        currentBranch = 'otherwise';
        // Reset position to gateway level for otherwise branch
        if (gatewayNodeId) {
          const gatewayNode = nodes.find(n => n.id === gatewayNodeId);
          if (gatewayNode) {
            yPosition = gatewayNode.position.y + nodeSpacing;
          }
        }
        return;
      }

      // Handle regular task nodes
      const stepKeys = Object.keys(step);
      const mainKey = stepKeys.find(key => key !== 'branchContext') || stepKeys[0];
      
      if (mainKey) {
        taskType = mainKey;
        const taskData = step[mainKey];
        
        if (typeof taskData === 'object' && taskData.description) {
          description = taskData.description;
          subtype = taskData.subtype || taskData.type;
        } else if (typeof taskData === 'string') {
          description = taskData;
        } else if (typeof taskData === 'boolean') {
          description = `${mainKey}: ${taskData}`;
        } else {
          description = mainKey;
        }
      }

      // Position nodes based on current branch
      if (currentBranch === 'if') {
        xPosition = centerX - branchOffset;
        ifBranchNodes.push(nodeId);
      } else if (currentBranch === 'otherwise') {
        xPosition = centerX + branchOffset;
        otherwiseBranchNodes.push(nodeId);
      } else {
        xPosition = centerX;
      }

      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: xPosition, y: yPosition },
        data: { 
          taskType,
          description: description.length > 50 ? description.substring(0, 47) + '...' : description,
          subtype,
          fullDescription: description
        }
      });

      // Connect nodes
      if (currentBranch === 'if' && gatewayNodeId && ifBranchNodes.length === 1) {
        // First node in IF branch - connect from gateway
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          label: 'Yes',
          animated: true,
          style: { stroke: '#10b981' }
        });
      } else if (currentBranch === 'otherwise' && gatewayNodeId && otherwiseBranchNodes.length === 1) {
        // First node in OTHERWISE branch - connect from gateway
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          label: 'No',
          animated: true,
          style: { stroke: '#ef4444' }
        });
      } else if (previousNodeId && (currentBranch === 'main' || 
        (currentBranch === 'if' && ifBranchNodes.length > 1) ||
        (currentBranch === 'otherwise' && otherwiseBranchNodes.length > 1))) {
        // Connect within branch or main flow
        edges.push({
          id: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          animated: true
        });
      }

      previousNodeId = nodeId;
      yPosition += nodeSpacing;

      // Handle end of branches
      if (taskType === 'endEvent' || taskType === 'stop') {
        if (currentBranch === 'if') {
          // Create join node if we have both branches ending
          if (otherwiseBranchNodes.length > 0) {
            const lastOtherwiseNode = otherwiseBranchNodes[otherwiseBranchNodes.length - 1];
            const lastOtherwiseStep = nodes.find(n => n.id === lastOtherwiseNode);
            if (lastOtherwiseStep?.data.taskType === 'endEvent' || lastOtherwiseStep?.data.taskType === 'stop') {
              // Both branches end - we might want to add a join node here
              joinNodeId = `join-${nodeCounter}`;
            }
          }
        }
        
        // Reset to main flow after end events
        if (currentBranch !== 'main') {
          currentBranch = 'main';
          xPosition = centerX;
        }
      }
    });

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

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!workflowData || !workflowData.steps || workflowData.steps.length === 0) {
    return (
      <div style={{
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        border: '2px dashed #d1d5db',
        borderRadius: '8px',
        color: '#6b7280',
        fontSize: '16px'
      }}>
        📊 Create a workflow to see the visual graph
      </div>
    );
  }

  return (
    <div style={{ height: '600px', border: '2px solid #e5e7eb', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap 
          style={{
            height: 120,
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb'
          }}
          zoomable
          pannable
        />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};