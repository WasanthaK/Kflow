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
    
    // Enhanced layout configuration
    const centerX = 400;
    const nodeSpacing = 100;
    const branchOffset = 300;
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
      let xPosition = centerX;

      // Handle IF condition (Gateway)
      if (step.if) {
        nodeType = 'gateway';
        taskType = 'gateway';
        description = step.if;
        gatewayNodeId = nodeId;

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
        if (previousNodeId) {
          edges.push({
            id: `edge-${previousNodeId}-${nodeId}`,
            source: previousNodeId,
            target: nodeId,
            animated: true
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
        yPosition += nodeSpacing;
        currentBranch = 'if';
        branchStartY = yPosition;
        return;
      }

      // Handle OTHERWISE condition
      if (step.otherwise) {
        // Switch to otherwise branch
        currentBranch = 'otherwise';
        // Reset to gateway level for otherwise branch
        if (branchStack.length > 0) {
          const currentGateway = branchStack[branchStack.length - 1];
          yPosition = currentGateway.returnY + nodeSpacing;
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

      // Position nodes based on current branch
      if (currentBranch === 'if') {
        xPosition = centerX - branchOffset;
      } else if (currentBranch === 'otherwise') {
        xPosition = centerX + branchOffset;
      } else {
        xPosition = centerX;
      }

      // Create the node
      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: xPosition, y: yPosition },
        data: { 
          taskType,
          description: description.length > 60 ? description.substring(0, 57) + '...' : description,
          subtype,
          fullDescription: description
        }
      });

      // Connect nodes with improved logic
      if (currentBranch === 'if' && gatewayNodeId && yPosition === branchStartY) {
        // First node in IF branch - connect from gateway
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          label: 'Yes',
          animated: true,
          style: { stroke: '#10b981' }
        });
      } else if (currentBranch === 'otherwise' && gatewayNodeId && yPosition === branchStartY) {
        // First node in OTHERWISE branch - connect from gateway
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          label: 'No',
          animated: true,
          style: { stroke: '#ef4444' }
        });
      } else if (previousNodeId && 
                 (currentBranch === 'main' || 
                  (currentBranch === 'if' && yPosition > branchStartY) ||
                  (currentBranch === 'otherwise' && yPosition > branchStartY))) {
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

      // Handle end events - reset branch context
      if (taskType === 'endEvent' || taskType === 'stop') {
        if (currentBranch !== 'main') {
          // Pop the branch context
          if (branchStack.length > 0) {
            branchStack.pop();
          }
          currentBranch = 'main';
          xPosition = centerX;
          // Continue after the gateway
          yPosition = Math.max(yPosition, branchStartY + nodeSpacing * 3);
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
    <div style={{ height: '100%', minHeight: '500px', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 2
        }}
        attributionPosition="bottom-left"
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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