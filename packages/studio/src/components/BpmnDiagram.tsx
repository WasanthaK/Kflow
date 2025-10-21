import React, { useEffect, useRef, useState } from 'react';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import './bpmn-theme.css';

type BpmnDiagramProps = {
  xml?: string | null;
  autoFit?: boolean;
  useAutoLayout?: boolean;
};

export const BpmnDiagram: React.FC<BpmnDiagramProps> = ({ xml, autoFit = true, useAutoLayout = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'empty'>(xml ? 'idle' : 'empty');
  const [message, setMessage] = useState<string>('');
  const [layoutApplied, setLayoutApplied] = useState(false);

  const applyElementStyling = async (modeler: any) => {
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const elements = elementRegistry.getAll();

      const palette: Record<string, { fill: string; stroke: string }> = {
        'bpmn:StartEvent': { fill: '#e0f7fa', stroke: '#00796b' },
        'bpmn:IntermediateCatchEvent': { fill: '#ede7f6', stroke: '#5e35b1' },
        'bpmn:BoundaryEvent': { fill: '#fff8e1', stroke: '#f57f17' },
        'bpmn:EndEvent': { fill: '#ffebee', stroke: '#c62828' },
        'bpmn:UserTask': { fill: '#e8f5e9', stroke: '#2e7d32' },
        'bpmn:ServiceTask': { fill: '#e3f2fd', stroke: '#1565c0' },
        'bpmn:SendTask': { fill: '#f3e5f5', stroke: '#6a1b9a' },
        'bpmn:ReceiveTask': { fill: '#f1f8e9', stroke: '#558b2f' },
        'bpmn:ParallelGateway': { fill: '#fff3e0', stroke: '#ef6c00' },
        'bpmn:ExclusiveGateway': { fill: '#f3f4f6', stroke: '#4b5563' },
        'bpmn:Lane': { fill: '#f8fafc', stroke: '#cbd5f5' },
      };

      elements.forEach((element: any) => {
        if (!element || !element.type) return;
        const key = element.type as keyof typeof palette;
        const colors = palette[key];
        if (!colors) return;
        try {
          modeling.setColor(element, colors);
        } catch (error) {
          console.warn('Failed to apply BPMN color', element.type, error);
        }
      });
    } catch (error) {
      console.warn('Unable to apply BPMN styling', error);
    }
  };

  const applyAutoLayout = async (xml: string): Promise<string> => {
    try {
      // Dynamic import of bpmn-auto-layout
      // @ts-ignore - bpmn-auto-layout doesn't have type definitions
      const autoLayoutModule = await import('bpmn-auto-layout');
      const autoLayout = autoLayoutModule.default || autoLayoutModule;
      console.log('Applying bpmn-auto-layout...');
      const layoutedXml = await autoLayout(xml);
      console.log('Auto-layout applied successfully');
      setLayoutApplied(true);
      return layoutedXml;
    } catch (error) {
      console.error('Auto-layout failed:', error);
      setLayoutApplied(false);
      return xml;
    }
  };

  const layoutConnections = (modeler: any) => {
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const connections = elementRegistry
        .getAll()
        .filter((element: any) =>
          element && typeof element.type === 'string' &&
          (element.type === 'bpmn:SequenceFlow' || element.type === 'bpmn:MessageFlow' || element.type === 'bpmn:Association')
        );
      
      console.log(`Laying out ${connections.length} connections...`);
      
      connections.forEach((connection: any) => {
        try {
          // First, try the built-in layout
          modeling.layoutConnection(connection);
          
          // Then, add manual waypoints to avoid overlaps if needed
          if (connection.waypoints && connection.waypoints.length > 2) {
            // Connection already has waypoints from auto-layout or manual placement
            return;
          }
          
          // For connections without waypoints, try to add some based on direction
          const source = connection.source;
          const target = connection.target;
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            
            // If the connection goes backwards or has complex routing needs, add waypoints
            if (dx < 0 || Math.abs(dy) > 200) {
              try {
                const midX = source.x + dx / 2;
                const midY = source.y + dy / 2;
                modeling.updateWaypoints(connection, [
                  { x: source.x + source.width, y: source.y + source.height / 2 },
                  { x: midX, y: source.y + source.height / 2 },
                  { x: midX, y: target.y + target.height / 2 },
                  { x: target.x, y: target.y + target.height / 2 }
                ]);
              } catch (e) {
                // Ignore waypoint update errors
              }
            }
          }
        } catch (error) {
          console.warn('Failed to layout BPMN connection', connection, error);
        }
      });
      
      console.log('Connection layout completed');
    } catch (error) {
      console.warn('Unable to layout BPMN connections', error);
    }
  };

  useEffect(() => {
    return () => {
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (!containerRef.current) {
        return;
      }

      if (!xml?.trim()) {
        setStatus('empty');
        setMessage('No BPMN diagram available yet. Generate a story to see the process.');
        if (modelerRef.current) {
          modelerRef.current.destroy();
          modelerRef.current = null;
        }
        return;
      }

      setStatus('loading');
      setMessage('Rendering BPMN diagram…');

      try {
        const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler');
        if (cancelled) {
          return;
        }

        // Apply auto-layout to improve readability
        let layoutedXml = xml;
        if (useAutoLayout) {
          try {
            layoutedXml = await applyAutoLayout(xml);
          } catch (error) {
            console.warn('Auto-layout failed, using original XML:', error);
          }
        }

        let modeler = modelerRef.current;
        if (!modeler) {
          modeler = new BpmnModeler({
            container: containerRef.current,
            height: '100%',
            width: '100%',
          });
          modelerRef.current = modeler;
        }

        await modeler.importXML(layoutedXml);
        if (cancelled) {
          return;
        }

        if (autoFit) {
          const canvas = modeler.get('canvas');
          if (canvas?.zoom) {
            canvas.zoom('fit-viewport', 'auto');
          }
        }

        await applyElementStyling(modeler);
        // Don't call layoutConnections - it overrides our carefully crafted waypoints from bpmn.ts
        // layoutConnections(modeler);

        setStatus('ready');
        setMessage('');
      } catch (error) {
        if (cancelled) {
          return;
        }
        const reason = error instanceof Error ? error.message : 'Unknown error rendering BPMN diagram.';
        setStatus('error');
        setMessage(reason);
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [xml, autoFit]);

  useEffect(() => {
    if (!autoFit) return;
    if (typeof ResizeObserver === 'undefined') return;
    const modeler = modelerRef.current;
    const container = containerRef.current;
    if (!modeler || !container) return;

    const canvas = modeler.get('canvas');
    if (!canvas?.zoom) return;

    const observer = new ResizeObserver(() => {
      try {
        canvas.zoom('fit-viewport', 'auto');
      } catch (error) {
        console.warn('Failed to auto-fit BPMN canvas on resize', error);
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [autoFit, xml]);

  const showOverlay = status !== 'ready';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#f8fafc' }}>
      <div ref={containerRef} className="bpmn-canvas" style={{ width: '100%', height: '100%' }} data-testid="bpmn-container" />
      {showOverlay && (
        <div
          role="status"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'rgba(248, 250, 252, 0.9)',
            color: status === 'error' ? '#dc2626' : '#64748b',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {status === 'loading' && 'Rendering BPMN diagram…'}
          {status === 'empty' && message}
          {status === 'error' && `Unable to render BPMN diagram: ${message}`}
        </div>
      )}
    </div>
  );
};

export default BpmnDiagram;
