import React, { useMemo, useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  updateEdge,
  Node,
  Edge,
  Handle,
  Position,
  ConnectionLineType,
  Connection,
  HandleType
} from 'reactflow';
import 'reactflow/dist/style.css';
import TopBar from './TopBar';



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
      send: '📤',
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
      {/* Standard BPMN handles - only 4 directional handles for clean workflow */}
      <Handle 
        type="target" 
        position={Position.Top}
        id="top"
        style={{
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#3b82f6',
          border: '2px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          cursor: 'crosshair',
          transition: 'all 0.2s ease'
        }}
      />
      
      <Handle 
        type="target" 
        position={Position.Left}
        id="left"
        style={{
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: '#3b82f6',
          border: '2px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          cursor: 'crosshair',
          transition: 'all 0.2s ease'
        }}
      />
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="bottom"
        style={{
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#10b981',
          border: '2px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          cursor: 'crosshair',
          transition: 'all 0.2s ease'
        }}
      />
      
      <Handle 
        type="source" 
        position={Position.Right}
        id="right"
        style={{
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: '#10b981',
          border: '2px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          cursor: 'crosshair',
          transition: 'all 0.2s ease'
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
    </div>
  );
};

const GatewayNode = ({ data, id }: { data: any, id: string }) => {
  const [isFlipped, setIsFlipped] = useState(data.isFlipped || false);
  
  // Handle double-click to flip gateway outputs
  const handleDoubleClick = useCallback(() => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    
    // Update the data and trigger re-render of edges
    if (data.onFlip) {
      data.onFlip(id, newFlipped);
    }
    
    console.log(`🔄 Gateway ${id} flipped: ${newFlipped ? 'Yes↔️No' : 'Yes↩️No'}`);
  }, [isFlipped, id, data]);
  
  // Determine gateway type and styling
  const getGatewayConfig = (gatewayType: string) => {
    const configs = {
      'exclusive': {
        symbol: '×',
        color: '#f59e0b',
        backgroundColor: '#fbbf24',
        description: 'Exclusive (XOR)',
        handles: ['top', 'left', 'right'] // Input + Yes/No branches
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
      <div 
        onDoubleClick={handleDoubleClick}
        style={{
          width: '60px',
          height: '60px',
          backgroundColor: config.backgroundColor,
          border: `3px solid ${config.color}`,
          borderRadius: '4px',
          transform: 'rotate(45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isFlipped ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 8px rgba(0,0,0,0.15)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'rotate(45deg) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'rotate(45deg) scale(1)';
          e.currentTarget.style.boxShadow = isFlipped ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 8px rgba(0,0,0,0.15)';
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
        
        {/* Flip indicator */}
        {isFlipped && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            transform: 'rotate(-45deg)',
            width: '16px',
            height: '16px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            ⟲
          </div>
        )}
      </div>
      
      {/* Gateway type label with flip indicator */}
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
        {config.description} {isFlipped ? '(Flipped)' : ''}
      </div>
      
      {/* Handle labels for Yes/No indication - positioned better */}
      {gatewayType === 'exclusive' && (
        <>
          <div style={{
            position: 'absolute',
            left: '-30px',
            top: '30px',
            fontSize: '10px',
            fontWeight: '700',
            color: isFlipped ? '#dc2626' : '#059669',
            backgroundColor: 'white',
            padding: '2px 4px',
            borderRadius: '3px',
            border: `1px solid ${isFlipped ? '#dc2626' : '#059669'}`,
            pointerEvents: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {isFlipped ? 'No' : 'Yes'}
          </div>
          <div style={{
            position: 'absolute',
            right: '-30px',
            top: '30px',
            fontSize: '10px',
            fontWeight: '700',
            color: isFlipped ? '#059669' : '#dc2626',
            backgroundColor: 'white',
            padding: '2px 4px',
            borderRadius: '3px',
            border: `1px solid ${isFlipped ? '#059669' : '#dc2626'}`,
            pointerEvents: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {isFlipped ? 'Yes' : 'No'}
          </div>
        </>
      )}
      
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
      
      {/* Input handle - TOP */}
      <Handle 
        type="target" 
        position={Position.Top}
        id="top"
        style={{
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#3b82f6',
          border: '2px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />

      {/* Left output handle */}
      <Handle 
        type="source" 
        position={Position.Left}
        id="left"
        style={{
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: isFlipped ? '#dc2626' : '#10b981',
          border: '2px solid white',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} 
      />

      {/* Right output handle */}
      <Handle 
        type="source" 
        position={Position.Right}
        id="right"
        style={{
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: isFlipped ? '#10b981' : '#dc2626',
          border: '2px solid white',
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
        id="bottom"
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
        id="right"
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
  // Gateway flip state management
  const [gatewayFlips, setGatewayFlips] = useState<Map<string, boolean>>(new Map());
  
  // Function to handle gateway flips
  const handleGatewayFlip = useCallback((gatewayId: string, isFlipped: boolean) => {
    setGatewayFlips(prev => {
      const newMap = new Map(prev);
      newMap.set(gatewayId, isFlipped);
      return newMap;
    });
  }, []);

  // State for AI engine selection and BPMN info
  const [selectedEngine, setSelectedEngine] = useState('Default AI');
  const aiEngines = ['Default AI', 'OpenAI', 'Anthropic', 'Google Gemini'];
  const [detectedActors, setDetectedActors] = useState<string[]>([]);
  const [bpmnInfo, setBpmnInfo] = useState<any>({});

  // Simple swim lane detection function
  const detectSwimLanes = useCallback((steps: any[]) => {
    const lanes: Map<string, { actor: string, nodes: string[], x: number }> = new Map();
    
    // Extract text for analysis
    const allText = steps.map(step => {
      const stepKeys = Object.keys(step);
      const mainKey = stepKeys.find(key => key !== 'branchContext') || stepKeys[0];
      if (mainKey && step[mainKey]) {
        const taskData = step[mainKey];
        return typeof taskData === 'string' ? taskData : 
               (typeof taskData === 'object' && taskData.description) ? taskData.description :
               JSON.stringify(taskData);
      }
      return '';
    }).join(' ');

    // Simple pattern-based detection
    const detectedLanes = new Set<string>();
    const text = allText.toLowerCase();
    
    if (text.includes('customer') || text.includes('user') || text.includes('client')) {
      detectedLanes.add('Customer');
    }
    if (text.includes('manager') || text.includes('supervisor') || text.includes('approval')) {
      detectedLanes.add('Manager');
    }
    if (text.includes('warehouse') || text.includes('inventory') || text.includes('shipping')) {
      detectedLanes.add('Warehouse');
    }
    if (text.includes('system') || text.includes('automatic') || text.includes('process')) {
      detectedLanes.add('System');
    }

    // Ensure we have at least basic lanes
    if (detectedLanes.size === 0) {
      detectedLanes.add('User');
      detectedLanes.add('System');
    }

    const laneArray = Array.from(detectedLanes);
    const swimLaneWidth = 300;
    
    laneArray.forEach((lane, index) => {
      lanes.set(lane, {
        actor: lane,
        nodes: [],
        x: (index + 0.5) * swimLaneWidth
      });
    });

    return lanes;
  }, []);

  // Detect swim lanes and update state
  const swimLanes = useMemo(() => {
    const lanes = detectSwimLanes(workflowData?.steps || []);
    setDetectedActors(Array.from(lanes.keys()));
    setBpmnInfo({ 
      lanes: Array.from(lanes.keys()),
      confidence: 0.85,
      modelStyle: 'role-centric'
    });
    return lanes;
  }, [workflowData?.steps, detectSwimLanes]);

  // PDF export handler (fallback to browser print)
  const handleExportPDF = async () => {
    try {
      // Try to use dynamic imports if available
      const loadPDFLibs = async () => {
        try {
          // Use eval to bypass TypeScript module checking
          const html2canvas = await eval('import("html2canvas")').then((m: any) => m.default);
          const jsPDF = await eval('import("jspdf")').then((m: any) => m.default);
          return { html2canvas, jsPDF };
        } catch {
          return null;
        }
      };

      const input = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!input) {
        console.warn('Could not find ReactFlow viewport for PDF export');
        alert('Could not find graph to export. Please try again.');
        return;
      }

      const libs = await loadPDFLibs();
      
      if (libs && libs.html2canvas && libs.jsPDF) {
        // Full PDF export if libraries are available
        const canvas = await libs.html2canvas(input, { 
          backgroundColor: '#fff', 
          scale: 2,
          useCORS: true 
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new libs.jsPDF({ 
          orientation: 'landscape', 
          unit: 'px', 
          format: [canvas.width, canvas.height] 
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`workflow-graph-${new Date().toISOString().split('T')[0]}.pdf`);
        
        console.log('✅ PDF exported successfully');
      } else {
        // Fallback: use browser's print functionality
        console.log('📄 Using browser print as PDF export fallback');
        window.print();
      }
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      // Final fallback: use browser's print functionality
      window.print();
    }
  };

  const { nodes: initialNodes, edges: initialEdges, crossingMarkers } = useMemo(() => {
    if (!workflowData || !workflowData.steps) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Enhanced layout system with proper swim lane columns
    const canvasWidth = 1600; // Total canvas width
    const swimLaneHeaderHeight = 80;
    const centerX = canvasWidth / 2; // Canvas center
    let swimLaneWidth = 300; // Base lane width, will be calculated dynamically
    let minNodeSpacing = 180;
    let branchOffset = 200;
    const nodeWidth = 240;
    const nodeHeight = 100;
    let yPosition = swimLaneHeaderHeight + 40; // Start below swim lane headers
    let nodeCounter = 0;

    // BPMN-Aware Swim Lane Detection with Master Prompt Analysis
    const detectSwimLanes = (steps: any[]) => {
      const lanes: Map<string, { actor: string, nodes: string[], x: number }> = new Map();
      
      // Prepare workflow data for BPMN analysis
      const workflowForAnalysis = {
        steps: steps,
        vars: workflowData.vars || {},
        metadata: {
          title: workflowData.title || 'Workflow Process',
          description: workflowData.description || ''
        }
      };
      
      // BPMN Master Prompt Analysis (simplified implementation)
      const analyzeBPMNPools = (workflow: any) => {
        // Extract text for analysis
        const allText = workflow.steps.map((step: any) => {
          const stepKeys = Object.keys(step);
          const mainKey = stepKeys.find(key => key !== 'branchContext') || stepKeys[0];
          if (mainKey && step[mainKey]) {
            const taskData = step[mainKey];
            return typeof taskData === 'string' ? taskData : 
                   (typeof taskData === 'object' && taskData.description) ? taskData.description :
                   JSON.stringify(taskData);
          }
          return '';
        }).join(' ');
        
        // BPMN Pool/Lane Discovery Heuristics
        const poolLanes = new Map<string, string[]>();
        
        // 1. Explicit actors in vars with "workflow actor"
        const explicitActors = new Set<string>();
        if (workflow.vars) {
          Object.entries(workflow.vars).forEach(([key, value]: [string, any]) => {
            if (typeof value === 'string' && value.toLowerCase().includes('workflow actor')) {
              explicitActors.add(key);
            }
          });
        }
        
        // 2. Named external systems/services detection
        const externalSystems = new Set<string>();
        const internalLanes = new Set<string>();
        
        const text = allText.toLowerCase();
        
        // External system patterns (black-box pools)
        const externalPatterns = [
          /\b(verification service|payment gateway|email service|sms service)\b/g,
          /\b(third[- ]party|external|vendor|api service)\b/g,
          /\b(stripe|paypal|twilio|sendgrid|aws|azure)\b/g
        ];
        
        externalPatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach((match: string) => externalSystems.add(
              match.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            ));
          }
        });
        
        // Internal lane patterns (within Company pool)
        const internalPatterns = [
          { pattern: /\b(customer|client|user|buyer)\b/g, lane: 'Customer' },
          { pattern: /\b(manager|supervisor|director|approval)\b/g, lane: 'Manager' },
          { pattern: /\b(warehouse|inventory|shipping|logistics|fulfillment)\b/g, lane: 'Warehouse' },
          { pattern: /\b(finance|accounting|billing|payment processing)\b/g, lane: 'Finance' },
          { pattern: /\b(support|helpdesk|customer service)\b/g, lane: 'Support' },
          { pattern: /\b(sales|marketing)\b/g, lane: 'Sales' },
          { pattern: /\b(system|server|automatic|calculate|process|generate)\b/g, lane: 'Internal System' }
        ];
        
        internalPatterns.forEach(({ pattern, lane }) => {
          if (text.match(pattern)) {
            internalLanes.add(lane);
          }
        });
        
        // Ensure we have at least basic lanes
        if (internalLanes.size === 0) {
          internalLanes.add('User');
          internalLanes.add('Internal System');
        } else {
          internalLanes.add('Internal System'); // Always include system
        }
        
        // Create Company pool with internal lanes
        const companyLanes = Array.from(internalLanes).slice(0, 6); // Max 6 lanes
        poolLanes.set('Company', companyLanes);
        
        // Add external systems as separate black-box pools
        externalSystems.forEach(system => {
          poolLanes.set(system, []); // Black-box pools have no lanes
        });
        
        return {
          pools: Array.from(poolLanes.keys()),
          lanes: poolLanes,
          confidence: internalLanes.size > 1 ? 0.85 : 0.65
        };
      };
      
      const bpmnAnalysis = analyzeBPMNPools(workflowForAnalysis);
      
      // Extract Company pool lanes for swim lane creation
      const companyLanes = bpmnAnalysis.lanes.get('Company') || ['User', 'Internal System'];
      
      // Create swim lanes with equal width distribution
      const totalLanes = companyLanes.length;
      swimLaneWidth = canvasWidth / totalLanes;
      
      // Arrange lanes: User types on left, System/automated in center/right
      const userLanes = companyLanes.filter(lane => 
        lane.toLowerCase().includes('user') || 
        lane.toLowerCase().includes('customer') ||
        lane.toLowerCase().includes('manager')
      );
      
      const systemLanes = companyLanes.filter(lane => 
        lane.toLowerCase().includes('system') || 
        lane.toLowerCase().includes('service')
      );
      
      const otherLanes = companyLanes.filter(lane => 
        !userLanes.includes(lane) && !systemLanes.includes(lane)
      );
      
      // Order: Users -> Others -> Systems
      const orderedLanes = [...userLanes, ...otherLanes, ...systemLanes];
      
      orderedLanes.forEach((lane, index) => {
        const laneX = (index + 0.5) * swimLaneWidth; // Center X coordinate
        lanes.set(lane, {
          actor: lane,
          nodes: [],
          x: laneX
        });
      });
      
      console.log('🎯 BPMN Analysis Result:', bpmnAnalysis);
      console.log('🏊 Created Swim Lanes:', Array.from(lanes.keys()));
      console.log('📐 Lane Width:', swimLaneWidth, 'Canvas Width:', canvasWidth);
      
      return lanes;
    };

    const swimLanes = detectSwimLanes(workflowData.steps);

    // Auto-flip gateway detection to minimize crossings (analyze node positions before edge creation)
    const detectAndAutoFlipGateways = (nodes: Node[]) => {
      const gatewayNodes = nodes.filter(n => n.type === 'gateway');
      
      gatewayNodes.forEach(gatewayNode => {
        const gatewayX = gatewayNode.position.x;
        
        // Find the next nodes that would be connected from this gateway
        // Look for nodes in 'if' and 'otherwise' branches that come after this gateway
        const gatewayIndex = nodes.findIndex(n => n.id === gatewayNode.id);
        
        if (gatewayIndex !== -1) {
          // Look ahead for potential branch targets
          let ifTargetNode = null;
          let otherwiseTargetNode = null;
          
          // Simple heuristic: nodes to the left should be 'if', nodes to the right should be 'otherwise'
          // But we want to flip if this would cause crossings
          
          for (let i = gatewayIndex + 1; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.position.y > gatewayNode.position.y) {
              if (node.position.x < gatewayX && !ifTargetNode) {
                ifTargetNode = node; // Left side - potential 'if' target
              } else if (node.position.x > gatewayX && !otherwiseTargetNode) {
                otherwiseTargetNode = node; // Right side - potential 'otherwise' target
              }
            }
          }
          
          // Check if we should flip based on positioning
          if (ifTargetNode && otherwiseTargetNode) {
            const ifX = ifTargetNode.position.x;
            const otherwiseX = otherwiseTargetNode.position.x;
            
            // If 'if' branch (Yes) would go to the right and 'otherwise' (No) to the left,
            // this creates a crossing. We should flip to avoid this.
            const shouldFlip = ifX > gatewayX && otherwiseX < gatewayX;
            
            if (shouldFlip) {
              console.log(`🤖 Auto-flipping gateway ${gatewayNode.id} to minimize crossings`);
              gatewayFlips.set(gatewayNode.id, true);
            }
          }
        }
      });
    };

    // AI-Assisted Graph Organization
    const optimizeLayout = (steps: any[]) => {
      // Analyze workflow complexity and suggest optimal layout
      const complexity = {
        totalSteps: steps.length,
        branchingFactors: steps.filter(s => s.if).length,
        actors: swimLanes.size,
        maxDepth: calculateMaxBranchDepth(steps)
      };
      
      // AI-like optimization decisions
      const layoutStrategy = {
        useCompactLayout: complexity.totalSteps > 15,
        preferHorizontal: complexity.actors > 3,
        groupByActor: complexity.actors > 1,
        minimizeCrossings: complexity.branchingFactors > 2,
        useAdvancedSpacing: complexity.maxDepth > 2
      };
      
      return layoutStrategy;
    };
    
    const calculateMaxBranchDepth = (steps: any[], depth = 0): number => {
      let maxDepth = depth;
      for (const step of steps) {
        if (step.if) {
          maxDepth = Math.max(maxDepth, depth + 1);
        }
      }
      return maxDepth;
    };
    
    const layoutStrategy = optimizeLayout(workflowData.steps);
    
    // Adjust spacing based on AI recommendations
    if (layoutStrategy.useCompactLayout) {
      minNodeSpacing = Math.max(120, minNodeSpacing * 0.8);
    }
    if (layoutStrategy.useAdvancedSpacing) {
      branchOffset = Math.min(swimLaneWidth * 0.8, branchOffset);
    }
    
    // Add simple swim lane headers only (keep backgrounds in CSS)
    swimLanes.forEach((lane, actor) => {
      const actorColor = actor.toLowerCase().includes('user') || actor.toLowerCase().includes('customer') || actor.toLowerCase().includes('manager') ? 
        '#3b82f6' :
        actor.toLowerCase().includes('system') || actor.toLowerCase().includes('server') ? 
          '#10b981' :
          '#8b5cf6';

      // Add swim lane header only - no background nodes to avoid conflicts
      nodes.push({
        id: `header-${actor}`,
        data: { 
          label: actor.toUpperCase(),
          actor: actor
        },
        position: { x: lane.x - swimLaneWidth/2, y: 10 },
        style: {
          background: actorColor,
          color: 'white',
          border: `3px solid ${actorColor}dd`,
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          fontWeight: '800',
          padding: '12px 8px',
          textAlign: 'center',
          width: `${swimLaneWidth}px`,
          height: `${swimLaneHeaderHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '1px',
          zIndex: 100
        },
        draggable: false,
        selectable: false,
        deletable: false
      });
    });
    
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

    // Function to determine swim lane for a node
    const determineSwimLane = (step: any, taskType: string, description: string) => {
      const desc = description.toLowerCase();
      const availableLanes = Array.from(swimLanes.keys());
      
      // Force gateways and decision nodes to System lane
      if (taskType === 'gateway' || step.if || 
          desc.includes('decision') || desc.includes('gateway') || 
          desc.includes('condition') || taskType.includes('if')) {
        return availableLanes.find(lane => lane.toLowerCase().includes('system')) || 'System';
      }
      
      // Smart actor matching against detected swim lanes
      const findBestMatch = (text: string): string => {
        const patterns = [
          // Exact matches first
          { pattern: /\b(customer|client|user)\b/g, targets: ['Customer'] },
          { pattern: /\b(manager|supervisor|director)\b/g, targets: ['Manager', 'Senior Staff'] },
          { pattern: /\b(agent|representative|staff)\b/g, targets: ['Agent'] },
          { pattern: /\b(specialist|expert|technician)\b/g, targets: ['Specialist'] },
          { pattern: /\b(senior|lead)\b/g, targets: ['Senior Staff', 'Manager'] },
          { pattern: /\b(hr|human\s+resources)\b/g, targets: ['HR'] },
          { pattern: /\b(finance|accounting|billing)\b/g, targets: ['Finance'] },
          { pattern: /\b(legal|compliance)\b/g, targets: ['Legal'] },
          { pattern: /\b(it|technical|support)\b/g, targets: ['IT', 'Specialist'] },
          { pattern: /\b(sales|marketing)\b/g, targets: ['Sales'] },
          
          // Ask/request patterns - extract who is being asked
          { pattern: /ask\s+([\w\s]+?)\s+(?:to|for)/g, extract: true },
          { pattern: /request\s+([\w\s]+?)\s+(?:to|for)/g, extract: true },
          { pattern: /notify\s+([\w\s]+)/g, extract: true },
        ];
        
        for (const { pattern, targets, extract } of patterns) {
          if (extract) {
            // Extract the specific role/person being asked
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
              if (match[1]) {
                const extracted = match[1].trim();
                // Try to match extracted role against available lanes
                for (const lane of availableLanes) {
                  if (lane.toLowerCase().includes(extracted.toLowerCase()) || 
                      extracted.toLowerCase().includes(lane.toLowerCase())) {
                    return lane;
                  }
                }
                // Smart matching for common variations
                if (extracted.includes('senior') || extracted.includes('manager')) {
                  const managerLanes = availableLanes.filter(l => 
                    l.toLowerCase().includes('manager') || l.toLowerCase().includes('senior'));
                  if (managerLanes.length > 0) return managerLanes[0];
                }
                if (extracted.includes('agent')) {
                  const agentLanes = availableLanes.filter(l => 
                    l.toLowerCase().includes('agent'));
                  if (agentLanes.length > 0) return agentLanes[0];
                }
              }
            }
          } else if (targets) {
            // Fixed pattern matching
            if (pattern.test(text)) {
              for (const target of targets) {
                if (availableLanes.includes(target)) {
                  return target;
                }
              }
            }
          }
        }
        
        // System actions detection
        if (text.includes('calculate') || text.includes('process') || 
            text.includes('generate') || text.includes('create') || 
            text.includes('update') || text.includes('system')) {
          return availableLanes.find(lane => lane.toLowerCase().includes('system')) || 'System';
        }
        
        // Default to first available lane (usually System)
        return availableLanes[0] || 'System';
      };
      
      return findBestMatch(desc);
    };

    // Process each step with improved branching logic and swim lanes
    console.log('🔄 Processing workflow steps:', workflowData.steps.length);
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
          const sourceHandle = 'bottom';
          const edgeToGateway = {
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
          };
          console.log('🔗 Creating edge to gateway:', edgeToGateway);
          edges.push(edgeToGateway);
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

      // Determine swim lane position for better organization
      const swimLane = determineSwimLane(step, taskType, description);
      const swimLaneInfo = swimLanes.get(swimLane);
      const swimLaneX = swimLaneInfo ? swimLaneInfo.x : centerX;
      
      // Center all nodes to the middle X coordinate of their swim lane
      // Remove branch offset - all nodes should be centered in their lane
      const nodeX = swimLaneX;

      // Create the node at current yPosition
      const nodeData: any = { 
        taskType,
        description: description.length > 60 ? description.substring(0, 57) + '...' : description,
        subtype,
        fullDescription: description
      };
      
      // Add flip handler for gateways
      if (nodeType === 'gateway') {
        nodeData.onFlip = handleGatewayFlip;
        nodeData.isFlipped = gatewayFlips.get(nodeId) || false;
      }
      
      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: nodeX, y: yPosition },
        data: nodeData
      });

      // Add to branch tracking
      if (currentBranch === 'if' || currentBranch === 'otherwise') {
        addNodeToBranch(nodeId, yPosition, currentBranch);
      }

      // Connect nodes with enhanced handle-specific logic and flip support
      if (currentBranch === 'if' && gatewayNodeId && yPosition === branchStartY) {
        // Check if gateway is flipped
        const isGatewayFlipped = gatewayFlips.get(gatewayNodeId) || false;
        
        // IF branch = YES/TRUE = ALWAYS GREEN (left handle normally, right when flipped)
        const sourceHandle = isGatewayFlipped ? 'right' : 'left';
        
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          sourceHandle: sourceHandle,
          targetHandle: 'top',
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
        // Check if gateway is flipped
        const isGatewayFlipped = gatewayFlips.get(gatewayNodeId) || false;
        
        // OTHERWISE branch = NO/FALSE = ALWAYS RED (right handle normally, left when flipped)
        const sourceHandle = isGatewayFlipped ? 'left' : 'right';
        
        edges.push({
          id: `edge-${gatewayNodeId}-${nodeId}`,
          source: gatewayNodeId,
          target: nodeId,
          sourceHandle: sourceHandle,
          targetHandle: 'top',
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
        const sourceHandle = 'bottom';
        const targetHandle = 'top';
        
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
    
    // Auto-detect and flip gateways to minimize crossings (BEFORE edge creation)
    // Temporarily disabled for testing: detectAndAutoFlipGateways(nodes);
    
    // Apply branch balancing and post-processing
    balanceBranchHeights();
    postProcessLayout();
    
    // Detect crossing edges with more precise logic
    const detectCrossings = (edges: Edge[], nodes: Node[]) => {
      const crossingMarkers: any[] = [];
      
      // Only check for crossings between edges that could realistically cross
      // Focus on horizontal-vertical intersections (common in workflow layouts)
      for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
          const edge1 = edges[i];
          const edge2 = edges[j];
          
          // Skip if edges share a node (they're connected, not crossing)
          if (edge1.source === edge2.source || edge1.source === edge2.target ||
              edge1.target === edge2.source || edge1.target === edge2.target) {
            continue;
          }
          
          const source1 = nodes.find(n => n.id === edge1.source);
          const target1 = nodes.find(n => n.id === edge1.target);
          const source2 = nodes.find(n => n.id === edge2.source);
          const target2 = nodes.find(n => n.id === edge2.target);
          
          if (source1 && target1 && source2 && target2) {
            // Get node center points (accounting for node size)
            const nodeSize = 60; // Approximate node width/height
            const s1 = { x: source1.position.x + nodeSize/2, y: source1.position.y + nodeSize/2 };
            const t1 = { x: target1.position.x + nodeSize/2, y: target1.position.y + nodeSize/2 };
            const s2 = { x: source2.position.x + nodeSize/2, y: source2.position.y + nodeSize/2 };
            const t2 = { x: target2.position.x + nodeSize/2, y: target2.position.y + nodeSize/2 };
            
            // Check if lines have different orientations (more likely to cross)
            const edge1IsHorizontal = Math.abs(t1.x - s1.x) > Math.abs(t1.y - s1.y);
            const edge2IsHorizontal = Math.abs(t2.x - s2.x) > Math.abs(t2.y - s2.y);
            
            // Only check crossings between horizontal and vertical lines (reduces false positives)
            if (edge1IsHorizontal !== edge2IsHorizontal) {
              const intersection = getLineIntersection(s1, t1, s2, t2);
              
              if (intersection) {
                // Additional check: make sure intersection is not too close to nodes
                const minDistFromNode = 30;
                const distances = [
                  Math.sqrt((intersection.x - s1.x)**2 + (intersection.y - s1.y)**2),
                  Math.sqrt((intersection.x - t1.x)**2 + (intersection.y - t1.y)**2),
                  Math.sqrt((intersection.x - s2.x)**2 + (intersection.y - s2.y)**2),
                  Math.sqrt((intersection.x - t2.x)**2 + (intersection.y - t2.y)**2)
                ];
                
                if (distances.every(d => d > minDistFromNode)) {
                  crossingMarkers.push({
                    id: `jump-${i}-${j}`,
                    x: intersection.x,
                    y: intersection.y,
                    edges: [edge1.id, edge2.id],
                    edge1IsHorizontal
                  });
                  
                  console.log(`🔀 Line jump needed: ${edge1.source}→${edge1.target} × ${edge2.source}→${edge2.target}`);
                }
              }
            }
          }
        }
      }
      
      return crossingMarkers;
    };
    
    // Line intersection calculation
    const getLineIntersection = (p1: {x: number, y: number}, p2: {x: number, y: number}, 
                                 p3: {x: number, y: number}, p4: {x: number, y: number}) => {
      const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
      
      if (Math.abs(denom) < 0.01) return null; // Lines are parallel
      
      const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
      const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;
      
      // Check if intersection is within both line segments
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y)
        };
      }
      
      return null;
    };
    
    // Detect crossings and create markers
    const crossingMarkers = detectCrossings(edges, nodes);

    // Add implicit connections for better flow visualization
    nodes.forEach((node, index) => {
      if (node.data.taskType === 'endEvent' || node.data.taskType === 'stop') {
        // Make sure end nodes are clearly marked
        node.data.description = node.data.description || 'End';
      }
    });

    console.log('🔗 Final edges created:', edges.length, edges);
    console.log('📍 Final nodes created:', nodes.length, nodes.map(n => n.id));
    return { nodes, edges, crossingMarkers };
  }, [workflowData, gatewayFlips, handleGatewayFlip]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when workflowData changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) => {
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'smoothstep',
        deletable: true,
        reconnectable: true,
        style: { stroke: '#6b7280', strokeWidth: 2 }
      };
      console.log('🔗 Manual connection created:', newEdge);
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    console.log('🗑️ Deleting edges:', edgesToDelete.map(e => e.id));
    setEdges((eds) => eds.filter(edge => !edgesToDelete.some(del => del.id === edge.id)));
  }, [setEdges]);

  // Handle edge updates (moving connections) - proper reconnection logic
  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    console.log('🔄 Reconnecting edge:', oldEdge.id, 'from', oldEdge.source + ':' + oldEdge.sourceHandle, 
                'to', newConnection.source + ':' + newConnection.sourceHandle, 
                '→', newConnection.target + ':' + newConnection.targetHandle);
    setEdges((eds) => updateEdge(oldEdge, newConnection, eds));
  }, [setEdges]);

  // Handle zoom with better swim lane alignment
  const onViewportChange = useCallback((viewport: any) => {
    // Log zoom changes for debugging
    console.log(`🔍 Zoom: ${viewport.zoom.toFixed(2)}, Position: (${viewport.x.toFixed(0)}, ${viewport.y.toFixed(0)})`);
  }, []);

  // Handle keyboard events for deletion
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedEdges = edges.filter(edge => edge.selected);
      const selectedNodes = nodes.filter(node => node.selected);
      
      if (selectedEdges.length > 0) {
        console.log('⌨️ Deleting selected edges with keyboard:', selectedEdges.map(e => e.id));
        onEdgesDelete(selectedEdges);
      }
      
      if (selectedNodes.length > 0) {
        console.log('⌨️ Deleting selected nodes with keyboard:', selectedNodes.map(n => n.id));
        setNodes((nds) => nds.filter(node => !selectedNodes.some(sel => sel.id === node.id)));
        // Also delete edges connected to deleted nodes
        setEdges((eds) => eds.filter(edge => 
          !selectedNodes.some(node => edge.source === node.id || edge.target === node.id)
        ));
      }
    }
  }, [edges, nodes, onEdgesDelete, setNodes, setEdges]);

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
    <div style={{ height: '100%', minHeight: '500px', width: '100%', position: 'relative', backgroundColor: '#fafafa' }}>
      <TopBar
        detectedActors={detectedActors}
        bpmnInfo={bpmnInfo}
        aiEngines={aiEngines}
        selectedEngine={selectedEngine}
        onEngineChange={setSelectedEngine}
        onExportPDF={handleExportPDF}
      />
      {/* ...existing ReactFlow and overlays, but REMOVE the old AI-Detected Actors info panel... */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onEdgeUpdate={onEdgeUpdate}
        onKeyDown={onKeyDown}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ 
          stroke: '#3b82f6', 
          strokeWidth: 4,
          strokeDasharray: '8,4',
          animation: 'edge-dash 0.8s linear infinite'
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6b7280', strokeWidth: 2 },
          deletable: true,
          reconnectable: true
        }}
        snapToGrid={true}
        snapGrid={[15, 15]}
        connectionMode={'loose' as any}
        fitView
        fitViewOptions={{
          padding: 0.05,
          includeHiddenNodes: false,
          minZoom: 0.4,
          maxZoom: 1.5
        }}
        attributionPosition="bottom-left"
        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
        minZoom={0.1}
        maxZoom={2.0}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        onMove={onViewportChange}
        onConnectStart={(_, { nodeId, handleId, handleType }) => {
          console.log(`🔗 Starting connection from ${nodeId}:${handleId} (${handleType})`);
        }}
        onConnectEnd={(event) => {
          console.log('🔗 Connection ended');
        }}
      >
        <Controls 
          position="top-right"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          fitViewOptions={{
            padding: 0.05,
            includeHiddenNodes: false,
            minZoom: 0.4,
            maxZoom: 1.5
          }}
        />
        <MiniMap 
          style={{
            height: 100,
            width: 160,
            backgroundColor: '#f9fafb',
            border: '2px solid #e5e7eb',
            borderRadius: '6px'
          }}
          zoomable
          pannable
          position="bottom-right"
          maskColor="rgba(0, 0, 0, 0.1)"
          nodeColor="#3b82f6"
          nodeStrokeColor="#1e40af"
          nodeStrokeWidth={1}
        />
        <Background gap={20} size={2} color="#e5e7eb" />
        {/* Line Jump SVG Overlay for Crossings */}
        {crossingMarkers && crossingMarkers.length > 0 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1002
            }}
          >
            {crossingMarkers.map((marker: any) => {
              const jumpSize = 6; // Size of the jump arc
              const x = marker.x;
              const y = marker.y;
              
              // Determine which line should "jump over" the other
              // Typically, the horizontal line jumps over the vertical line
              const isHorizontalJump = marker.edge1IsHorizontal;
              
              if (isHorizontalJump) {
                // Horizontal line jumps over vertical line
                return (
                  <g key={marker.id}>
                    {/* Jump arc going up and over */}
                    <path
                      d={`M ${x - jumpSize} ${y} Q ${x} ${y - jumpSize} ${x + jumpSize} ${y}`}
                      stroke="#6b7280"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                    {/* Small white background to "erase" the underlying line */}
                    <path
                      d={`M ${x - jumpSize} ${y} Q ${x} ${y - jumpSize} ${x + jumpSize} ${y}`}
                      stroke="white"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.9"
                      style={{ zIndex: -1 }}
                    />
                  </g>
                );
              } else {
                // Vertical line jumps over horizontal line  
                return (
                  <g key={marker.id}>
                    {/* Jump arc going left and over */}
                    <path
                      d={`M ${x} ${y - jumpSize} Q ${x + jumpSize} ${y} ${x} ${y + jumpSize}`}
                      stroke="#6b7280"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                    {/* Small white background to "erase" the underlying line */}
                    <path
                      d={`M ${x} ${y - jumpSize} Q ${x + jumpSize} ${y} ${x} ${y + jumpSize}`}
                      stroke="white"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.9"
                      style={{ zIndex: -1 }}
                    />
                  </g>
                );
              }
            })}
          </svg>
        )}
      </ReactFlow>
    </div>
  );
};